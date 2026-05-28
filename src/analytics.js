/**
 * AuraVoice Analytics Helper
 * Wraps Firebase Analytics logEvent with pre-defined events
 */
import { getAnalytics, logEvent } from 'firebase/analytics';
import app from './firebase';

// Initialize analytics (lazy — only in browser)
let analytics = null;
function getAnalyticsInstance() {
  if (!analytics && typeof window !== 'undefined') {
    try {
      analytics = getAnalytics(app);
    } catch (e) {
      // silently fail if analytics is blocked by browser
    }
  }
  return analytics;
}

/**
 * Track a custom event in Firebase Analytics
 * @param {string} eventName
 * @param {object} params
 */
export function track(eventName, params = {}) {
  try {
    const a = getAnalyticsInstance();
    if (a) logEvent(a, eventName, params);
  } catch (e) {
    // fail silently — analytics should never break the app
  }
}

// ─── Pre-defined event helpers ───────────────────────────────────────────────

export const Analytics = {
  roomCreated: (roomTitle, tag) =>
    track('room_created', { room_title: roomTitle, room_tag: tag }),

  roomJoined: (roomTitle, hostName) =>
    track('room_joined', { room_title: roomTitle, host_name: hostName }),

  matchStarted: (userLang) =>
    track('match_started', { user_language: userLang }),

  dailyRewardClaimed: (coinsTotal) =>
    track('daily_reward_claimed', { coins_total: coinsTotal }),

  taskClaimed: (taskId, reward) =>
    track('task_claimed', { task_id: taskId, reward_coins: reward }),

  profileSaved: (hasPhoto) =>
    track('profile_saved', { has_photo: hasPhoto }),

  photoUploaded: () =>
    track('profile_photo_uploaded'),

  followedHost: (hostName) =>
    track('host_followed', { host_name: hostName }),

  notificationEnabled: () =>
    track('push_notification_enabled'),

  loginSuccess: (method) =>
    track('login_success', { method }),
};
