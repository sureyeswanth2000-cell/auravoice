import React from 'react';

// ─── Avatar customization elements ───────────────────────────────────────────
export const AVATAR_ELEMENTS = {
  skin: [
    { name: 'Peach',      value: '#ffd1b3' },
    { name: 'Warm Gold',  value: '#e6a67e' },
    { name: 'Cocoa',      value: '#8c5333' },
    { name: 'Rose Petal', value: '#ffe8e0' },
  ],
  hair: [
    { name: 'Neon Pink',    value: '#ff2e93' },
    { name: 'Classic Black',value: '#1a1320' },
    { name: 'Chic Silver',  value: '#cbd5e1' },
    { name: 'Electric Blue',value: '#3b82f6' },
  ],
  accessories: [
    { name: 'None',        value: 'none'       },
    { name: 'Cool Shades', value: 'sunglasses' },
    { name: 'Flower Crown',value: 'crown'      },
    { name: 'Cat Ears',    value: 'ears'       },
  ],
  outfit: [
    { name: 'Neon Hoodie',  value: '#8b3cff' },
    { name: 'Rose Jacket',  value: '#ff2e93' },
    { name: 'Gold Sweater', value: '#ffb800' },
    { name: 'Teal Blazer',  value: '#14b8a6' },
  ],
};

// ─── SVG Avatar renderer ──────────────────────────────────────────────────────
export const renderAvatarSVG = (skin, hair, accessory, outfit) => (
  <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="46" fill="rgba(255,255,255,0.03)" />
    <rect x="44" y="65" width="12" height="15" fill={skin} rx="4" />
    <path d="M25 85 C 25 70, 75 70, 75 85" fill={outfit} stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
    <circle cx="50" cy="48" r="23" fill={skin} stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
    <circle cx="36" cy="52" r="3.5" fill="#ff7da9" opacity="0.6" />
    <circle cx="64" cy="52" r="3.5" fill="#ff7da9" opacity="0.6" />
    <circle cx="39" cy="46" r="3" fill="#1a1320" />
    <circle cx="61" cy="46" r="3" fill="#1a1320" />
    <circle cx="38" cy="45" r="1" fill="#fff" />
    <circle cx="60" cy="45" r="1" fill="#fff" />
    <path d="M 44 55 Q 50 60 56 55" fill="none" stroke="#b22c5e" strokeWidth="2" strokeLinecap="round" />
    <path d="M 49 48 Q 50 50 51 48" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="2" strokeLinecap="round" />
    {hair && (
      <>
        <path d="M26 48 C 24 25, 76 25, 74 48 C 76 56, 74 65, 74 65 C 74 65, 68 55, 50 55 C 32 55, 26 65, 26 65" fill={hair} />
        <path d="M 27 40 Q 50 24 73 40 Q 50 36 27 40" fill={hair} opacity="0.95" />
        <path d="M 33 34 Q 50 20 67 34" fill={hair} />
      </>
    )}
    {accessory === 'sunglasses' && (
      <g>
        <rect x="30" y="41" width="18" height="10" rx="3" fill="#111" opacity="0.9" stroke="#fff" strokeWidth="1" />
        <rect x="52" y="41" width="18" height="10" rx="3" fill="#111" opacity="0.9" stroke="#fff" strokeWidth="1" />
        <line x1="48" y1="45" x2="52" y2="45" stroke="#fff" strokeWidth="2" />
      </g>
    )}
    {accessory === 'crown' && (
      <g>
        <path d="M 32 28 Q 50 33 68 28" fill="none" stroke="#ffb800" strokeWidth="3" strokeLinecap="round" />
        <circle cx="34" cy="27" r="4" fill="#ff2e93" />
        <circle cx="42" cy="29" r="4" fill="#8b3cff" />
        <circle cx="50" cy="30" r="5" fill="#ffb800" />
        <circle cx="58" cy="29" r="4" fill="#8b3cff" />
        <circle cx="66" cy="27" r="4" fill="#ff2e93" />
      </g>
    )}
    {accessory === 'ears' && (
      <g>
        <path d="M 28 32 L 20 12 L 38 24 Z" fill={hair || '#111'} />
        <path d="M 31 30 L 25 16 L 36 24 Z" fill="#ff7da9" />
        <path d="M 72 32 L 80 12 L 62 24 Z" fill={hair || '#111'} />
        <path d="M 69 30 L 75 16 L 64 24 Z" fill="#ff7da9" />
      </g>
    )}
  </svg>
);
