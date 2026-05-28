import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { joinVoiceChannel, leaveVoiceChannel, setLocalMicMute } from '../agora';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, setDoc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { Mic, MicOff, Users, Send, Gift, Flag, UserX, UserPlus, UserCheck } from 'lucide-react';
import { renderAvatarSVG } from './mockData';
import confetti from 'canvas-confetti';
import { Analytics } from '../analytics';

const GIFTS = [
  { id: 'gift-rose',  name: 'Rose',        emoji: '🌹', cost: 10  },
  { id: 'gift-heart', name: 'Love Heart',  emoji: '💖', cost: 50  },
  { id: 'gift-teddy', name: 'Cute Teddy',  emoji: '🧸', cost: 100 },
  { id: 'gift-crown', name: 'Royal Crown', emoji: '👑', cost: 200 },
];

export default function VoiceRoom({ room, userProfile, coins, setCoins, onBack, onLaunchGame, blockedUsers = [], onBlockUser }) {
  const [chats, setChats]             = useState([]);
  const [localMessages, setLocalMessages] = useState([]);
  const allMessages = [...chats, ...localMessages];
  const [inputValue, setInputValue]   = useState('');
  const [onStage, setOnStage]         = useState(false);
  const [micActive, setMicActive]     = useState(false); // start muted
  const [giftDrawerOpen, setGiftDrawerOpen] = useState(false);
  const [selectedGift, setSelectedGift]     = useState(GIFTS[0]);
  const [giftTarget, setGiftTarget]         = useState('host');
  const [reportOpen, setReportOpen]   = useState(false);
  const [reportSent, setReportSent]   = useState(false);
  const [listenerCount, setListenerCount] = useState(1);
  const [isFollowingHost, setIsFollowingHost] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const chatEndRef  = useRef(null);
  const roomSpeakers = room.speakers || [];

  // ── Join Agora voice channel ──────────────────────────────────────────────
  useEffect(() => {
    const start = async () => {
      try {
        await joinVoiceChannel(room.id);
        await setLocalMicMute(true); // start muted
      } catch (err) {
        console.warn('Agora join failed:', err);
      }
    };
    start();
    return () => { leaveVoiceChannel(); };
  }, [room.id]);

  // ── Check if already following host ─────────────────────────────────────
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser || !room.hostUid) return;
    const followRef = doc(db, 'users', currentUser.uid, 'following', room.hostUid);
    getDoc(followRef).then(snap => setIsFollowingHost(snap.exists())).catch(() => {});
  }, [room.hostUid]);

  // ── Follow / Unfollow host ───────────────────────────────────────────────
  const handleFollowHost = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !room.hostUid) return;
    // Can't follow yourself
    if (currentUser.uid === room.hostUid) return;

    setFollowLoading(true);
    const followRef = doc(db, 'users', currentUser.uid, 'following', room.hostUid);
    try {
      if (isFollowingHost) {
        await deleteDoc(followRef);
        setIsFollowingHost(false);
      } else {
        await setDoc(followRef, {
          name: room.host?.name || 'AuraVoice Host',
          followedAt: Date.now(),
        });
        setIsFollowingHost(true);
        Analytics.followedHost(room.host?.name || 'Unknown');
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.5 } });
      }
    } catch (e) {
      console.warn('Follow/unfollow failed:', e);
    } finally {
      setFollowLoading(false);
    }
  };

  // ── Real-time Firestore chat ──────────────────────────────────────────────
  useEffect(() => {
    const msgsRef = collection(db, 'frnd_rooms', room.id, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      const msgs = [];
      snap.forEach(d => {
        const data = d.data();
        // Skip messages from blocked users
        if (!blockedUsers.includes(data.sender)) {
          msgs.push({ id: d.id, ...data });
        }
      });
      setChats(msgs);
    });
    return () => unsub();
  }, [room.id, blockedUsers]);

  // ── Auto-scroll chat ──────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  // ── Simulate listener count going up slowly ───────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setListenerCount(n => n + Math.floor(Math.random() * 3));
    }, 12000);
    return () => clearInterval(t);
  }, []);

  // ── Send message to Firestore ─────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const chatMsg = {
      sender:    userProfile.name,
      text:      inputValue.trim(),
      isUser:    true,
      createdAt: Date.now(),
    };
    try {
      await addDoc(collection(db, 'frnd_rooms', room.id, 'messages'), {
        ...chatMsg,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Chat send failed, using local fallback:', err);
      setLocalMessages(prev => [...prev, chatMsg]);
    }
    setInputValue('');
  };

  // ── Request / leave stage ─────────────────────────────────────────────────
  const handleRequestSeat = async () => {
    if (onStage) {
      setOnStage(false);
      await setLocalMicMute(true);
      setMicActive(false);
    } else {
      setOnStage(true);
      await setLocalMicMute(false);
      setMicActive(true);
      confetti({ particleCount: 30, spread: 40, origin: { y: 0.8 } });
      // Announce in chat
      const sysMsg = {
        sender: '🎙️ STAGE', isSystem: true,
        text: `${userProfile.name} joined the stage! Welcome! 👏`,
        createdAt: Date.now(),
      };
      try {
        await addDoc(collection(db, 'frnd_rooms', room.id, 'messages'), {
          ...sysMsg,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Stage announcement write failed, using local fallback:', err);
        setLocalMessages(prev => [...prev, sysMsg]);
      }
    }
  };

  // ── Virtual gifting ───────────────────────────────────────────────────────
  const sendGift = async () => {
    if (coins < selectedGift.cost) {
      alert('Not enough coins! Earn free coins from the Task Center.');
      return;
    }
    setCoins(prev => prev - selectedGift.cost);
    setGiftDrawerOpen(false);

    // ── Track coinsSpent in Firestore for Leaderboard ───────────────────────
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const prev = snap.data()?.profile?.coinsSpent || 0;
          await updateDoc(userRef, {
            'profile.coinsSpent': prev + selectedGift.cost,
            'profile.coins': (snap.data()?.profile?.coins || 0) - selectedGift.cost,
          });
        }
      } catch (e) { /* non-critical, leaderboard is eventually consistent */ }
    }

    const scalar = 3;
    const shape = confetti.shapeFromText({ text: selectedGift.emoji, scalar });
    confetti({ shapes: [shape], particleCount: 25, spread: 60, startVelocity: 25, origin: { x: 0.5, y: 0.3 } });

    const targetName = giftTarget === 'host' ? room.host.name
      : (roomSpeakers[0] ? roomSpeakers[0].name : userProfile.name);

    const giftMsg = {
      sender: '🎁 GIFT', isGift: true,
      text: `@${userProfile.name} sent ${selectedGift.emoji} ${selectedGift.name} to @${targetName}!`,
      createdAt: Date.now(),
    };

    try {
      await addDoc(collection(db, 'frnd_rooms', room.id, 'messages'), {
        ...giftMsg,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Gifting broadcast failed, using local fallback:', err);
      setLocalMessages(prev => [...prev, giftMsg]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--glass-border)' }}>
        <button onClick={onBack} className="frnd-btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '10px' }}>
          ← Leave Room
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={14} color="var(--text-secondary)" />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>{listenerCount} listening</span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setReportOpen(true)} title="Report or Block"
            style={{ background: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.2)', padding: '6px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Flag size={14} color="#e53935" />
          </button>
          <button onClick={onLaunchGame} className="frnd-btn"
            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '10px', boxShadow: 'none', background: 'linear-gradient(135deg, var(--accent), #ff9800)' }}>
            🎮 Play
          </button>
        </div>
      </div>

      {/* Stage — Host + Seats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', margin: '14px 0' }}>
        {/* Host */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="rj-avatar-ring" style={{ width: '80px', height: '80px', position: 'relative' }}>
            <div className="rj-avatar" style={{ background: '#190e25' }}>
              {renderAvatarSVG(room.host.skin, room.host.hair, room.host.accessory, room.host.outfit)}
            </div>
            <div className="live-indicator" />
            <div style={{ position: 'absolute', top: '-10px', background: 'var(--accent)', color: '#000', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '99px' }}>HOST RJ</div>
          </div>
          <span style={{ fontWeight: '700', fontSize: '14px', marginTop: '8px' }}>{room.host.name} 🎧</span>
          {/* Follow Host Button */}
          {auth.currentUser?.uid !== room.hostUid && (
            <button
              onClick={handleFollowHost}
              disabled={followLoading}
              style={{
                marginTop: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                border: isFollowingHost ? '1px solid rgba(0,230,118,0.4)' : '1px solid rgba(255,46,147,0.4)',
                background: isFollowingHost ? 'rgba(0,230,118,0.1)' : 'rgba(255,46,147,0.1)',
                color: isFollowingHost ? '#00e676' : 'var(--primary)',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
              }}
            >
              {isFollowingHost ? <><UserCheck size={12} /> Following</> : <><UserPlus size={12} /> Follow Host</>}
            </button>
          )}
        </div>

        {/* Lower seats */}
        <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
          {/* Speaker seat 1 — real or open */}
          {roomSpeakers[0] ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '45%' }}>
              <div className="rj-avatar-ring" style={{ width: '60px', height: '60px', background: 'linear-gradient(45deg, var(--secondary), #00bcd4)' }}>
                <div className="rj-avatar" style={{ background: '#190e25' }}>
                  {renderAvatarSVG(roomSpeakers[0].avatar.skin, roomSpeakers[0].avatar.hair, roomSpeakers[0].avatar.accessory, roomSpeakers[0].avatar.outfit)}
                </div>
              </div>
              <span style={{ fontWeight: '600', fontSize: '12px', marginTop: '6px' }}>{roomSpeakers[0].name}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Seat 1</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '45%' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px dashed var(--glass-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                <Mic size={16} />
                <span style={{ fontSize: '8px', fontWeight: '700', marginTop: '2px' }}>OPEN</span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '6px' }}>Seat 1 Open</span>
            </div>
          )}

          {/* Seat 2 — user can request */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '45%' }}>
            {onStage ? (
              <>
                <div className="rj-avatar-ring" style={{ width: '60px', height: '60px', background: 'linear-gradient(45deg, var(--primary), var(--accent))', position: 'relative' }}>
                  <div className="rj-avatar" style={{ background: '#190e25' }}>
                    {renderAvatarSVG(userProfile.skin, userProfile.hair, userProfile.accessory, userProfile.outfit)}
                  </div>
                  {!micActive && (
                    <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#e53935', padding: '3px', borderRadius: '50%' }}>
                      <MicOff size={10} color="#fff" />
                    </div>
                  )}
                </div>
                <span style={{ fontWeight: '600', fontSize: '12px', marginTop: '6px' }}>{userProfile.name} (You)</span>
                <button
                  onClick={() => {
                    const next = !micActive;
                    setMicActive(next);
                    setLocalMicMute(!next);
                  }}
                  style={{ background: 'none', border: 'none', color: micActive ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px', fontWeight: '700', marginTop: '2px' }}
                >
                  {micActive ? '🎙️ Mute' : '🔇 Unmute'}
                </button>
              </>
            ) : (
              <div onClick={handleRequestSeat}
                style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px dashed rgba(255,46,147,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary)', background: 'rgba(255,46,147,0.05)', transition: 'all 0.2s ease' }}>
                <Mic size={16} />
                <span style={{ fontSize: '8px', fontWeight: '800', marginTop: '2px' }}>JOIN</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Chat */}
      <div style={{ flex: 1, minHeight: '150px', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', borderRadius: '20px', padding: '12px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {allMessages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px', marginTop: '20px' }}>
              💬 Be the first to say hi in chat!
            </div>
          )}
          {allMessages.map((chat, idx) => (
            <div key={chat.id || idx}
              style={{
                fontSize: '13px', lineHeight: '1.4',
                background: chat.isGift ? 'rgba(255,184,0,0.12)' : chat.isSystem ? 'rgba(139,60,255,0.08)' : 'rgba(255,255,255,0.03)',
                border: chat.isGift ? '1px solid rgba(255,184,0,0.2)' : chat.isSystem ? '1px solid rgba(139,60,255,0.15)' : 'none',
                padding: '6px 12px', borderRadius: '12px', alignSelf: 'flex-start', maxWidth: '92%'
              }}>
              {chat.isGift ? (
                <span>🎁 <span style={{ color: 'var(--accent)', fontWeight: '700' }}>{chat.text}</span></span>
              ) : chat.isSystem ? (
                <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>{chat.text}</span>
              ) : (
                <>
                  <span style={{ fontWeight: '700', marginRight: '6px', color: chat.isUser ? 'var(--accent)' : 'var(--primary)' }}>
                    {chat.sender}:
                  </span>
                  <span>{chat.text}</span>
                </>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <input type="text" className="frnd-input"
            placeholder="Say something in chat..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            style={{ borderRadius: '12px', padding: '10px 14px' }}
          />
          <button type="button" onClick={() => setGiftDrawerOpen(true)}
            className="frnd-btn-secondary"
            style={{ padding: '0 12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,46,147,0.15)', borderColor: 'rgba(255,46,147,0.3)' }}>
            <Gift size={18} color="var(--primary)" />
          </button>
          <button type="submit" className="frnd-btn" style={{ padding: '0 16px', borderRadius: '12px', boxShadow: 'none' }}>
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Gift Drawer */}
      {giftDrawerOpen && (
        <>
          <div className="bottom-sheet-overlay" onClick={() => setGiftDrawerOpen(false)} />
          <div className="bottom-sheet open">
            <div className="bottom-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800' }}>🎁 Send a Gift</h3>
              <span style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: '700' }}>🪙 {coins} Coins</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', alignSelf: 'center' }}>To:</span>
              <button onClick={() => setGiftTarget('host')}
                className={`frnd-btn-secondary ${giftTarget === 'host' ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '10px', borderColor: giftTarget === 'host' ? 'var(--primary)' : 'var(--glass-border)' }}>
                {room.host.name}
              </button>
              {roomSpeakers[0] && (
                <button onClick={() => setGiftTarget('speaker-1')}
                  className={`frnd-btn-secondary ${giftTarget === 'speaker-1' ? 'active' : ''}`}
                  style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '10px', borderColor: giftTarget === 'speaker-1' ? 'var(--primary)' : 'var(--glass-border)' }}>
                  {roomSpeakers[0].name}
                </button>
              )}
            </div>

            <div className="gift-list">
              {GIFTS.map(g => (
                <div key={g.id} className="gift-item" onClick={() => setSelectedGift(g)}
                  style={{ borderColor: selectedGift.id === g.id ? 'var(--primary)' : 'var(--glass-border)' }}>
                  <span className="gift-icon-glow">{g.emoji}</span>
                  <span style={{ fontSize: '11px', fontWeight: '600' }}>{g.name}</span>
                  <span className="gift-cost">🪙 {g.cost}</span>
                </div>
              ))}
            </div>

            <button onClick={sendGift} className="frnd-btn" style={{ width: '100%', marginTop: '16px', padding: '14px' }}>
              Send {selectedGift.emoji} ({selectedGift.cost} Coins)
            </button>
          </div>
        </>
      )}

      {/* Report / Block Modal */}
      {reportOpen && (
        <div className="modal-overlay" onClick={() => setReportOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="bottom-sheet-handle" />
            {reportSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Report Submitted</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>Thank you for keeping AuraVoice safe!</p>
                <button onClick={() => { setReportOpen(false); setReportSent(false); }} className="frnd-btn" style={{ marginTop: '20px', padding: '12px 28px' }}>Close</button>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800' }}>🚨 Safety & Report</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Report {room.host.name}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {['Inappropriate language', 'Harassment or bullying', 'Spam or fake profile', 'Sharing personal info', 'Offensive content'].map(reason => (
                    <div key={reason} className="report-option" onClick={() => setReportSent(true)}>
                      <Flag size={16} color="#e53935" /> {reason}
                    </div>
                  ))}
                </div>
                <button className="frnd-btn"
                  style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#e53935,#b71c1c)', boxShadow: '0 6px 20px rgba(229,57,53,0.3)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => { if (onBlockUser) onBlockUser(room.host.name); setReportOpen(false); }}>
                  <UserX size={16} /> Block {room.host.name}
                </button>
                <button onClick={() => setReportOpen(false)} className="frnd-btn-secondary" style={{ width: '100%', padding: '11px', borderRadius: '14px' }}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
