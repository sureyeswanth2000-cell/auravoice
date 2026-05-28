const express = require('express');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const cors = require('cors');

const app = express();

// CORS — allow your Firebase Hosting domain + localhost for dev
app.use(cors({
  origin: [
    'https://frndclone.web.app',
    'https://frndclone.firebaseapp.com',
    'http://localhost:5173',
    'http://localhost:4173',
  ]
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;

// AuraVoice Agora App Configuration
const APP_ID          = process.env.AGORA_APP_ID          || 'f0b91e8073394a6eb89f91f86ea10a34';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '0abbeeff7d954952ad1c3ddeb318ffea';

app.get('/ping', (req, res) => {
  res.send({ status: 'ok', message: 'AuraVoice WebRTC Token Service is online!' });
});

/**
 * REST Endpoint to fetch temporary RTC authentication token
 * POST payload: { "channelName": "room-123", "uid": 0 }
 */
app.post('/generate-token', (req, res) => {
  const channelName = req.body.channelName;
  if (!channelName) {
    return res.status(400).json({ error: 'channelName is required' });
  }

  const uid = req.body.uid || 0; // 0 permits joining with any Agora UID
  const role = RtcRole.PUBLISHER; // Allow user to publish microphone stream

  // Set token expiration to 2 hours
  const expirationTimeInSeconds = 3600 * 2;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  if (APP_CERTIFICATE === 'YOUR_AGORA_APP_CERTIFICATE') {
    return res.status(500).json({ 
      error: 'Agora App Certificate is not configured. Please paste your secret certificate key from the Agora Console!' 
    });
  }

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );
    res.json({ token, channelName, uid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AuraVoice Agora Token Server running on port ${PORT}`);
});
