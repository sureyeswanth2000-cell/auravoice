import React, { useState } from 'react';
import { renderAvatarSVG } from './mockData';
import { MessageCircle, Heart, Send, HelpCircle, GraduationCap } from 'lucide-react';

// Hardcoded educational posts — not user-generated demo data
const LOVESKOOL_POSTS = [
  { 
    id: 'p1', 
    category: 'Voice Tips',
    question: 'How do I make my voice sound warmer and more welcoming?',
    likes: 142, 
    answers: [{ author: 'LoveSkool Team', text: 'Tip: Smile while talking — your voice really does sound warmer! 😊 People pick up on warmth even in audio calls.', isExpert: true }]
  },
  { 
    id: 'p2', 
    category: 'Icebreakers',
    question: 'What is a good way to start a call with a matched friend?',
    likes: 98,  
    answers: [{ author: 'LoveSkool Team', text: 'Starting a conversation? Try asking about their favourite chai order. It breaks the ice instantly! ☕', isExpert: true }]
  },
  { 
    id: 'p3', 
    category: 'Call Tips',
    question: 'What can I do if we run out of things to talk about?',
    likes: 76,  
    answers: [{ author: 'LoveSkool Team', text: 'If there is an awkward silence, use our Icebreaker button in the Matchmaker — it always saves the moment! 🎲', isExpert: true }]
  },
  { 
    id: 'p4', 
    category: 'Profile Tips',
    question: 'How do I get matches faster in the app?',
    likes: 55,  
    answers: [{ author: 'LoveSkool Team', text: 'Always start with your language preference set correctly so you match with compatible people. 🌏', isExpert: true }]
  },
];

const PRESET_QUESTIONS = [
  "How can I make my voice sound more attractive on calls?",
  "Is it okay to ask for a video call on the first match?",
  "What is the best way to handle a silent awkward moment?",
  "How do I know if someone in the voice room likes me?"
];

export default function LoveSkool({ userProfile }) {
  const [activeBoard, setActiveBoard] = useState('board');
  const [posts, setPosts] = useState(LOVESKOOL_POSTS);
  
  // Ask Advisor State
  const [messages, setMessages] = useState([
    { sender: 'RJ Love Expert', isBot: true, text: '👋 Namaste! I am your LoveSkool Expert Advisor. Ask me anything about voice rooms, flirting, or building connections!' }
  ]);
  const [inputValue, setInputValue] = useState('');
  
  const handleLikePost = (postId) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return { ...post, likes: post.likes + 1 };
      }
      return post;
    }));
  };

  const handleAskPreset = (question) => {
    askAdvisor(question);
  };

  const handleSubmitQuestion = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    askAdvisor(inputValue);
    setInputValue('');
  };

  const askAdvisor = (question) => {
    // Add user question
    setMessages(prev => [...prev, { sender: 'You', isUser: true, text: question }]);

    // Simulated expert response
    setTimeout(() => {
      let reply = "That's a very sweet question! In voice dating, confidence is key. Speak slowly, listen actively, and remember that using regional words can instantly make the connection feel warm and authentic! 💖";
      
      const lowerQ = question.toLowerCase();
      if (lowerQ.includes('voice') || lowerQ.includes('attractive')) {
        reply = "🎤 To make your voice more appealing, try using a high-quality mic, speaking at a moderate pace, and most importantly, smiling while you talk! The warmth of a smile travels beautifully through audio waves.";
      } else if (lowerQ.includes('video') || lowerQ.includes('first')) {
        reply = "🔒 Safety First! On AuraVoice, privacy is our core value. It is always best to spend comfortable time in audio rooms and group games before proceeding to video calls. Do it only when both feel 100% ready!";
      } else if (lowerQ.includes('awkward') || lowerQ.includes('silent')) {
        reply = "🧩 Awkward silences are normal! A great way to break them is launching the built-in Tic Tac Toe or spinning the Truth-or-Dare wheel! Games give both of you an instant fun topic to talk about.";
      } else if (lowerQ.includes('like') || lowerQ.includes('know')) {
        reply = "🌹 Look for signs! If someone stays in your voice room, regularly sends virtual gifts (like a Rose or Crown), or laughs at your jokes, they are definitely highly interested! Keep the positive energy flowing.";
      }

      setMessages(prev => [...prev, { sender: 'RJ Love Expert', isBot: true, text: reply }]);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Header Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GraduationCap color="var(--primary)" /> LoveSkool
        </h2>
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
          <button 
            onClick={() => setActiveBoard('board')} 
            className="frnd-btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '11px', border: 'none', background: activeBoard === 'board' ? 'var(--primary)' : 'transparent', fontWeight: '700' }}
          >
            Q&A Board
          </button>
          <button 
            onClick={() => setActiveBoard('ask-advisor')} 
            className="frnd-btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '11px', border: 'none', background: activeBoard === 'ask-advisor' ? 'var(--primary)' : 'transparent', fontWeight: '700' }}
          >
            Ask RJ Advisor
          </button>
        </div>
      </div>

      {activeBoard === 'board' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1, paddingBottom: '20px' }}>
          
          {posts.map(post => (
            <div key={post.id} className="board-card">
              <span className={`tag-badge ${post.category === 'Friendship' ? 'purple' : 'pink'}`}>
                #{post.category}
              </span>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '8px', lineHeight: '1.4' }}>
                "{post.question}"
              </h3>
              
              {/* Expert Answer */}
              {post.answers.map((ans, aIdx) => (
                <div key={aIdx} style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '3px solid var(--primary)', padding: '10px 12px', borderRadius: '4px', margin: '10px 0 0 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)' }}>
                      {ans.author} {ans.isExpert ? '⭐ Expert Verified' : ''}
                    </span>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {ans.text}
                  </p>
                </div>
              ))}

              {/* Card Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <button 
                  onClick={() => handleLikePost(post.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}
                >
                  <Heart size={14} color="var(--primary)" fill="var(--primary)" /> {post.likes} Helpful
                </button>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  1 Expert Answer
                </span>
              </div>
            </div>
          ))}

        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
          
          {/* Messages screen */}
          <div style={{ flex: 1, minHeight: '180px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                style={{ 
                  alignSelf: msg.isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.isUser ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(255,255,255,0.04)',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  fontSize: '13px',
                  lineHeight: '1.4'
                }}
              >
                {!msg.isUser && (
                  <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '800', marginBottom: '2px' }}>{msg.sender}</div>
                )}
                {msg.text}
              </div>
            ))}
          </div>

          {/* Quick preset suggestions */}
          <div style={{ margin: '10px 0' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', display: 'block', marginBottom: '6px' }}>SUGGESTED QUESTIONS:</span>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {PRESET_QUESTIONS.map((q, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleAskPreset(q)}
                  className="frnd-btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <HelpCircle size={10} /> {q.substring(0, 24)}...
                </button>
              ))}
            </div>
          </div>

          {/* Input Panel */}
          <form onSubmit={handleSubmitQuestion} style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              className="frnd-input" 
              placeholder="Ask anything about relationships..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{ borderRadius: '12px', padding: '10px 14px' }}
            />
            <button 
              type="submit" 
              className="frnd-btn" 
              style={{ padding: '0 16px', borderRadius: '12px', boxShadow: 'none' }}
            >
              <Send size={16} />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
