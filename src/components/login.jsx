import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, signInAnonymously } from 'firebase/auth';
import { Sparkles, Phone, ShieldCheck, Heart, UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Login({ onLoginSuccess }) {
  const [step, setStep] = useState('welcome'); // 'welcome', 'phone', 'otp', 'verifying'
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Real Firebase SMS OTP is 6 digits in production!
  const [otpCodes, setOtpCodes] = useState(['', '', '', '', '', '']);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];
  
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loadingText, setLoadingText] = useState('Verifying code...');
  const recaptchaVerifierRef = useRef(null);

  // Initialize invisible recaptcha on mount or when steps change
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
      }
    };
  }, []);

  // Core SMS sending logic - separated so Resend OTP can call it safely
  const sendSmsVerification = async () => {
    if (phoneNumber.length < 10) {
      alert("Please enter a valid 10-digit phone number!");
      return;
    }

    setOtpCodes(['', '', '', '', '', '']);
    setStep('verifying');
    setLoadingText('Sending SMS verification code...');

    try {
      // Clear old verifier if resending
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }

      // Set up invisible recaptcha verifier
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {}
      });

      // Request Firebase SMS code
      const fullNumber = `+91${phoneNumber}`;
      const confirmation = await signInWithPhoneNumber(auth, fullNumber, recaptchaVerifierRef.current);
      
      setConfirmationResult(confirmation);
      setStep('otp');
    } catch (err) {
      console.error("Firebase Phone SMS request failed:", err);
      // Clear bad verifier on error
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
      alert(`SMS Send Failed: ${err.message}. Make sure you have enabled the "Phone" provider under Authentication in your Firebase console!`);
      setStep('phone');
    }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    await sendSmsVerification();
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otpCodes];
    newOtp[index] = value.substring(value.length - 1);
    setOtpCodes(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs[index + 1].current.focus();
    }

    // Check if full 6-digit OTP is entered
    if (newOtp.every(val => val !== '')) {
      triggerVerification(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    // Backspace auto-focus previous input
    if (e.key === 'Backspace' && !otpCodes[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  const triggerVerification = async (code) => {
    setStep('verifying');
    setLoadingText('Verifying SMS verification code...');

    try {
      if (confirmationResult) {
        // 1. Confirm code with Firebase Auth
        await confirmationResult.confirm(code);
        
        // Success claps!
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
        onLoginSuccess();
      } else {
        alert("No active verification session. Please enter your mobile number and request a new OTP code!");
        setStep('phone');
        setOtpCodes(['', '', '', '', '', '']);
      }
    } catch (err) {
      console.error("OTP Verification failed:", err);
      alert("Invalid SMS OTP verification code. Please check and try again!");
      setStep('otp');
      setOtpCodes(['', '', '', '', '', '']);
    }
  };

  const handleGuestLogin = async () => {
    setStep('verifying');
    setLoadingText('Logging in as Guest...');
    
    try {
      // Use Firebase anonymous auth so session persists and Firestore profile syncs
      await signInAnonymously(auth);
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.6 }
      });
      // onAuthStateChanged in App.jsx will handle the rest
      onLoginSuccess();
    } catch (err) {
      console.error("Guest login failed:", err);
      alert('Guest login failed. Please try again or use your mobile number.');
      setStep('welcome');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', padding: '10px 0' }}>
      
      {/* Invisible Recaptcha target element */}
      <div id="recaptcha-container"></div>

      {step === 'welcome' && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center' }}>
          
          {/* Glowing welcome logo */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-10px', left: '-10px', right: '-10px', bottom: '-10px', background: 'var(--primary-glow)', borderRadius: '50%', filter: 'blur(15px)', zIndex: 1 }} />
            <div 
              style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                zIndex: 2,
                position: 'relative',
                boxShadow: '0 8px 32px rgba(255, 46, 147, 0.4)'
              }}
            >
              <Heart size={44} color="#fff" fill="#fff" style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.4))' }} />
            </div>
          </div>

          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', background: 'linear-gradient(90deg, var(--primary), var(--accent), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, tracking: '0.5px' }}>
              AuraVoice
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Audio Dating, Voice Rooms & Avatar Matches
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginTop: '10px' }}>
            <button 
              onClick={() => setStep('phone')}
              className="frnd-btn" 
              style={{ width: '100%', padding: '16px', display: 'flex', alignItems: 'center', justify: 'center', gap: '8px' }}
            >
              <Phone size={18} /> Login with Mobile No
            </button>
            <button 
              onClick={handleGuestLogin}
              className="frnd-btn-secondary" 
              style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px dashed var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}
            >
              🚀 Instant Guest Access
            </button>
          </div>

          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            🔒 Safe & Secure. We never share your real number.
          </span>
        </div>
      )}

      {step === 'phone' && (
        <form onSubmit={handlePhoneSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Enter Mobile Number</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>We will send you a 6-digit verification OTP code</p>
          </div>

          <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '20px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '15px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '700' }}>🇮🇳 +91</span>
              <input 
                type="tel" 
                className="frnd-input" 
                placeholder="Enter 10-digit number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').substring(0, 10))}
                style={{ paddingLeft: '64px', fontSize: '16px', fontWeight: '700' }}
                required 
                autoFocus
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button" 
              onClick={() => setStep('welcome')}
              className="frnd-btn-secondary" 
              style={{ flex: 1, padding: '14px', borderRadius: '16px' }}
            >
              Back
            </button>
            <button 
              type="submit" 
              className="frnd-btn" 
              style={{ flex: 2, padding: '14px', borderRadius: '16px' }}
            >
              Get OTP Verification
            </button>
          </div>
        </form>
      )}

      {step === 'otp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Verify OTP Code</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Enter the 6-digit OTP code sent to +91 {phoneNumber}</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '10px 0' }}>
            {otpCodes.map((val, idx) => (
              <input 
                key={idx}
                ref={otpRefs[idx]}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                value={val}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onFocus={(e) => e.target.select()}
                style={{ 
                  width: '46px', 
                  height: '54px', 
                  background: val ? 'rgba(255,46,147,0.08)' : 'var(--glass-bg)', 
                  border: `2px solid ${val ? 'var(--primary)' : 'var(--glass-border)'}`, 
                  borderRadius: '14px', 
                  textAlign: 'center', 
                  fontSize: '22px', 
                  fontWeight: '800', 
                  color: 'var(--primary)',
                  boxShadow: val ? '0 0 12px rgba(255,46,147,0.2)' : '0 0 10px rgba(0,0,0,0.2)',
                  transition: 'all 0.15s ease',
                  caretColor: 'var(--primary)'
                }}
                maxLength="1"
                required
                autoFocus={idx === 0}
              />
            ))}
          </div>

          <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Didn't receive code? <span style={{ color: 'var(--primary)', fontWeight: '700', cursor: 'pointer' }} onClick={sendSmsVerification}>Resend OTP</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setStep('phone')}
              className="frnd-btn-secondary" 
              style={{ flex: 1, padding: '12px', borderRadius: '16px', fontSize: '13px' }}
            >
              Change Number
            </button>
            <button 
              onClick={handleGuestLogin}
              className="frnd-btn-secondary" 
              style={{ flex: 1, padding: '12px', borderRadius: '16px', fontSize: '13px', borderStyle: 'dashed', borderColor: 'var(--accent)', color: 'var(--accent)' }}
            >
              Skip / Guest Access
            </button>
          </div>
        </div>
      )}

      {step === 'verifying' && (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <div 
            style={{ 
              width: '48px', 
              height: '48px', 
              border: '4px solid var(--glass-border)', 
              borderTopColor: 'var(--primary)', 
              borderRadius: '50%',
              animation: 'spin 1s infinite linear'
            }} 
          />
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>{loadingText}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Please complete the secure verify checks if prompted</p>
          </div>
        </div>
      )}

    </div>
  );
}
