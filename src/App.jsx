import React, { useState, useEffect, lazy, Suspense } from 'react';
import { renderAvatarSVG } from './components/mockData';
import { auth, db, getMessagingInstance } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, onSnapshot, addDoc, orderBy, query } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { Home as HomeIcon, MessageSquare, Phone, BookOpen, User, Wallet, Bell, Users, CheckSquare, Gift, LogOut, Search, Plus, Flag, Sparkles, Heart, Trophy, Video } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Analytics } from './analytics';

// Lazy-load heavy components for code splitting (reduces initial bundle)
const AvatarCreator    = lazy(() => import('./components/avatarCreator'));
const VoiceRoom        = lazy(() => import('./components/voiceRoom'));
const Games            = lazy(() => import('./components/games'));
const Matchmaker       = lazy(() => import('./components/matchmaker'));
const LoveSkool        = lazy(() => import('./components/loveSkool'));
const Login            = lazy(() => import('./components/login'));
const Friends          = lazy(() => import('./components/friends'));
const DirectMessages   = lazy(() => import('./components/directMessages'));
const Leaderboard      = lazy(() => import('./components/leaderboard'));
const VideoCall        = lazy(() => import('./components/videoCall'));

// Loading fallback spinner
const Spinner = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
    <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,46,147,0.2)', borderTopColor: '#ff2e93', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
  </div>
);

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  // tabs: 'home' | 'rooms' | 'matchmaker' | 'messages' | 'leaderboard' | 'friends' | 'profile'
  const [activeTab, setActiveTab] = useState('home');
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  // Video call state
  const [activeVideoCall, setActiveVideoCall] = useState(null);
  // DM deep-link: when user taps Message in Friends tab, open that thread directly
  const [pendingDMThread, setPendingDMThread] = useState(null);
  
  // Real Firestore synced states
  const [coins, setCoins] = useState(100);
  const [lastClaimedDate, setLastClaimedDate] = useState(null); // YYYY-MM-DD string
  const [walletOpen, setWalletOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [notification, setNotification] = useState('🎁 Claim 100 free login coins in your Wallet!');
  
  // Custom Free Tasks to solve high paywall drawback
  const [tasks, setTasks] = useState([
    { id: 'task-daily', title: 'Daily Check-in Reward', reward: 50, desc: 'Claim your daily free bonus', claimed: false },
    { id: 'task-listen', title: 'Listen in Voice Rooms', reward: 100, desc: 'Join any room and support host', claimed: false },
    { id: 'task-match', title: 'Start a Matchmaker call', reward: 150, desc: 'Connect direct anonymous call', claimed: false },
  ]);

  // User profile details persistently saved in Firestore
  const [userProfile, setUserProfile] = useState({
    name: 'Lovely_Aura',
    age: 22,
    lang: 'Hindi, English',
    bio: 'Happy to chat and make friends! ✨',
    skin: '#ffd1b3',
    hair: '#ff2e93',
    accessory: 'ears',
    outfit: '#8b3cff'
  });

  // Active navigation states
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeGamePartner, setActiveGamePartner] = useState(null);

  // Rooms: search, filter, create — backed by Firestore
  const [roomSearch, setRoomSearch]       = useState('');
  const [roomCategory, setRoomCategory]   = useState('All');
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle]   = useState('');
  const [newRoomTag, setNewRoomTag]       = useState('Matchmaking');
  const [firestoreRooms, setFirestoreRooms] = useState([]);
  const [localRooms, setLocalRooms] = useState([]);
  const allRooms = [...localRooms, ...firestoreRooms];
  // Block system
  const [blockedUsers, setBlockedUsers] = useState([]);
  const handleBlockUser = (name) => {
    setBlockedUsers(prev => [...prev, name]);
    setNotification(`🚫 ${name} has been blocked.`);
    setTimeout(() => setNotification(''), 3000);
  };

  // 1. Production Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setIsLoggedIn(true);
        await syncUserProfile(firebaseUser);
        Analytics.loginSuccess(firebaseUser.phoneNumber ? 'phone' : 'anonymous');
        // Show notification prompt after 3 seconds
        setTimeout(() => setShowNotifPrompt(true), 3000);
        // Register FCM token in background
        registerFcmToken(firebaseUser.uid);
      } else {
        setIsLoggedIn(false);
        setLoadingSession(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Live Firestore rooms listener
  useEffect(() => {
    const q = query(collection(db, 'frnd_rooms'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const rooms = [];
      snap.forEach(d => rooms.push({ id: d.id, ...d.data() }));
      setFirestoreRooms(rooms);
    }, () => {}); // silently ignore permission errors before auth
    return () => unsub();
  }, []);

  // 3. Register FCM push notification token
  const registerFcmToken = async (uid) => {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return;
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) return; // skip if not configured
      const token = await getToken(messaging, { vapidKey });
      if (token) {
        await updateDoc(doc(db, 'users', uid), { fcmToken: token }).catch(() => {});
      }
    } catch (e) {
      // FCM silently fails (e.g. permission denied or unsupported browser)
    }
  };

  // 4. Handle notification permission grant
  const handleEnableNotifications = async () => {
    setShowNotifPrompt(false);
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentUser = auth.currentUser;
      if (currentUser) registerFcmToken(currentUser.uid);
      Analytics.notificationEnabled();
      setNotification('🔔 Notifications enabled! You\'ll get alerts when friends go live.');
      setTimeout(() => setNotification(''), 4000);
    }
  };

  // 2. Fetch or initialize User Firestore Document
  const syncUserProfile = async (firebaseUser) => {
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        // Load existing user details
        const data = docSnap.data();
        setUserProfile(data.profile || userProfile);
        setCoins(data.coins ?? 100);
        setLastClaimedDate(data.lastClaimedDate || null);
        if (data.tasks) {
          setTasks(data.tasks);
        }
      } else {
        // Initialize new user document in cloud
        const initialPayload = {
          uid: firebaseUser.uid,
          phone: firebaseUser.phoneNumber || 'Guest_User',
          coins: 100,
          profile: {
            ...userProfile,
            name: firebaseUser.phoneNumber ? `Aura_${firebaseUser.phoneNumber.substring(7)}` : 'Lovely_Aura'
          },
          tasks: tasks,
          createdAt: Date.now()
        };
        await setDoc(userDocRef, initialPayload);
        setUserProfile(initialPayload.profile);
        setCoins(100);
      }
    } catch (e) {
      console.warn("Could not sync Firestore user profiles:", e);
    } finally {
      setLoadingSession(false);
    }
  };

  // Sync profile edits to cloud
  const handleSaveProfile = async (newProfile) => {
    setUserProfile(newProfile);
    setNotification('✅ Profile saved successfully!');
    setTimeout(() => setNotification(''), 3000);

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, { profile: newProfile });
      } catch (err) {
        console.warn("Could not save profile to Firestore:", err);
      }
    }
  };

  // Claim coins from Wallet — enforces 24-hour cooldown
  const handleClaimDailyReward = async () => {
    const todayStr = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
    if (lastClaimedDate === todayStr) {
      setNotification('⏰ Already claimed today! Come back tomorrow for more coins.');
      setWalletOpen(false);
      setTimeout(() => setNotification(''), 3500);
      return;
    }

    const nextCoins = coins + 100;
    setCoins(nextCoins);
    setLastClaimedDate(todayStr);
    setWalletOpen(false);
    setNotification('🎉 Claimed 100 Daily Check-in Coins!');
    Analytics.dailyRewardClaimed(nextCoins);
    
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          coins: nextCoins,
          lastClaimedDate: todayStr,
        });
      } catch (err) {}
    }
  };

  // Claim coins from Task Center and sync to Firestore
  const handleClaimTask = async (taskId, reward) => {
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, claimed: true } : t);
    setTasks(updatedTasks);
    const nextCoins = coins + reward;
    setCoins(nextCoins);
    setNotification(`🎉 Earned ${reward} coins completely free!`);
    Analytics.taskClaimed(taskId, reward);
    
    confetti({
      particleCount: 60,
      spread: 50,
      origin: { y: 0.7 }
    });

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await updateDoc(doc(db, "users", currentUser.uid), { 
          coins: nextCoins,
          tasks: updatedTasks
        });
      } catch (err) {}
    }
  };

  // Leave / cleanup room — deletes from Firestore if current user is the host
  const handleLeaveRoom = async (room) => {
    const currentUser = auth.currentUser;
    if (currentUser && room && room.hostUid === currentUser.uid) {
      try {
        await deleteDoc(doc(db, 'frnd_rooms', room.id));
      } catch (err) {
        console.warn('Could not delete room on leave:', err);
      }
    }
    setActiveRoom(null);
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setNotification('👋 Logged out successfully!');
      setActiveTab('home');
      setActiveRoom(null);
      setActiveGamePartner(null);
    } catch (e) {
      console.warn("Logout error:", e);
    }
  };

  // Live notification tickers
  useEffect(() => {
    if (!isLoggedIn) return;
    
    const notifyTimeout = setTimeout(() => {
      setNotification('🔊 Host RJ Neha just went live in Love Room 1!');
    }, 15000);

    const matchTimeout = setTimeout(() => {
      setNotification('⚡ Instant voice matching is highly active right now!');
    }, 30000);

    return () => {
      clearTimeout(notifyTimeout);
      clearTimeout(matchTimeout);
    };
  }, [isLoggedIn]);

  // Launch a game inside the active voice room
  const handleLaunchGame = () => {
    if (!activeRoom) return;
    setActiveGamePartner(activeRoom.host);
  };

  // Loading Splash
  if (loadingSession) {
    return (
      <div className="app-container">
        <main className="app-content" style={{ display: 'flex', flexDirection: 'column', justify: 'center', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s infinite linear' }} />
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Resuming secure session...</div>
        </main>
      </div>
    );
  }

  // Render Login Splash if not logged in
  if (!isLoggedIn) {
    return (
      <div className="app-container">
        <main className="app-content" style={{ display: 'flex', flexDirection: 'column', justify: 'center' }}>
          <Suspense fallback={<Spinner />}>
            <Login onLoginSuccess={() => setIsLoggedIn(true)} />
          </Suspense>
        </main>
      </div>
    );
  }

  return (
    <div className="app-container">
      
      {/* Dynamic Header */}
      <header className="app-header">
        <div className="brand-title">
          <Sparkles size={22} fill="var(--primary)" color="var(--primary)" />
          AuraVoice
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Free Task Center trigger badge */}
          <div 
            className="coin-badge" 
            style={{ 
              background: 'rgba(139, 60, 255, 0.15)', 
              borderColor: 'rgba(139, 60, 255, 0.4)', 
              color: 'var(--secondary)',
              animation: 'pulse 3s infinite'
            }}
            onClick={() => setTasksOpen(true)}
          >
            <Gift size={12} fill="var(--secondary)" /> Earn Free
          </div>

          {/* Coin Badge */}
          <div className="coin-badge" onClick={() => setWalletOpen(true)}>
            🪙 {coins}
          </div>
        </div>
      </header>

      {/* Notification ticker */}
      {notification && (
        <div 
          style={{ 
            fontSize: '11px', 
            background: 'rgba(255, 46, 147, 0.08)', 
            color: 'var(--primary)', 
            padding: '6px 16px', 
            fontWeight: '700',
            borderBottom: '1px solid rgba(255, 46, 147, 0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            animation: 'fadeIn 0.5s ease-out'
          }}
        >
          <Bell size={11} /> <span>{notification}</span>
        </div>
      )}

      {/* Main App Content Viewport */}
      <main className="app-content">
        
        {/* Active game view overrides active voice room */}
        <Suspense fallback={<Spinner />}>
        {activeGamePartner ? (
          <Games 
            partner={activeGamePartner} 
            userProfile={userProfile} 
            onBackToRoom={() => setActiveGamePartner(null)} 
          />
        ) : activeRoom ? (
          /* Active Voice Room view */
          <VoiceRoom 
            room={activeRoom} 
            userProfile={userProfile}
            coins={coins}
            setCoins={setCoins}
            onBack={() => handleLeaveRoom(activeRoom)}
            onLaunchGame={handleLaunchGame}
            blockedUsers={blockedUsers}
            onBlockUser={handleBlockUser}
          />
        ) : (
          /* Main Tab Navigation Views */
          <>
            {activeTab === 'home' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* User quick profile greeting card */}
                <div 
                  style={{ 
                    background: 'var(--glass-bg)', 
                    border: '1px solid var(--glass-border)', 
                    padding: '16px', 
                    borderRadius: '24px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '14px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div 
                    style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '50%', 
                      background: 'linear-gradient(45deg, var(--primary), var(--secondary))', 
                      padding: '2px',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    onClick={() => setActiveTab('profile')}
                  >
                    <div className="rj-avatar" style={{ background: '#190e25', borderRadius: '50%', overflow: 'hidden', width: '100%', height: '100%' }}>
                      {userProfile.photoURL ? (
                        <img src={userProfile.photoURL} alt={userProfile.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        renderAvatarSVG(userProfile.skin, userProfile.hair, userProfile.accessory, userProfile.outfit)
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '800' }}>Swagat hai, {userProfile.name}! 👋</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>"{userProfile.bio}"</p>
                  </div>
                  
                  {/* Secure Sign out button */}
                  <button 
                    onClick={handleLogout}
                    title="Sign Out"
                    style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.2)', padding: '6px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center' }}
                  >
                    <LogOut size={14} color="#e53935" />
                  </button>
                </div>

                {/* Promotional banner */}
                <div 
                  style={{ 
                    background: 'linear-gradient(135deg, var(--secondary) 0%, #4f46e5 100%)', 
                    padding: '16px', 
                    borderRadius: '24px', 
                    textAlign: 'left',
                    boxShadow: '0 8px 24px rgba(139, 60, 255, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '800' }}>🎤 Instant RJ Dating 🎤</h4>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>Audio match with active people in 2 seconds.</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('matchmaker')}
                    className="frnd-btn" 
                    style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '12px', background: 'var(--accent)', color: '#000', boxShadow: 'none' }}
                  >
                    Match
                  </button>
                </div>

                {/* Live Rooms grid — from Firestore */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>🔥 Live Voice Rooms</h3>
                    <button onClick={() => { setActiveTab('rooms'); setCreateRoomOpen(true); }}
                      className="frnd-btn" style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '10px', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Plus size={12} /> Create
                    </button>
                  </div>
                  {allRooms.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 20px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '20px' }}>
                      <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎙️</div>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '6px' }}>No Live Rooms Yet!</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>Be the first to create a room and go live!</p>
                      <button onClick={() => { setActiveTab('rooms'); setCreateRoomOpen(true); }} className="frnd-btn" style={{ padding: '10px 24px' }}>🚀 Create First Room</button>
                    </div>
                  ) : (
                    <div className="room-grid">
                      {allRooms.slice(0, 4).map(room => (
                        <div key={room.id} className="room-card" onClick={() => setActiveRoom(room)}>
                          <div className="room-card-header">
                            <span className="room-tag">{room.tag}</span>
                            <span className="room-listeners">🛡️ Live</span>
                          </div>
                          <div className="rj-host-row">
                            <div className="rj-avatar-wrapper">
                              <div className="rj-avatar-ring">
                                <div className="rj-avatar">
                                  {renderAvatarSVG(room.host?.skin, room.host?.hair, room.host?.accessory, room.host?.outfit)}
                                </div>
                              </div>
                              <div className="live-indicator" />
                            </div>
                            <div>
                              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{room.title}</h4>
                              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Host: {room.host?.name}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'rooms' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', background: 'linear-gradient(90deg, #ff2e93, #8b3cff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Voice Rooms</h2>
                  <button onClick={() => setCreateRoomOpen(true)} className="frnd-btn" style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '12px', boxShadow: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={14} /> Create Room
                  </button>
                </div>
                <div className="search-bar">
                  <Search size={16} color="var(--text-secondary)" />
                  <input placeholder="Search rooms..." value={roomSearch} onChange={e => setRoomSearch(e.target.value)} />
                </div>
                <div className="pill-row">
                  {['All', 'Matchmaking', 'Music & Fun', 'Games', 'Talk Show'].map(cat => (
                    <div key={cat} className={`pill ${roomCategory === cat ? 'active' : ''}`} onClick={() => setRoomCategory(cat)}>{cat}</div>
                  ))}
                </div>

                {allRooms.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '24px', marginTop: '10px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎙️</div>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '6px' }}>No Rooms Yet!</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>Be the very first to go live and host your own voice room.</p>
                    <button onClick={() => setCreateRoomOpen(true)} className="frnd-btn" style={{ padding: '12px 28px' }}>🚀 Create First Room</button>
                  </div>
                ) : (
                  <div className="room-grid">
                    {allRooms
                      .filter(room => {
                        const matchCat = roomCategory === 'All' || room.tag === roomCategory;
                        const matchSearch = !roomSearch || room.title?.toLowerCase().includes(roomSearch.toLowerCase()) || room.host?.name?.toLowerCase().includes(roomSearch.toLowerCase());
                        return matchCat && matchSearch;
                      })
                      .map(room => (
                        <div key={room.id} className="room-card" onClick={() => setActiveRoom(room)}>
                          <div className="room-card-header">
                            <span className="room-tag">{room.tag}</span>
                            <div className="room-listeners"><Users size={12} /> {room.listenerCount || 1}</div>
                          </div>
                          <div className="rj-host-row">
                            <div className="rj-avatar-wrapper">
                              <div className="rj-avatar-ring">
                                <div className="rj-avatar">{renderAvatarSVG(room.host?.skin, room.host?.hair, room.host?.accessory, room.host?.outfit)}</div>
                              </div>
                              <div className="live-indicator" />
                            </div>
                            <div>
                              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{room.title}</h4>
                              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Host: {room.host?.name} ({room.host?.lang || 'Hindi'})</p>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            )}

            {activeTab === 'matchmaker' && (
              <Matchmaker userProfile={userProfile} onMatchStarted={() => Analytics.matchStarted(userProfile.lang)} />
            )}

            {activeTab === 'loveskool' && (
              <LoveSkool userProfile={userProfile} />
            )}

            {activeTab === 'profile' && (
              <AvatarCreator userProfile={userProfile} onSaveProfile={handleSaveProfile} />
            )}

            {activeTab === 'friends' && (
              <Friends
                userProfile={userProfile}
                onOpenDM={(thread) => {
                  setPendingDMThread(thread);
                  setActiveTab('messages');
                }}
                onStartVideoCall={(peer) => setActiveVideoCall(peer)}
              />
            )}

            {activeTab === 'messages' && (
              <DirectMessages
                userProfile={userProfile}
                initialThread={pendingDMThread}
                onThreadOpened={() => setPendingDMThread(null)}
                onStartVideoCall={(peer) => setActiveVideoCall(peer)}
              />
            )}

            {activeTab === 'leaderboard' && (
              <Leaderboard userProfile={userProfile} />
            )}
          </>
        )}
        </Suspense>

      </main>

      {/* Main Tab Navigation (Hidden when in active voice room/game call) */}
      {!activeRoom && !activeGamePartner && (
        <nav className="app-nav">
          <div onClick={() => setActiveTab('home')} className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}>
            <HomeIcon size={20} />
            <span>Home</span>
          </div>
          <div onClick={() => setActiveTab('rooms')} className={`nav-item ${activeTab === 'rooms' ? 'active' : ''}`}>
            <MessageSquare size={20} />
            <span>Rooms</span>
          </div>
          <div onClick={() => setActiveTab('matchmaker')} className={`nav-item ${activeTab === 'matchmaker' ? 'active' : ''}`}>
            <Phone size={20} />
            <span>Match</span>
          </div>
          <div onClick={() => setActiveTab('messages')} className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}>
            <MessageSquare size={20} />
            <span>DMs</span>
          </div>
          <div onClick={() => setActiveTab('leaderboard')} className={`nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}>
            <Trophy size={20} />
            <span>Ranks</span>
          </div>
          <div onClick={() => setActiveTab('profile')} className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}>
            <User size={20} />
            <span>Me</span>
          </div>
        </nav>
      )}

      {/* Interactive Wallet Bottom Drawer */}
      {walletOpen && (
        <>
          <div className="bottom-sheet-overlay" onClick={() => setWalletOpen(false)} />
          <div className="bottom-sheet open">
            <div className="bottom-sheet-handle" />
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(255, 184, 0, 0.1)', width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 10px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255, 184, 0, 0.3)' }}>
                <Wallet size={28} color="var(--accent)" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Aura Wallet Coins</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Use coins to send virtual gifts to RJs & matched friends!</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', padding: '16px', borderRadius: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>CURRENT COIN BALANCE</span>
                <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent)', marginTop: '2px' }}>🪙 {coins} Coins</div>
              </div>
              <button 
                onClick={handleClaimDailyReward}
                className="frnd-btn"
                style={{ padding: '10px 18px', fontSize: '13px', borderRadius: '12px', boxShadow: 'none' }}
              >
                +100 Coins
              </button>
            </div>
            
            <button 
              onClick={() => setWalletOpen(false)}
              className="frnd-btn-secondary" 
              style={{ width: '100%', padding: '12px', borderRadius: '14px' }}
            >
              Close Wallet
            </button>
          </div>
        </>
      )}

      {/* Free Coins Task Center (Solves High Paywall complaint) */}
      {tasksOpen && (
        <>
          <div className="bottom-sheet-overlay" onClick={() => setTasksOpen(false)} />
          <div className="bottom-sheet open">
            <div className="bottom-sheet-handle" />
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(139, 60, 255, 0.1)', width: '54px', height: '54px', borderRadius: '50%', margin: '0 auto 10px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(139, 60, 255, 0.3)' }}>
                <CheckSquare size={24} color="var(--secondary)" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800' }}>🎁 Free Coin Task Center</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Solve your paywall! Earn free coins instantly without spending money.</p>
            </div>

            {/* Tasks list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto', marginBottom: '14px' }}>
              {tasks.map(task => (
                <div 
                  key={task.id}
                  style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--glass-border)', 
                    padding: '12px 14px', 
                    borderRadius: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{task.title}</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{task.desc}</p>
                  </div>
                  <div>
                    {task.claimed ? (
                      <span style={{ fontSize: '11px', background: 'rgba(0,230,118,0.12)', color: '#00e676', padding: '6px 12px', borderRadius: '10px', fontWeight: '700' }}>✓ Claimed</span>
                    ) : (
                      <button 
                        onClick={() => handleClaimTask(task.id, task.reward)}
                        className="frnd-btn" 
                        style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '10px', boxShadow: 'none' }}
                      >
                        🪙 +{task.reward}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setTasksOpen(false)}
              className="frnd-btn-secondary" 
              style={{ width: '100%', padding: '12px', borderRadius: '14px' }}
            >
              Close Task Center
            </button>
          </div>
        </>
      )}

      {/* ── Create Room Modal ── */}
      {createRoomOpen && (
        <div className="modal-overlay" onClick={() => setCreateRoomOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="bottom-sheet-handle" />
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ background: 'rgba(255,46,147,0.1)', width: '54px', height: '54px', borderRadius: '50%', margin: '0 auto 10px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,46,147,0.25)' }}>
                <Plus size={24} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800' }}>🎙️ Create Your Own Room</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Go live and be the RJ host! Anyone can join and chat.</p>
            </div>
            <form
              className="create-room-form"
              onSubmit={async e => {
                e.preventDefault();
                if (!newRoomTitle.trim()) return;
                const roomData = {
                  title: newRoomTitle.trim(),
                  tag: newRoomTag,
                  host: { ...userProfile },
                  hostUid: auth.currentUser?.uid || 'guest',
                  speakers: [],
                  listenerCount: 1,
                  isLive: true,
                  createdAt: Date.now(),
                };
                try {
                  const docRef = await addDoc(collection(db, 'frnd_rooms'), roomData);
                  setCreateRoomOpen(false);
                  setNewRoomTitle('');
                  setActiveTab('rooms');
                  setActiveRoom({ id: docRef.id, ...roomData });
                  confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
                  // ── Track roomsHosted for Leaderboard ──────────────────────
                  const currentUser = auth.currentUser;
                  if (currentUser) {
                    try {
                      const uRef = doc(db, 'users', currentUser.uid);
                      const uSnap = await getDoc(uRef);
                      if (uSnap.exists()) {
                        await updateDoc(uRef, {
                          'profile.roomsHosted': (uSnap.data()?.profile?.roomsHosted || 0) + 1,
                        });
                      }
                    } catch (_) {}
                  }
                } catch (err) {
                  console.warn('Room create failed on database, using local fallback:', err);
                  const tempId = `local-${Date.now()}`;
                  const localRoom = { id: tempId, ...roomData };
                  setLocalRooms(prev => [localRoom, ...prev]);
                  setCreateRoomOpen(false);
                  setNewRoomTitle('');
                  setActiveTab('rooms');
                  setActiveRoom(localRoom);
                  confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
                }
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>Room Title</label>
                <input className="frnd-input" placeholder="e.g. Late Night Shayari 🎤" value={newRoomTitle} onChange={e => setNewRoomTitle(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>Category</label>
                <select className="frnd-input" value={newRoomTag} onChange={e => setNewRoomTag(e.target.value)}>
                  <option value="Matchmaking">💖 Matchmaking</option>
                  <option value="Music & Fun">🎸 Music &amp; Fun</option>
                  <option value="Games">🎮 Games</option>
                  <option value="Talk Show">🎙️ Talk Show</option>
                </select>
              </div>
              <button type="submit" className="frnd-btn" style={{ width: '100%', padding: '14px' }}>🚀 Go Live Now!</button>
              <button type="button" onClick={() => setCreateRoomOpen(false)} className="frnd-btn-secondary" style={{ width: '100%', padding: '12px', borderRadius: '14px' }}>Cancel</button>
            </form>
          </div>
        </div>
      )}
      {/* ── Push Notification Permission Prompt ── */}
      {showNotifPrompt && 'Notification' in window && Notification.permission === 'default' && (
        <>
          <div className="bottom-sheet-overlay" onClick={() => setShowNotifPrompt(false)} />
          <div className="bottom-sheet open">
            <div className="bottom-sheet-handle" />
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255,46,147,0.1)', width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 12px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,46,147,0.3)' }}>
                <Bell size={26} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>🔔 Stay in the Loop!</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Get notified when your favourite hosts go live, someone matches with you, or you receive a gift!
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={handleEnableNotifications} className="frnd-btn" style={{ width: '100%', padding: '14px' }}>
                🔔 Enable Notifications
              </button>
              <button onClick={() => setShowNotifPrompt(false)} className="frnd-btn-secondary" style={{ width: '100%', padding: '12px', borderRadius: '14px' }}>
                Maybe Later
              </button>
            </div>
          </div>
        </>
      )}
      {/* ── Video Call Overlay ── */}
      {activeVideoCall && (
        <Suspense fallback={
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#060412', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '48px', height: '48px', border: '4px solid rgba(139,60,255,0.2)', borderTopColor: 'var(--secondary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        }>
          <VideoCall
            channelName={`video-${activeVideoCall.chatId || activeVideoCall.peerUid || 'call'}`}
            peer={activeVideoCall}
            userProfile={userProfile}
            onEnd={() => setActiveVideoCall(null)}
          />
        </Suspense>
      )}

    </div>
  );
}
