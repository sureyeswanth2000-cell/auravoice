/**
 * AuraVoice Leaderboard
 * Tabs: Top Gifters (coins spent) · Top Hosts (rooms created) · Top Earners (coins balance)
 * Data is read live from Firestore users collection.
 */
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import { renderAvatarSVG } from './mockData';
import { Trophy, Crown, Star, Zap, TrendingUp } from 'lucide-react';

const TABS = [
  { id: 'gifters',  label: '💝 Top Gifters',  icon: <Crown size={14} />,     field: 'coinsSpent',  fallback: 0 },
  { id: 'earners',  label: '🪙 Rich List',    icon: <Star size={14} />,      field: 'coins',       fallback: 100 },
  { id: 'active',   label: '🎙️ Top Hosts',   icon: <Zap size={14} />,       field: 'roomsHosted', fallback: 0 },
];

const RANK_COLORS  = ['#ffd700', '#c0c0c0', '#cd7f32'];
const RANK_LABELS  = ['🥇', '🥈', '🥉'];
const RANK_GLOWS   = [
  'rgba(255,215,0,0.15)',
  'rgba(192,192,192,0.1)',
  'rgba(205,127,50,0.1)',
];

export default function Leaderboard({ userProfile }) {
  const [activeTab, setActiveTab] = useState('gifters');
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);

  const currentUser = auth.currentUser;

  useEffect(() => {
    setLoading(true);
    const tab      = TABS.find(t => t.id === activeTab);
    const usersRef = collection(db, 'users');

    // Query top 50 users sorted by the current tab's field
    const q = query(usersRef, orderBy(`profile.${tab.field}`, 'desc'), limit(50));
    
    // Fallback: if the ordered field doesn't exist on all docs, onSnapshot may
    // return fewer results — that's fine for MVP
    const unsub = onSnapshot(q,
      snap => {
        const list = [];
        snap.forEach(d => {
          const data = d.data();
          const profile = data.profile || {};
          const val = profile[tab.field] ?? tab.fallback;
          if (val > 0 || tab.id === 'earners') {
            list.push({
              uid: d.id,
              name: profile.name || 'AuraVoice User',
              skin: profile.skin, hair: profile.hair,
              accessory: profile.accessory, outfit: profile.outfit,
              photoURL: profile.photoURL || null,
              lang: profile.lang || 'Hindi',
              value: val,
            });
          }
        });
        // Sort client-side to guarantee order even with missing fields
        list.sort((a, b) => b.value - a.value);
        setUsers(list.slice(0, 20));
        setLoading(false);
      },
      () => {
        // Firestore index might not exist yet for sorting — fallback to unordered
        const q2 = query(usersRef, limit(50));
        onSnapshot(q2, snap => {
          const list = [];
          const tab2 = TABS.find(t => t.id === activeTab);
          snap.forEach(d => {
            const data = d.data();
            const profile = data.profile || {};
            list.push({
              uid: d.id,
              name: profile.name || 'AuraVoice User',
              skin: profile.skin, hair: profile.hair,
              accessory: profile.accessory, outfit: profile.outfit,
              photoURL: profile.photoURL || null,
              lang: profile.lang || 'Hindi',
              value: profile[tab2.field] ?? tab2.fallback,
            });
          });
          list.sort((a, b) => b.value - a.value);
          setUsers(list.slice(0, 20));
          setLoading(false);
        });
      }
    );
    return () => unsub();
  }, [activeTab]);

  const tab = TABS.find(t => t.id === activeTab);
  
  const formatValue = (val) => {
    if (activeTab === 'gifters') return `🎁 ${val.toLocaleString()} coins gifted`;
    if (activeTab === 'earners') return `🪙 ${val.toLocaleString()} coins`;
    if (activeTab === 'active')  return `🎙️ ${val} room${val !== 1 ? 's' : ''} hosted`;
    return val;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 10px',
          background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,46,147,0.2))',
          border: '2px solid rgba(255,215,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Trophy size={28} color="#ffd700" />
        </div>
        <h2 style={{
          fontSize: '20px', fontWeight: '800',
          background: 'linear-gradient(90deg, #ffd700, #ff2e93)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          AuraVoice Leaderboard
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Who's ruling the AuraVoice community?
        </p>
      </div>

      {/* Tab selector */}
      <div style={{
        display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.04)',
        padding: '5px', borderRadius: '16px', border: '1px solid var(--glass-border)'
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, padding: '8px 4px', borderRadius: '12px', border: 'none',
              background: activeTab === t.id
                ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                : 'transparent',
              color: activeTab === t.id ? '#fff' : 'var(--text-secondary)',
              fontSize: '11px', fontWeight: '700', cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,215,0,0.2)', borderTopColor: '#ffd700', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {/* Podium — Top 3 */}
      {!loading && users.length >= 3 && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr',
          gap: '8px', alignItems: 'flex-end', margin: '4px 0'
        }}>
          {/* 2nd place */}
          <PodiumCard user={users[1]} rank={2} currentUid={currentUser?.uid} />
          {/* 1st place */}
          <PodiumCard user={users[0]} rank={1} currentUid={currentUser?.uid} />
          {/* 3rd place */}
          <PodiumCard user={users[2]} rank={3} currentUid={currentUser?.uid} />
        </div>
      )}

      {/* Rest of the list */}
      {!loading && users.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '20px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏆</div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '6px' }}>Be the First!</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Send gifts in voice rooms or host your own rooms to appear on the leaderboard!
          </p>
        </div>
      )}

      {!loading && users.length > 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.5px' }}>
            REMAINING RANKS
          </p>
          {users.slice(3).map((user, i) => {
            const rank = i + 4;
            const isMe = user.uid === currentUser?.uid;
            return (
              <div
                key={user.uid}
                style={{
                  background: isMe ? 'rgba(255,46,147,0.06)' : 'var(--glass-bg)',
                  border: `1px solid ${isMe ? 'rgba(255,46,147,0.3)' : 'var(--glass-border)'}`,
                  borderRadius: '16px', padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}
              >
                <span style={{
                  width: '28px', textAlign: 'center', fontSize: '14px',
                  fontWeight: '800', color: 'var(--text-secondary)', flexShrink: 0
                }}>
                  #{rank}
                </span>

                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: 'linear-gradient(45deg, var(--primary), var(--secondary))',
                  padding: '2px', flexShrink: 0
                }}>
                  <div style={{
                    width: '100%', height: '100%', borderRadius: '50%',
                    background: '#190e25', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {user.photoURL
                      ? <img src={user.photoURL} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : renderAvatarSVG(user.skin, user.hair, user.accessory, user.outfit)
                    }
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: isMe ? 'var(--primary)' : '#fff' }}>
                    {user.name} {isMe ? '(You)' : ''}
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {formatValue(user.value)}
                  </p>
                </div>

                {isMe && (
                  <span style={{
                    fontSize: '10px', background: 'rgba(255,46,147,0.15)',
                    color: 'var(--primary)', padding: '3px 8px', borderRadius: '8px', fontWeight: '700'
                  }}>YOU</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CTA to climb ranks */}
      <div style={{
        background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)',
        borderRadius: '18px', padding: '14px 16px', textAlign: 'center'
      }}>
        <TrendingUp size={16} color="#ffd700" style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Gift more in Voice Rooms & host live to climb the ranks!
        </span>
      </div>
    </div>
  );
}

// ── Podium Card (top 3) ───────────────────────────────────────────────────────
function PodiumCard({ user, rank, currentUid }) {
  const isMe = user?.uid === currentUid;
  const height = rank === 1 ? '120px' : rank === 2 ? '100px' : '88px';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      {/* Crown + badge */}
      <div style={{ fontSize: rank === 1 ? '22px' : '18px' }}>{RANK_LABELS[rank - 1]}</div>

      {/* Avatar */}
      <div style={{
        width: rank === 1 ? '68px' : '54px',
        height: rank === 1 ? '68px' : '54px',
        borderRadius: '50%',
        background: `linear-gradient(45deg, ${RANK_COLORS[rank - 1]}, var(--primary))`,
        padding: '2.5px',
        boxShadow: `0 0 20px ${RANK_GLOWS[rank - 1]}`,
      }}>
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%',
          background: '#190e25', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {user?.photoURL
            ? <img src={user.photoURL} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : renderAvatarSVG(user?.skin, user?.hair, user?.accessory, user?.outfit)
          }
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize: '11px', fontWeight: '800',
          color: isMe ? 'var(--primary)' : '#fff',
          lineHeight: '1.2'
        }}>
          {user?.name?.slice(0, 10) || '—'}
        </p>
      </div>

      {/* Podium block */}
      <div style={{
        width: '100%', height,
        background: `linear-gradient(180deg, ${RANK_GLOWS[rank - 1]}, rgba(14,8,24,0.5))`,
        border: `1px solid ${RANK_COLORS[rank - 1]}40`,
        borderRadius: '12px 12px 6px 6px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '8px',
      }}>
        <span style={{
          fontSize: '11px', fontWeight: '800', color: RANK_COLORS[rank - 1]
        }}>#{rank}</span>
      </div>
    </div>
  );
}
