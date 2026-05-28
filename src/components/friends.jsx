/**
 * AuraVoice Friends Tab
 * Shows followed users with Message (DM) and Video call buttons.
 */
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { renderAvatarSVG } from './mockData';
import { UserMinus, UserCheck, Users, Heart, MessageCircle, Video } from 'lucide-react';

export default function Friends({ userProfile, onOpenDM, onStartVideoCall }) {
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) { setLoading(false); return; }

    const followingRef = collection(db, 'users', currentUser.uid, 'following');
    const unsub = onSnapshot(followingRef, async (snap) => {
      const list = [];
      for (const d of snap.docs) {
        const data = d.data();
        try {
          const profileSnap = await getDoc(doc(db, 'users', d.id));
          if (profileSnap.exists()) {
            list.push({ uid: d.id, ...profileSnap.data().profile, followedAt: data.followedAt });
          } else {
            list.push({ uid: d.id, name: data.name || 'AuraVoice User', followedAt: data.followedAt });
          }
        } catch {
          list.push({ uid: d.id, name: data.name || 'AuraVoice User', followedAt: data.followedAt });
        }
      }
      setFollowing(list);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, []);

  const handleUnfollow = async (uid) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'following', uid));
    } catch (e) {
      console.warn('Unfollow failed:', e);
    }
  };

  // Open DM — create/open the chat doc and navigate to Messages tab
  const handleMessage = async (friend) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const chatId = [currentUser.uid, friend.uid].sort().join('_');
    // Pre-create the chat doc so it shows in DM list immediately
    try {
      await setDoc(doc(db, 'chats', chatId), {
        participants: [currentUser.uid, friend.uid],
        lastMessage: '',
        lastAt: null,
        names: {
          [currentUser.uid]: userProfile.name,
          [friend.uid]: friend.name || 'AuraVoice User',
        },
        photos: {
          [currentUser.uid]: userProfile.photoURL || null,
          [friend.uid]: friend.photoURL || null,
        },
      }, { merge: true });
    } catch (_) {}
    // Navigate to messages tab and open the thread
    onOpenDM?.({
      chatId,
      peerUid: friend.uid,
      peerName: friend.name || 'AuraVoice User',
      peerPhoto: friend.photoURL || null,
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '12px' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,46,147,0.2)', borderTopColor: '#ff2e93', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading friends...</p>
      </div>
    );
  }

  if (following.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(255,46,147,0.1)', border: '2px solid rgba(255,46,147,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Heart size={32} color="var(--primary)" />
        </div>
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '6px' }}>No Friends Yet!</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Join a Voice Room and tap <strong>Follow Host</strong> to add them to your friends list.
          </p>
        </div>
        <div style={{ background: 'rgba(139,60,255,0.08)', border: '1px solid rgba(139,60,255,0.2)', borderRadius: '16px', padding: '12px 16px', width: '100%', maxWidth: '280px' }}>
          <p style={{ fontSize: '12px', color: 'var(--secondary)', fontWeight: '600' }}>
            💡 Tip: Follow hosts to see when they go live!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <h2 style={{
          fontSize: '18px', fontWeight: '800',
          background: 'linear-gradient(90deg, #ff2e93, #8b3cff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <Users size={20} color="#ff2e93" style={{ WebkitTextFillColor: '#ff2e93' }} />
          My Friends
        </h2>
        <span style={{ fontSize: '12px', background: 'rgba(255,46,147,0.12)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '20px', fontWeight: '700' }}>
          {following.length} following
        </span>
      </div>

      {/* Friends list */}
      {following.map((friend) => (
        <div
          key={friend.uid}
          style={{
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            borderRadius: '20px', padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}
        >
          {/* Avatar */}
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(45deg, var(--primary), var(--secondary))', padding: '2px', flexShrink: 0 }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#190e25', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {friend.photoURL ? (
                <img src={friend.photoURL} alt={friend.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                renderAvatarSVG(friend.skin, friend.hair, friend.accessory, friend.outfit)
              )}
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '2px' }}>
              {friend.name || 'AuraVoice User'}
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {friend.lang || 'Hindi'} · {friend.bio || 'AuraVoice member'}
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            {/* Message */}
            <button
              onClick={() => handleMessage(friend)}
              title="Send Message"
              style={{
                background: 'rgba(139,60,255,0.1)', border: '1px solid rgba(139,60,255,0.25)',
                borderRadius: '10px', padding: '7px 9px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', color: 'var(--secondary)',
              }}
            >
              <MessageCircle size={14} />
            </button>

            {/* Video Call */}
            <button
              onClick={() => onStartVideoCall?.({
                chatId: [auth.currentUser?.uid, friend.uid].sort().join('_'),
                peerUid: friend.uid,
                peerName: friend.name || 'AuraVoice User',
                peerPhoto: friend.photoURL || null,
              })}
              title="Start Video Call"
              style={{
                background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.2)',
                borderRadius: '10px', padding: '7px 9px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', color: 'var(--primary)',
              }}
            >
              <Video size={14} />
            </button>

            {/* Unfollow */}
            <button
              onClick={() => handleUnfollow(friend.uid)}
              title="Unfollow"
              style={{
                background: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.15)',
                borderRadius: '10px', padding: '7px 9px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', color: '#e53935',
              }}
            >
              <UserMinus size={14} />
            </button>
          </div>
        </div>
      ))}

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <UserCheck size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
        Following {following.length} voice room host{following.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
