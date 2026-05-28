import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Firebase Messaging Service Worker (also handles PWA caching)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
      .then((reg) => {
        console.log('✅ AuraVoice SW registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('SW registration failed (non-critical):', err);
      });
  });
}
