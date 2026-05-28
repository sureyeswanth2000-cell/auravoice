/**
 * AuraVoice 1-on-1 Video Call
 * Uses Agora RTC video track APIs.
 * - Local video rendered via AgoraRTC track.play()
 * - Remote video rendered via track callback
 */
import React, { useState, useEffect, useRef } from 'react';
import { joinVideoChannel, leaveVideoChannel, setVideoMicMute, setCameraEnabled } from '../agora';
import { Mic, MicOff, Video, VideoOff, PhoneOff, RotateCcw, Maximize2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function VideoCall({ channelName, peer, userProfile, onEnd }) {
  const [micMuted,       setMicMuted]       = useState(false);
  const [cameraOff,      setCameraOff]       = useState(false);
  const [callTimer,      setCallTimer]       = useState(0);
  const [hasRemoteVideo, setHasRemoteVideo]  = useState(false);
  const [remoteLeft,     setRemoteLeft]      = useState(false);
  const [connecting,     setConnecting]      = useState(true);
  const [fullscreen,     setFullscreen]      = useState(false);

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const localTrackRef  = useRef(null);

  // ── Join Agora video channel ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const start = async () => {
      try {
        const result = await joinVideoChannel(channelName, {
          onRemoteVideoTrack: (track) => {
            if (!mounted) return;
            setHasRemoteVideo(true);
            setConnecting(false);
            if (remoteVideoRef.current) {
              track.play(remoteVideoRef.current);
            }
          },
          onRemoteLeft: () => {
            if (!mounted) return;
            setHasRemoteVideo(false);
            setRemoteLeft(true);
          },
        });

        localTrackRef.current = result?.localVideoTrack;

        // Play own camera in local preview box
        if (result?.localVideoTrack && localVideoRef.current) {
          result.localVideoTrack.play(localVideoRef.current);
        }

        // If we joined first, show "waiting for peer" screen
        setConnecting(true);

        confetti({ particleCount: 40, spread: 50, origin: { y: 0.5 } });
      } catch (err) {
        console.warn('Video join failed:', err);
        setConnecting(false);
      }
    };

    start();

    return () => {
      mounted = false;
      leaveVideoChannel();
    };
  }, [channelName]);

  // ── Call timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setCallTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Hide "connecting" after 10s (peer joined via voice, video renders async)
  useEffect(() => {
    const t = setTimeout(() => setConnecting(false), 10000);
    return () => clearTimeout(t);
  }, []);

  const handleToggleMic = async () => {
    const next = !micMuted;
    setMicMuted(next);
    await setVideoMicMute(next);
  };

  const handleToggleCamera = async () => {
    const next = !cameraOff;
    setCameraOff(next);
    await setCameraEnabled(!next);
    // Hide/show local preview
    if (localVideoRef.current) {
      localVideoRef.current.style.display = next ? 'none' : 'block';
    }
  };

  const handleEndCall = async () => {
    await leaveVideoChannel();
    onEnd?.();
  };

  const formatTime = s => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#060412',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Remote video background */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg, #0e0818 0%, #190e25 100%)',
      }}>
        {/* Remote video element */}
        <div
          ref={remoteVideoRef}
          style={{
            width: '100%', height: '100%',
            display: hasRemoteVideo ? 'block' : 'none',
          }}
        />

        {/* Peer avatar when no remote video yet */}
        {!hasRemoteVideo && !remoteLeft && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '96px', height: '96px', borderRadius: '50%',
              background: 'linear-gradient(45deg, var(--primary), var(--secondary))',
              padding: '3px',
              animation: 'pulse 2s infinite ease-in-out',
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: '#190e25', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {peer?.peerPhoto ? (
                  <img src={peer.peerPhoto} alt={peer.peerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '40px' }}>👤</span>
                )}
              </div>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>
              {peer?.peerName || 'Connecting…'}
            </h3>
            <div style={{
              display: 'flex', gap: '8px',
              fontSize: '12px', color: 'rgba(255,255,255,0.5)'
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', animation: 'blink 1.2s infinite' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', animation: 'blink 1.2s 0.4s infinite' }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', animation: 'blink 1.2s 0.8s infinite' }} />
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Waiting for camera…</p>
          </div>
        )}

        {/* Remote left */}
        {remoteLeft && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '12px'
          }}>
            <div style={{ fontSize: '56px' }}>👋</div>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>{peer?.peerName || 'They'} left the call</h3>
            <button onClick={handleEndCall} className="frnd-btn" style={{ padding: '12px 28px', marginTop: '8px' }}>
              Close
            </button>
          </div>
        )}

        {/* Top bar overlay */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '11px', background: 'rgba(0,230,118,0.15)',
              color: '#00e676', border: '1px solid rgba(0,230,118,0.3)',
              padding: '4px 10px', borderRadius: '99px', fontWeight: '700'
            }}>
              ● Video Call
            </span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(callTimer)}
          </div>
        </div>

        {/* Local video PiP (picture-in-picture) */}
        <div style={{
          position: 'absolute', bottom: '90px', right: '16px',
          width: '90px', height: '124px', borderRadius: '16px',
          border: '2px solid rgba(255,255,255,0.15)',
          overflow: 'hidden', background: '#0e0818',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div
            ref={localVideoRef}
            style={{ width: '100%', height: '100%', display: cameraOff ? 'none' : 'block' }}
          />
          {cameraOff && (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.04)'
            }}>
              <VideoOff size={24} color="var(--text-secondary)" />
            </div>
          )}
          <div style={{
            position: 'absolute', bottom: '6px', left: 0, right: 0,
            textAlign: 'center', fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontWeight: '700'
          }}>
            You
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div style={{
        padding: '16px 20px 24px',
        background: 'rgba(14,8,24,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px'
      }}>
        {/* Mic */}
        <button
          onClick={handleToggleMic}
          style={{
            width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: micMuted ? 'rgba(229,57,53,0.15)' : 'rgba(255,255,255,0.08)',
            border: micMuted ? '1px solid rgba(229,57,53,0.4)' : '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {micMuted ? <MicOff size={22} color="#e53935" /> : <Mic size={22} color="#fff" />}
        </button>

        {/* End call */}
        <button
          onClick={handleEndCall}
          style={{
            width: '68px', height: '68px', borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: '#e53935',
            boxShadow: '0 8px 24px rgba(229,57,53,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <PhoneOff size={26} color="#fff" />
        </button>

        {/* Camera */}
        <button
          onClick={handleToggleCamera}
          style={{
            width: '56px', height: '56px', borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: cameraOff ? 'rgba(229,57,53,0.15)' : 'rgba(255,255,255,0.08)',
            border: cameraOff ? '1px solid rgba(229,57,53,0.4)' : '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {cameraOff ? <VideoOff size={22} color="#e53935" /> : <Video size={22} color="#fff" />}
        </button>
      </div>
    </div>
  );
}
