import AgoraRTC from 'agora-rtc-sdk-ng';

const AGORA_APP_ID = "f0b91e8073394a6eb89f91f86ea10a34";

// Your deployed token server URL.
// During local dev it points to localhost; in production swap to your hosted URL.
const TOKEN_SERVER_URL =
  import.meta.env.VITE_TOKEN_SERVER_URL || 'http://localhost:5000';

// Module-level refs — reset on every leave so re-join is clean
let rtcClient = null;
let localAudioTrack = null;

/**
 * Fetch a signed Agora RTC token from the backend token server.
 * Falls back to null (App-ID-only mode) if the server is unreachable so that
 * local development still works without the server running.
 */
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
    console.warn('Could not reach token server, falling back to null token (dev only):', err);
    return null; // null = App-ID-only mode — works only when certificate is disabled
  }
};

export const joinVoiceChannel = async (channelName) => {
  // Always create a fresh client to prevent stacked event listeners
  if (rtcClient) {
    try { await rtcClient.leave(); } catch (_) {}
    rtcClient = null;
  }

  rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

  // Subscribe to remote audio when a peer publishes
  rtcClient.on('user-published', async (user, mediaType) => {
    await rtcClient.subscribe(user, mediaType);
    if (mediaType === 'audio') {
      user.audioTrack.play();
    }
  });

  // Fetch signed token from the backend before joining
  const token = await fetchToken(channelName);

  // Join channel with the signed token (uid 0 = let Agora assign one)
  const uid = await rtcClient.join(AGORA_APP_ID, channelName, token, null);

  // Publish local microphone
  try {
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    await rtcClient.publish(localAudioTrack);
  } catch (err) {
    console.warn('Microphone not available or permission denied:', err);
  }

  return { uid, client: rtcClient };
};

export const setLocalMicMute = async (mute) => {
  if (localAudioTrack) {
    await localAudioTrack.setEnabled(!mute);
  }
};

export const leaveVoiceChannel = async () => {
  if (localAudioTrack) {
    localAudioTrack.stop();
    localAudioTrack.close();
    localAudioTrack = null;
  }
  if (rtcClient) {
    await rtcClient.leave();
    rtcClient = null; // reset so next join gets fresh client
  }
};
