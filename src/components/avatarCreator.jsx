import React, { useState, useRef } from 'react';
import { AVATAR_ELEMENTS, renderAvatarSVG } from './mockData';
import { Sparkles, Save, Check, RefreshCw, Camera, Upload, X } from 'lucide-react';
import { storage, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Analytics } from '../analytics';

export default function AvatarCreator({ userProfile, onSaveProfile }) {
  const [skin, setSkin] = useState(userProfile.skin || AVATAR_ELEMENTS.skin[0].value);
  const [hair, setHair] = useState(userProfile.hair || AVATAR_ELEMENTS.hair[0].value);
  const [accessory, setAccessory] = useState(userProfile.accessory || AVATAR_ELEMENTS.accessories[0].value);
  const [outfit, setOutfit] = useState(userProfile.outfit || AVATAR_ELEMENTS.outfit[0].value);
  
  const [name, setName] = useState(userProfile.name || 'Lovely_Aura');
  const [age, setAge] = useState(userProfile.age || 22);
  const [lang, setLang] = useState(userProfile.lang || 'Hindi');
  const [bio, setBio] = useState(userProfile.bio || 'Happy to chat and make friends! ✨');
  
  // Photo upload states
  const [photoURL, setPhotoURL] = useState(userProfile.photoURL || null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const randomize = () => {
    setSkin(AVATAR_ELEMENTS.skin[Math.floor(Math.random() * AVATAR_ELEMENTS.skin.length)].value);
    setHair(AVATAR_ELEMENTS.hair[Math.floor(Math.random() * AVATAR_ELEMENTS.hair.length)].value);
    setAccessory(AVATAR_ELEMENTS.accessories[Math.floor(Math.random() * AVATAR_ELEMENTS.accessories.length)].value);
    setOutfit(AVATAR_ELEMENTS.outfit[Math.floor(Math.random() * AVATAR_ELEMENTS.outfit.length)].value);
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate: must be image, max 5MB
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Photo must be smaller than 5MB');
      return;
    }

    setUploadError('');
    setUploading(true);

    try {
      const currentUser = auth.currentUser;
      const userId = currentUser?.uid || 'guest';
      const ext = file.name.split('.').pop();
      const storageRef = ref(storage, `avatars/${userId}/profile.${ext}`);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setPhotoURL(downloadURL);
      Analytics.photoUploaded();
    } catch (err) {
      console.warn('Photo upload failed:', err);
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setPhotoURL(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = (e) => {
    e.preventDefault();
    const newProfile = { name, age: parseInt(age), lang, bio, skin, hair, accessory, outfit, photoURL };
    onSaveProfile(newProfile);
    Analytics.profileSaved(!!photoURL);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="avatar-creator-panel">
      <div style={{ textAlign: 'center', width: '100%' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', background: 'linear-gradient(90deg, #ff2e93, #8b3cff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px' }}>
          Create Anonymous Avatar
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No real pictures needed. Stay private &amp; secure!</p>
      </div>

      {/* Profile Photo Section */}
      <div style={{ width: '100%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', alignSelf: 'flex-start' }}>
          <Camera size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Optional Profile Photo
        </p>
        
        <div style={{ position: 'relative' }}>
          {/* Photo preview / avatar preview */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(45deg, var(--primary), var(--secondary))',
            padding: '2px', cursor: 'pointer'
          }} onClick={() => !photoURL && fileInputRef.current?.click()}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: '#190e25', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {photoURL ? (
                <img src={photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                renderAvatarSVG(skin, hair, accessory, outfit)
              )}
            </div>
          </div>
          
          {/* Remove photo button */}
          {photoURL && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              style={{
                position: 'absolute', top: '-4px', right: '-4px',
                width: '22px', height: '22px', borderRadius: '50%',
                background: '#e53935', border: '2px solid #0e0818',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={12} color="#fff" />
            </button>
          )}
        </div>

        {/* Upload button */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="frnd-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', opacity: uploading ? 0.6 : 1 }}
          >
            {uploading ? (
              <>
                <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={14} />
                {photoURL ? 'Change Photo' : 'Upload Photo'}
              </>
            )}
          </button>
        </div>
        
        {uploadError && (
          <p style={{ fontSize: '12px', color: '#e53935', textAlign: 'center' }}>{uploadError}</p>
        )}
        
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center' }}>
          JPG / PNG · Max 5MB · Shown in rooms &amp; your profile
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          style={{ display: 'none' }}
          onChange={handlePhotoSelect}
        />
      </div>

      {/* Avatar preview + randomize */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', justifyContent: 'center', margin: '8px 0' }}>
        <div className="avatar-preview-container">
          <div className="avatar-preview-inner">
            {renderAvatarSVG(skin, hair, accessory, outfit)}
          </div>
        </div>
        
        <button 
          type="button"
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
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '9px', fontWeight: '700', color: '#fff',
                    textAlign: 'center', lineHeight: '24px'
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
                <option value="Hindi, English">🇮🇳 Hindi &amp; English</option>
                <option value="Tamil, English">Tamil &amp; English</option>
                <option value="Telugu, Hindi">Telugu &amp; Hindi</option>
                <option value="Punjabi, Hindi">Punjabi &amp; Hindi</option>
                <option value="Marathi, Hindi">Marathi &amp; Hindi</option>
                <option value="Bengali, Hindi">Bengali &amp; Hindi</option>
                <option value="Gujarati, Hindi">Gujarati &amp; Hindi</option>
                <option value="Malayalam, English">Malayalam &amp; English</option>
                <option value="Kannada, English">Kannada &amp; English</option>
                <option value="Odia, Hindi">Odia &amp; Hindi</option>
                <option value="Bhojpuri, Hindi">Bhojpuri &amp; Hindi</option>
                <option value="Rajasthani, Hindi">Rajasthani &amp; Hindi</option>
                <option value="Haryanvi, Hindi">Haryanvi &amp; Hindi</option>
                <option value="Urdu, Hindi">Urdu &amp; Hindi</option>
                <option value="Assamese, Hindi">Assamese &amp; Hindi</option>
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
          disabled={uploading}
        >
          {savedSuccess ? (
            <><Check size={18} /> Profile Saved!</>
          ) : (
            <><Save size={18} /> Save Avatar Profile</>
          )}
        </button>
      </form>
    </div>
  );
}
