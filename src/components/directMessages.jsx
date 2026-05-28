/**
 * AuraVoice Direct Messages (DMs)
 * 
 * Firestore structure:
 *   chats/{chatId}           — chatId = sorted UIDs joined by "_"
 *     participants: [uid1, uid2]
 *     lastMessage: string
 *     lastAt: timestamp
 *     names: { uid1: name, uid2: name }
 *     photos: { uid1: photoURL, uid2: photoURL }
 *   chats/{chatId}/messages/{msgId}
 *     sender: uid
 *     senderName: string
 *     text: string
 *     createdAt: serverTimestamp
 */
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import {
  collection, doc, onSnapshot, addDoc, setDoc,
  orderBy, query, serverTimestamp, limit
} from 'firebase/firestore';
import { renderAvatarSVG } from './mockData';
import { Send, MessageCircle, ArrowLeft, Video } from 'lucide-react';

// Helper: deterministic chat ID from two UIDs
const chatId = (a, b) => [a, b].sort().join('_');

export default function DirectMessages({ userProfile, onStartVideoCall, initialThread, onThreadOpened }) {
  const [view, setView]             = useState('list'); // 'list' | 'thread'
  const [activeChat, setActiveChat] = useState(null); // { chatId, peerName, peerPhoto, peerProfile }
  const [chats, setChats]         = useState([]);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const chatEndRef = useRef(null);

  const currentUser = auth.currentUser;

  // Auto-open thread if deep-linked from Friends tab
  useEffect(() => {
    if (initialThread && initialThread.chatId) {
      setActiveChat(initialThread);
      setView('thread');
      setMessages([]);
      onThreadOpened?.();
    }
  }, [initialThread]);

  // ── Listen to all my chats ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const chatsRef = collection(db, 'chats');
    // Real-time listener on all chats (filter client-side)
    const unsub = onSnapshot(chatsRef, snap => {
      const myChats = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.participants?.includes(currentUser.uid)) {
          myChats.push({ id: d.id, ...data });
        }
      });
      myChats.sort((a, b) => (b.lastAt?.seconds || 0) - (a.lastAt?.seconds || 0));
      setChats(myChats);
    });
    return () => unsub();
  }, [currentUser?.uid]);

  // ── Listen to messages in active thread ────────────────────────────────────
  useEffect(() => {
    if (!activeChat) return;
    const msgsRef = collection(db, 'chats', activeChat.chatId, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'), limit(200));
    const unsub = onSnapshot(q, snap => {
      const msgs = [];
      snap.forEach(d => msgs.push({ id: d.id, ...d.data() }));
      setMessages(msgs);
    });
    return () => unsub();
  }, [activeChat?.chatId]);

  // ── Auto scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send a message ──────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || !activeChat || !currentUser || sending) return;
    setSending(true);

    const cid = activeChat.chatId;
    const text = input.trim();
    setInput('');

    try {
      // Write message
      await addDoc(collection(db, 'chats', cid, 'messages'), {
        sender: currentUser.uid,
        senderName: userProfile.name,
        text,
        createdAt: serverTimestamp(),
      });

      // Update chat metadata (last message preview + timestamp)
      await setDoc(doc(db, 'chats', cid), {
        participants: [currentUser.uid, activeChat.peerUid],
        lastMessage: text.length > 60 ? text.slice(0, 60) + '…' : text,
        lastAt: serverTimestamp(),
        names: {
          [currentUser.uid]: userProfile.name,
          [activeChat.peerUid]: activeChat.peerName,
        },
        photos: {
          [currentUser.uid]: userProfile.photoURL || null,
          [activeChat.peerUid]: activeChat.peerPhoto || null,
        },
      }, { merge: true });
    } catch (err) {
      console.warn('DM send failed:', err);
    } finally {
      setSending(false);
    }
  };

  const openThread = (chat) => {
    if (!currentUser) return;
    const peerUid = chat.participants.find(u => u !== currentUser.uid);
    const peerName = chat.names?.[peerUid] || 'AuraVoice User';
    const peerPhoto = chat.photos?.[peerUid] || null;
    setActiveChat({ chatId: chat.id, peerUid, peerName, peerPhoto });
    setView('thread');
    setMessages([]);
  };

  // ── CHAT LIST VIEW ──────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{
            fontSize: '18px', fontWeight: '800',
            background: 'linear-gradient(90deg, #ff2e93, #8b3cff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <MessageCircle size={20} color="#ff2e93" style={{ WebkitTextFillColor: '#ff2e93' }} />
            Messages
          </h2>
          <span style={{
            fontSize: '11px', color: 'var(--text-secondary)',
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            padding: '4px 10px', borderRadius: '20px'
          }}>
            {chats.length} conversation{chats.length !== 1 ? 's' : ''}
          </span>
        </div>

        {chats.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '50px 20px',
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            borderRadius: '24px'
          }}>
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>💬</div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', marginBottom: '8px' }}>No Messages Yet</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Follow a host in a Voice Room, then tap <strong>Message</strong> in the Friends tab to start chatting!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {chats.map(chat => {
              const peerUid  = chat.participants?.find(u => u !== currentUser?.uid);
              const peerName = chat.names?.[peerUid] || 'AuraVoice User';
              const peerPhoto = chat.photos?.[peerUid];
              return (
                <div
                  key={chat.id}
                  onClick={() => openThread(chat)}
                  style={{
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    borderRadius: '20px', padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    cursor: 'pointer', transition: 'border-color 0.2s',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '50px', height: '50px', borderRadius: '50%',
                    background: 'linear-gradient(45deg, var(--primary), var(--secondary))',
                    padding: '2px', flexShrink: 0
                  }}>
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%',
                      background: '#190e25', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {peerPhoto ? (
                        <img src={peerPhoto} alt={peerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '20px' }}>👤</span>
                      )}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '3px' }}>{peerName}</h4>
                    <p style={{
                      fontSize: '12px', color: 'var(--text-secondary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {chat.lastMessage || 'Start a conversation…'}
                    </p>
                  </div>

                  <span style={{
                    fontSize: '11px', color: 'rgba(255,255,255,0.3)',
                    background: 'rgba(255,46,147,0.08)',
                    padding: '4px 10px', borderRadius: '10px'
                  }}>›</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── CHAT THREAD VIEW ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0' }}>
      {/* Thread Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        paddingBottom: '12px', borderBottom: '1px solid var(--glass-border)',
        marginBottom: '12px'
      }}>
        <button
          onClick={() => { setView('list'); setActiveChat(null); setMessages([]); }}
          style={{
            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
            borderRadius: '10px', padding: '6px 10px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', color: '#fff'
          }}
        >
          <ArrowLeft size={16} />
        </button>

        <div style={{
          width: '38px', height: '38px', borderRadius: '50%',
          background: 'linear-gradient(45deg, var(--primary), var(--secondary))',
          padding: '2px', flexShrink: 0
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: '#190e25', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
          }}>
            {activeChat?.peerPhoto
              ? <img src={activeChat.peerPhoto} alt={activeChat.peerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '16px' }}>👤</span>
            }
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700' }}>{activeChat?.peerName}</h4>
          <p style={{ fontSize: '11px', color: '#00e676' }}>● Online</p>
        </div>

        {/* Video call button */}
        <button
          onClick={() => onStartVideoCall?.(activeChat)}
          style={{
            background: 'rgba(139,60,255,0.15)', border: '1px solid rgba(139,60,255,0.3)',
            borderRadius: '10px', padding: '8px 12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            color: 'var(--secondary)', fontSize: '12px', fontWeight: '700'
          }}
        >
          <Video size={15} /> Video
        </button>
      </div>

      {/* Messages scroll area */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        gap: '8px', paddingBottom: '8px', minHeight: '240px', maxHeight: '55vh'
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
            👋 Say hi to {activeChat?.peerName}!
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.sender === currentUser?.uid;
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '78%', padding: '10px 14px', borderRadius: '18px',
                background: isMe
                  ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                  : 'rgba(255,255,255,0.06)',
                border: isMe ? 'none' : '1px solid var(--glass-border)',
                fontSize: '13px', lineHeight: '1.45', color: '#fff',
                borderBottomRightRadius: isMe ? '4px' : '18px',
                borderBottomLeftRadius: isMe ? '18px' : '4px',
              }}>
                {!isMe && (
                  <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '800', marginBottom: '3px' }}>
                    {msg.senderName}
                  </div>
                )}
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <input
          type="text"
          className="frnd-input"
          placeholder={`Message ${activeChat?.peerName}…`}
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ flex: 1, borderRadius: '14px', padding: '12px 16px' }}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="frnd-btn"
          style={{
            padding: '0 18px', borderRadius: '14px', boxShadow: 'none',
            opacity: !input.trim() || sending ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
