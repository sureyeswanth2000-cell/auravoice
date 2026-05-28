/**
 * AuraVoice Friends Tab
 * Shows the list of users the current user follows,
 * with their avatar, name, and an unfollow button.
 */
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection, onSnapshot, deleteDoc, doc, getDoc
} from 'firebase/firestore';
import { renderAvatarSVG } from './mockData';
import { UserMinus, UserCheck, Users, Heart } from 'lucide-react';

export default function Friends({ userProfile }) {
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
        // Try to fetch their live profile from Firestore
        try {
          const profileSnap = await getDoc(doc(db, 'users', d.id));
          if (profileSnap.exists()) {
            list.push({
              uid: d.id,
              ...profileSnap.data().profile,
              followedAt: data.followedAt,
            });
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
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'rgba(255,46,147,0.1)', border: '2px solid rgba(255,46,147,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Heart size={32} color="var(--primary)" />
        </div>
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '6px' }}>No Friends Yet!</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Join a Voice Room and tap <strong>Follow Host</strong> to add them to your friends list.
          </p>
        </div>
        <div style={{
          background: 'rgba(139,60,255,0.08)', border: '1px solid rgba(139,60,255,0.2)',
          borderRadius: '16px', padding: '12px 16px', width: '100%', maxWidth: '280px'
        }}>
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
        <span style={{
          fontSize: '12px', background: 'rgba(255,46,147,0.12)',
          color: 'var(--primary)', padding: '4px 10px', borderRadius: '20px', fontWeight: '700'
        }}>
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
            display: 'flex', alignItems: 'center', gap: '14px',
          }}
        >
          {/* Avatar */}
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'linear-gradient(45deg, var(--primary), var(--secondary))',
            padding: '2px', flexShrink: 0
          }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: '#190e25', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {friend.photoURL ? (
                <img
                  src={friend.photoURL}
                  alt={friend.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                renderAvatarSVG(friend.skin, friend.hair, friend.accessory, friend.outfit)
              )}
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '2px' }}>
              {friend.name || 'AuraVoice User'}
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {friend.lang || 'Hindi'} · {friend.bio || 'AuraVoice member'}
            </p>
          </div>

          {/* Unfollow Button */}
          <button
            onClick={() => handleUnfollow(friend.uid)}
            style={{
              background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.2)',
              borderRadius: '12px', padding: '8px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '11px', color: '#e53935', fontWeight: '600',
              flexShrink: 0
            }}
          >
            <UserMinus size={13} /> Unfollow
          </button>
        </div>
      ))}

      {/* Friends count footer */}
      <div style={{
        textAlign: 'center', padding: '10px',
        fontSize: '12px', color: 'var(--text-secondary)'
      }}>
        <UserCheck size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
        Following {following.length} voice room host{following.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
