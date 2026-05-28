import AgoraRTC from 'agora-rtc-sdk-ng';

const AGORA_APP_ID = "f0b91e8073394a6eb89f91f86ea10a34";

const TOKEN_SERVER_URL =
  import.meta.env.VITE_TOKEN_SERVER_URL || 'http://localhost:5000';

// ── Module-level refs ─────────────────────────────────────────────────────────
let rtcClient        = null;
let localAudioTrack  = null;
let localVideoTrack  = null;

// ── Token fetch ───────────────────────────────────────────────────────────────
const fetchToken = async (channelName) => {
  try {
    const res = await fetch(`${TOKEN_SERVER_URL}/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelName, uid: 0 }),
    });
    if (!res.ok) throw new Error(`Token server responded ${res.status}`);
    const data = await res.json();
    return data.token;
  } catch (err) {
    console.warn('Token server unreachable, falling back to null token (dev only):', err);
    return null;
  }
};

// ── Create a fresh RTC client ─────────────────────────────────────────────────
const createClient = () => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

// ──────────────────────────────────────────────────────────────────────────────
// VOICE CHANNEL
// ──────────────────────────────────────────────────────────────────────────────
export const joinVoiceChannel = async (channelName) => {
  if (rtcClient) {
    try { await rtcClient.leave(); } catch (_) {}
    rtcClient = null;
  }

  rtcClient = createClient();

  rtcClient.on('user-published', async (user, mediaType) => {
    await rtcClient.subscribe(user, mediaType);
    if (mediaType === 'audio') user.audioTrack?.play();
  });

  const token = await fetchToken(channelName);
  const uid   = await rtcClient.join(AGORA_APP_ID, channelName, token, null);

  try {
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    await rtcClient.publish(localAudioTrack);
  } catch (err) {
    console.warn('Mic unavailable:', err);
  }

  return { uid, client: rtcClient };
};

export const setLocalMicMute = async (mute) => {
  if (localAudioTrack) await localAudioTrack.setEnabled(!mute);
};

export const leaveVoiceChannel = async () => {
  localAudioTrack?.stop();
  localAudioTrack?.close();
  localAudioTrack = null;
  localVideoTrack?.stop();
  localVideoTrack?.close();
  localVideoTrack = null;
  if (rtcClient) {
    await rtcClient.leave();
    rtcClient = null;
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// VIDEO CALL  (separate client lifecycle, same cleanup)
// ──────────────────────────────────────────────────────────────────────────────

/** callbacks: { onRemoteVideoTrack(track), onRemoteLeft() } */
export const joinVideoChannel = async (channelName, callbacks = {}) => {
  if (rtcClient) {
    try { await rtcClient.leave(); } catch (_) {}
    rtcClient = null;
  }

  rtcClient = createClient();

  rtcClient.on('user-published', async (user, mediaType) => {
    await rtcClient.subscribe(user, mediaType);
    if (mediaType === 'video' && callbacks.onRemoteVideoTrack) {
      callbacks.onRemoteVideoTrack(user.videoTrack);
    }
    if (mediaType === 'audio') user.audioTrack?.play();
  });

  rtcClient.on('user-unpublished', (user, mediaType) => {
    if (mediaType === 'video' && callbacks.onRemoteLeft) callbacks.onRemoteLeft();
  });

  rtcClient.on('user-left', () => {
    if (callbacks.onRemoteLeft) callbacks.onRemoteLeft();
  });

  const token = await fetchToken(channelName);
  const uid   = await rtcClient.join(AGORA_APP_ID, channelName, token, null);

  // Publish camera + mic
  try {
    [localAudioTrack, localVideoTrack] =
      await AgoraRTC.createMicrophoneAndCameraTracks();
    await rtcClient.publish([localAudioTrack, localVideoTrack]);
  } catch (err) {
    console.warn('Camera/mic unavailable:', err);
  }

  return { uid, client: rtcClient, localVideoTrack };
};

export const setVideoMicMute = async (mute) => {
  if (localAudioTrack) await localAudioTrack.setEnabled(!mute);
};

export const setCameraEnabled = async (enabled) => {
  if (localVideoTrack) await localVideoTrack.setEnabled(enabled);
};

export const getLocalVideoTrack = () => localVideoTrack;

export const leaveVideoChannel = async () => leaveVoiceChannel(); // same cleanup
