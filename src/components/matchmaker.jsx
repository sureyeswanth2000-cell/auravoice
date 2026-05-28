import React, { useState, useEffect, useRef } from 'react';
import { renderAvatarSVG } from './mockData';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, where, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { joinVoiceChannel, leaveVoiceChannel, setLocalMicMute } from '../agora';
import { Sparkles, Phone, PhoneOff, Mic, Volume2, MessageSquare, Flame, HelpCircle, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

const ICEBREAKERS = [
  "If you had to listen to one singer forever — A.R. Rahman or Arijit Singh? 🎤",
  "What is the funniest nickname you've ever been given by friends?",
  "What was your first impression of my avatar? 😉",
  "Favourite Indian street food you could eat every single day? 🍦",
  "Mountains or beaches for a free vacation right now? ⛰️🏖️",
  "Tell me one slang word from your hometown and what it means!",
  "What's the last show you binge-watched and couldn't stop? 📺",
  "If you could have dinner with any Bollywood actor, who? 🍽️",
];

const VIBE_REASONS = [
  { hobby: 'Both love Retro Bollywood & Shayari 📻',      compatibility: '98% Vibe Match' },
  { hobby: 'Both speak the same language fluently 🗣️',   compatibility: '94% Language Fit' },
  { hobby: 'Both are Late Night Chai Lovers ☕',           compatibility: '96% Vibe Match'  },
  { hobby: 'Both love playing Ludo & Tic-Tac-Toe 🎯',    compatibility: '92% Vibe Match'  },
];

export default function Matchmaker({ userProfile }) {
  const [matchingState, setMatchingState] = useState('idle'); // idle | searching | connected | notfound
  const [matchedPartner, setMatchedPartner] = useState(null);
  const [callTimer, setCallTimer]           = useState(0);
  const [callActive, setCallActive]         = useState(false);
  const [micMuted, setMicMuted]             = useState(false);
  const [activeChannel, setActiveChannel]   = useState('');
  const [activeIcebreaker, setActiveIcebreaker] = useState(ICEBREAKERS[0]);
  const [vibeReason, setVibeReason]             = useState(VIBE_REASONS[0]);
  const [queueCount, setQueueCount]             = useState(0); // real searching users

  // Firestore refs
  const queueDocRef       = useRef(null);
  const unsubscribeQueue  = useRef(null);
  const unsubscribeCall   = useRef(null);
  const unsubscribeCallDoc = useRef(null);
  const isConnectedRef    = useRef(false);
  const botFallbackRef    = useRef(null);

  // ── Start matchmaking ─────────────────────────────────────────────────────
  const handleStartSearch = async () => {
    setMatchingState('searching');
    setMicMuted(false);
    isConnectedRef.current = false;
    setQueueCount(0);

    try {
      const qRef = collection(db, 'frnd_queue');
      const userPayload = {
        name:      userProfile.name,
        lang:      userProfile.lang,
        skin:      userProfile.skin,
        hair:      userProfile.hair,
        accessory: userProfile.accessory,
        outfit:    userProfile.outfit,
        uid:       auth.currentUser?.uid || 'guest',
        status:    'waiting',
        timestamp: Date.now(),
      };

      const newDoc = await addDoc(qRef, userPayload);
      queueDocRef.current = newDoc;

      // ── 30-second timeout: no match found ──────────────────────────────
      botFallbackRef.current = setTimeout(() => {
        if (!isConnectedRef.current) {
          cleanupQueueRefs();
          setMatchingState('notfound');
        }
      }, 30000);

      // ── Watch all waiting users ────────────────────────────────────────
      const q = query(collection(db, 'frnd_queue'), where('status', '==', 'waiting'));
      unsubscribeQueue.current = onSnapshot(q, async snapshot => {
        if (isConnectedRef.current) return;

        const others = [];
        snapshot.forEach(d => {
          if (d.id !== newDoc.id) others.push({ id: d.id, ...d.data() });
        });
        setQueueCount(others.length);

        if (others.length > 0) {
          const peer = others[0];
          isConnectedRef.current = true;
          clearTimeout(botFallbackRef.current);
          if (unsubscribeQueue.current) unsubscribeQueue.current();

          const channelId = `match-${newDoc.id.slice(0,5)}-${peer.id.slice(0,5)}`;
          await setDoc(doc(db, 'frnd_calls', channelId), {
            userA: userPayload, userB: peer, channelName: channelId, createdAt: Date.now(),
          });
          await updateDoc(doc(db, 'frnd_queue', newDoc.id),  { status: 'matched', room: channelId });
          await updateDoc(doc(db, 'frnd_queue', peer.id), { status: 'matched', room: channelId });

          connectCall(peer, channelId);
        }
      });

      // ── Watch my own doc (someone else may pair me) ────────────────────
      unsubscribeCall.current = onSnapshot(doc(db, 'frnd_queue', newDoc.id), docSnap => {
        if (isConnectedRef.current) return;
        const data = docSnap.data();
        if (data?.status === 'matched' && data.room) {
          isConnectedRef.current = true;
          clearTimeout(botFallbackRef.current);
          if (unsubscribeQueue.current) unsubscribeQueue.current();

          const unsub = onSnapshot(doc(db, 'frnd_calls', data.room), callSnap => {
            const callData = callSnap.data();
            if (callData) {
              unsub();
              const peer = callData.userA.uid === auth.currentUser?.uid ? callData.userB : callData.userA;
              connectCall(peer, data.room);
            }
          });
          unsubscribeCallDoc.current = unsub;
        }
      });

    } catch (err) {
      console.warn('Matchmaking queue error:', err);
      cleanupQueueRefs();
      setMatchingState('notfound');
    }
  };

  // ── Connect Agora call ────────────────────────────────────────────────────
  const connectCall = async (peerInfo, channelName) => {
    setMatchedPartner(peerInfo);
    setMatchingState('connected');
    setCallActive(true);
    setCallTimer(0);
    setActiveChannel(channelName);
    setVibeReason(VIBE_REASONS[Math.floor(Math.random() * VIBE_REASONS.length)]);
    setActiveIcebreaker(ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)]);
    try { await joinVoiceChannel(channelName); } catch (e) { console.warn('Agora join failed:', e); }
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

  // ── End call ─────────────────────────────────────────────────────────────
  const handleEndCall = async () => {
    setCallActive(false);
    setMatchingState('idle');
    setMatchedPartner(null);
    isConnectedRef.current = false; // ← critical: allow next search
    cleanupQueueRefs();
    await leaveVoiceChannel();
  };

  const handleToggleMute = async () => {
    const next = !micMuted;
    setMicMuted(next);
    await setLocalMicMute(next);
  };

  const cleanupQueueRefs = async () => {
    clearTimeout(botFallbackRef.current);
    if (unsubscribeQueue.current)   { unsubscribeQueue.current();   unsubscribeQueue.current   = null; }
    if (unsubscribeCall.current)    { unsubscribeCall.current();    unsubscribeCall.current    = null; }
    if (unsubscribeCallDoc.current) { unsubscribeCallDoc.current(); unsubscribeCallDoc.current = null; }
    try {
      if (queueDocRef.current) { await deleteDoc(queueDocRef.current); queueDocRef.current = null; }
    } catch (_) {}
  };

  const getNewIcebreaker = () => {
    const rest = ICEBREAKERS.filter(q => q !== activeIcebreaker);
    setActiveIcebreaker(rest[Math.floor(Math.random() * rest.length)]);
    confetti({ particleCount: 15, spread: 30, origin: { y: 0.75 } });
  };

  const formatTime = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  useEffect(() => {
    let interval;
    if (callActive) interval = setInterval(() => setCallTimer(p => p + 1), 1000);
    return () => clearInterval(interval);
  }, [callActive]);

  useEffect(() => () => { cleanupQueueRefs(); leaveVoiceChannel(); }, []);

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>

      {/* IDLE */}
      {matchingState === 'idle' && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(255,46,147,0.1)', padding: '20px', borderRadius: '50%', border: '2px solid rgba(255,46,147,0.2)' }}>
            <Sparkles size={48} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', background: 'linear-gradient(90deg, #ff2e93, #8b3cff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
              Instant Voice Match
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px', margin: '0 auto', lineHeight: '1.4' }}>
              Get matched with a real person speaking your language — anonymous, safe & instant.
            </p>
          </div>
          <div style={{ width: '100%', padding: '14px 16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>YOUR LANGUAGE</div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)' }}>🗣️ {userProfile.lang || 'Hindi, English'}</div>
          </div>
          <button onClick={handleStartSearch} className="frnd-btn" style={{ width: '100%', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Phone size={18} /> Start Voice Match
          </button>
        </div>
      )}

      {/* SEARCHING */}
      {matchingState === 'searching' && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="radar-container">
            <div className="radar-scanner" />
            <div className="radar-circle" /><div className="radar-circle" /><div className="radar-circle" />
            <div style={{ position: 'absolute', width: '74px', height: '74px', borderRadius: '50%', background: 'var(--dark-surface)', border: '2px solid var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
              <div className="rj-avatar" style={{ background: '#190e25' }}>
                {renderAvatarSVG(userProfile.skin, userProfile.hair, userProfile.accessory, userProfile.outfit)}
              </div>
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Finding Your Match...</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {queueCount > 0 ? `🟢 ${queueCount} other${queueCount > 1 ? 's' : ''} searching right now` : 'Waiting for someone to search...'}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', opacity: 0.7 }}>Will stop after 30 seconds if no one found</p>
          </div>
          <button onClick={async () => { await cleanupQueueRefs(); setMatchingState('idle'); }} className="frnd-btn-secondary" style={{ padding: '10px 24px', borderRadius: '12px' }}>
            Cancel
          </button>
        </div>
      )}

      {/* NOT FOUND */}
      {matchingState === 'notfound' && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '64px' }}>😔</div>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '800' }}>No Match Found</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
              No one is searching right now. Try again in a few minutes or join a Voice Room instead!
            </p>
          </div>
          <button onClick={handleStartSearch} className="frnd-btn" style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <RefreshCw size={16} /> Try Again
          </button>
          <button onClick={() => setMatchingState('idle')} className="frnd-btn-secondary" style={{ width: '100%', padding: '12px', borderRadius: '14px' }}>
            Back
          </button>
        </div>
      )}

      {/* CONNECTED */}
      {matchingState === 'connected' && matchedPartner && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', padding: '10px 0', gap: '12px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', background: 'rgba(0,230,118,0.12)', color: '#00e676', border: '1px solid rgba(0,230,118,0.2)', padding: '4px 10px', borderRadius: '99px', fontWeight: '700' }}>
              ● Live Call
            </span>
            <div style={{ fontSize: '20px', fontWeight: '800' }}>{formatTime(callTimer)}</div>
          </div>

          {/* Vibe card */}
          <div style={{ background: 'rgba(139,60,255,0.08)', border: '1px solid rgba(139,60,255,0.25)', padding: '10px 14px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={16} color="var(--primary)" fill="var(--primary)" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#fff' }}>{vibeReason.hobby}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>AI matched you based on your profile</div>
              </div>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '800', background: 'rgba(255,184,0,0.12)', padding: '4px 8px', borderRadius: '8px' }}>
              {vibeReason.compatibility}
            </span>
          </div>

          {/* Avatars */}
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '8px 0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(45deg, var(--primary), var(--secondary))', padding: '2px' }}>
                <div className="rj-avatar" style={{ background: '#190e25' }}>
                  {renderAvatarSVG(userProfile.skin, userProfile.hair, userProfile.accessory, userProfile.outfit)}
                </div>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700' }}>{userProfile.name}</span>
              <span style={{ fontSize: '10px', color: micMuted ? '#e53935' : '#00e676', fontWeight: '700' }}>{micMuted ? '🔇 Muted' : '🎙️ Live'}</span>
            </div>

            <div style={{ display: 'flex', gap: '3px', height: '18px', alignItems: 'center' }}>
              <span className="voice-wave"><span/><span/><span/><span/><span/></span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(45deg, var(--secondary), #00bcd4)', padding: '2px' }}>
                <div className="rj-avatar" style={{ background: '#190e25' }}>
                  {renderAvatarSVG(matchedPartner.skin, matchedPartner.hair, matchedPartner.accessory, matchedPartner.outfit)}
                </div>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700' }}>{matchedPartner.name}</span>
              <span style={{ fontSize: '10px', color: '#00e676', fontWeight: '700' }}>🎙️ Live</span>
            </div>
          </div>

          {/* Icebreaker */}
          <div style={{ background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.15)', padding: '12px 14px', borderRadius: '18px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', alignItems: 'center', fontSize: '11px', color: 'var(--accent)', fontWeight: '800', marginBottom: '8px' }}>
              <HelpCircle size={12} /> ICEBREAKER
            </div>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#fff', lineHeight: '1.4' }}>"{activeIcebreaker}"</p>
            <button onClick={getNewIcebreaker} className="frnd-btn-secondary"
              style={{ marginTop: '8px', alignSelf: 'center', padding: '4px 12px', fontSize: '10px', borderRadius: '8px', borderStyle: 'dashed', color: 'var(--accent)', borderColor: 'rgba(255,184,0,0.3)' }}>
              🎲 New Question
            </button>
          </div>

          {/* Call controls */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
            <button onClick={handleToggleMute} className="frnd-btn-secondary"
              style={{ width: '52px', height: '52px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: micMuted ? 'rgba(229,57,53,0.15)' : 'transparent', borderColor: micMuted ? 'rgba(229,57,53,0.4)' : 'var(--glass-border)' }}>
              <Mic size={20} color={micMuted ? '#e53935' : '#fff'} />
            </button>
            <button onClick={handleEndCall} className="frnd-btn"
              style={{ width: '52px', height: '52px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e53935', boxShadow: '0 8px 24px rgba(229,57,53,0.4)' }}>
              <PhoneOff size={20} color="#fff" />
            </button>
            <button className="frnd-btn-secondary"
              style={{ width: '52px', height: '52px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Volume2 size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
