import React, { useState } from 'react';
import { AVATAR_ELEMENTS, renderAvatarSVG } from './mockData';
import { Sparkles, Save, User, Check, RefreshCw } from 'lucide-react';

export default function AvatarCreator({ userProfile, onSaveProfile }) {
  const [skin, setSkin] = useState(userProfile.skin || AVATAR_ELEMENTS.skin[0].value);
  const [hair, setHair] = useState(userProfile.hair || AVATAR_ELEMENTS.hair[0].value);
  const [accessory, setAccessory] = useState(userProfile.accessory || AVATAR_ELEMENTS.accessories[0].value);
  const [outfit, setOutfit] = useState(userProfile.outfit || AVATAR_ELEMENTS.outfit[0].value);
  
  const [name, setName] = useState(userProfile.name || 'Lovely_Aura');
  const [age, setAge] = useState(userProfile.age || 22);
  const [lang, setLang] = useState(userProfile.lang || 'Hindi');
  const [bio, setBio] = useState(userProfile.bio || 'Happy to chat and make friends! ✨');
  
  const [savedSuccess, setSavedSuccess] = useState(false);

  const randomize = () => {
    const randomSkin = AVATAR_ELEMENTS.skin[Math.floor(Math.random() * AVATAR_ELEMENTS.skin.length)].value;
    const randomHair = AVATAR_ELEMENTS.hair[Math.floor(Math.random() * AVATAR_ELEMENTS.hair.length)].value;
    const randomAccessory = AVATAR_ELEMENTS.accessories[Math.floor(Math.random() * AVATAR_ELEMENTS.accessories.length)].value;
    const randomOutfit = AVATAR_ELEMENTS.outfit[Math.floor(Math.random() * AVATAR_ELEMENTS.outfit.length)].value;
    
    setSkin(randomSkin);
    setHair(randomHair);
    setAccessory(randomAccessory);
    setOutfit(randomOutfit);
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSaveProfile({
      name,
      age: parseInt(age),
      lang,
      bio,
      skin,
      hair,
      accessory,
      outfit
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="avatar-creator-panel">
      <div style={{ textAlign: 'center', width: '100%' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', background: 'linear-gradient(90deg, #ff2e93, #8b3cff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px' }}>
          Create Anonymous Avatar
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No real pictures needed. Stay private & secure!</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', justifyContent: 'center', margin: '8px 0' }}>
        <div className="avatar-preview-container">
          <div className="avatar-preview-inner">
            {renderAvatarSVG(skin, hair, accessory, outfit)}
          </div>
        </div>
        
        <button 
          onClick={randomize}
          className="frnd-btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '12px' }}
        >
          <RefreshCw size={16} /> Randomize
        </button>
      </div>

      <form onSubmit={handleSave} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Customized Visual sliders */}
        <div className="avatar-controls-grid">
          <div className="avatar-control-card">
            <span className="avatar-control-label">Skin Tone</span>
            <div className="avatar-options">
              {AVATAR_ELEMENTS.skin.map((item) => (
                <div 
                  key={item.name}
                  className={`avatar-option-dot ${skin === item.value ? 'active' : ''}`}
                  style={{ backgroundColor: item.value }}
                  onClick={() => setSkin(item.value)}
                  title={item.name}
                />
              ))}
            </div>
          </div>

          <div className="avatar-control-card">
            <span className="avatar-control-label">Hair Color</span>
            <div className="avatar-options">
              {AVATAR_ELEMENTS.hair.map((item) => (
                <div 
                  key={item.name}
                  className={`avatar-option-dot ${hair === item.value ? 'active' : ''}`}
                  style={{ backgroundColor: item.value }}
                  onClick={() => setHair(item.value)}
                  title={item.name}
                />
              ))}
            </div>
          </div>

          <div className="avatar-control-card">
            <span className="avatar-control-label">Accessory</span>
            <div className="avatar-options">
              {AVATAR_ELEMENTS.accessories.map((item) => (
                <div 
                  key={item.name}
                  className={`avatar-option-dot ${accessory === item.value ? 'active' : ''}`}
                  style={{ 
                    background: item.value === 'none' ? 'rgba(255,255,255,0.1)' : 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'center',
                    fontSize: '9px',
                    fontWeight: '700',
                    color: '#fff',
                    textAlign: 'center',
                    lineHeight: '24px'
                  }}
                  onClick={() => setAccessory(item.value)}
                  title={item.name}
                >
                  {item.name[0]}
                </div>
              ))}
            </div>
          </div>

          <div className="avatar-control-card">
            <span className="avatar-control-label">Outfit Color</span>
            <div className="avatar-options">
              {AVATAR_ELEMENTS.outfit.map((item) => (
                <div 
                  key={item.name}
                  className={`avatar-option-dot ${outfit === item.value ? 'active' : ''}`}
                  style={{ backgroundColor: item.value }}
                  onClick={() => setOutfit(item.value)}
                  title={item.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Identity Details */}
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '16px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>Avatar Nickname</label>
            <input 
              type="text" 
              className="frnd-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cute_Angel"
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>Age</label>
              <input 
                type="number" 
                className="frnd-input"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="18"
                max="99"
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>Language</label>
              <select 
                className="frnd-input"
                style={{ appearance: 'none' }}
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                <option value="Hindi, English">🇮🇳 Hindi & English</option>
                <option value="Tamil, English">Tamil & English</option>
                <option value="Telugu, Hindi">Telugu & Hindi</option>
                <option value="Punjabi, Hindi">Punjabi & Hindi</option>
                <option value="Marathi, Hindi">Marathi & Hindi</option>
                <option value="Bengali, Hindi">Bengali & Hindi</option>
                <option value="Gujarati, Hindi">Gujarati & Hindi</option>
                <option value="Malayalam, English">Malayalam & English</option>
                <option value="Kannada, English">Kannada & English</option>
                <option value="Odia, Hindi">Odia & Hindi</option>
                <option value="Bhojpuri, Hindi">Bhojpuri & Hindi</option>
                <option value="Rajasthani, Hindi">Rajasthani & Hindi</option>
                <option value="Haryanvi, Hindi">Haryanvi & Hindi</option>
                <option value="Urdu, Hindi">Urdu & Hindi</option>
                <option value="Assamese, Hindi">Assamese & Hindi</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px' }}>Short Status / Bio</label>
            <input 
              type="text" 
              className="frnd-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell friends what you like!"
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="frnd-btn"
          style={{ width: '100%', padding: '16px' }}
        >
          {savedSuccess ? (
            <>
              <Check size={18} /> Profile Saved!
            </>
          ) : (
            <>
              <Save size={18} /> Save Avatar Profile
            </>
          )}
        </button>
      </form>
    </div>
  );
}
