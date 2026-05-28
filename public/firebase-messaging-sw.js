/* AuraVoice Firebase Cloud Messaging Service Worker */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// NOTE: These are public Firebase web config values (safe to expose in SW)
firebase.initializeApp({
  apiKey:            'AIzaSyAGbFy1lR4uwDwn0i41MN-d411ZA3MEuw0',
  authDomain:        'frndclone.firebaseapp.com',
  projectId:         'frndclone',
  storageBucket:     'frndclone.firebasestorage.app',
  messagingSenderId: '50779038239',
  appId:             '1:50779038239:web:37d4be9c60216a0c08ab2a',
  measurementId:     'G-N6ELBKQWB0',
});

const messaging = firebase.messaging();

// Handle background push messages
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'AuraVoice 🎤', {
    body: body || 'Something new is happening!',
    icon: icon || '/favicon.svg',
    badge: '/favicon.svg',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    tag: 'auravoice-notification',
  });
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
