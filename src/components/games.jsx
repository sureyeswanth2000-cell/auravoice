import React, { useState, useEffect } from 'react';
import { renderAvatarSVG } from './mockData';
import { RotateCcw, Smile, Heart, Star, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

const TRUTHS = [
  "What was your first impression of my avatar? 😉",
  "What is the most romantic thing you've ever done?",
  "If you could talk to anyone in the world for 1 hour, who would it be?",
  "Tell us a secret you haven't told anyone on this app!"
];

const DARES = [
  "Sing a 2-line romantic song in your regional language! 🎤",
  "Send a Rose gift to the Host RJ right now! 🌹",
  "Mimic your favorite Bollywood actor for 10 seconds!",
  "Tell me a sweet compliment in your native tongue!"
];

export default function Games({ partner, userProfile, onBackToRoom }) {
  const [activeTab, setActiveTab] = useState('tic-tac-toe'); // 'tic-tac-toe', 'spin-wheel'
  
  // Tic Tac Toe State
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [gameStatus, setGameStatus] = useState('Your Turn');
  const [partnerSpeech, setPartnerSpeech] = useState("Let's play! I'm pretty good at this 😜");

  // Spin Wheel State
  const [spinning, setSpinning] = useState(false);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [wheelDegree, setWheelDegree] = useState(0);

  // Tic Tac Toe logic
  const checkWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return squares.includes(null) ? null : 'T';
  };

  const handleCellClick = (index) => {
    if (board[index] || !isUserTurn || checkWinner(board)) return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    setIsUserTurn(false);
    setGameStatus(`${partner.name}'s turn...`);

    const reactionQuotes = [
      "Ooh, interesting move! Let me think 🤔",
      "Haha, nice one! Try blocking this!",
      "I see what you're doing there..."
    ];
    setPartnerSpeech(reactionQuotes[Math.floor(Math.random() * reactionQuotes.length)]);

    // Check if user won
    const winner = checkWinner(newBoard);
    if (winner) {
      handleGameOver(winner);
      return;
    }

    // Partner moves after a delay
    setTimeout(() => {
      makePartnerMove(newBoard);
    }, 1500);
  };

  const makePartnerMove = (currentBoard) => {
    const winner = checkWinner(currentBoard);
    if (winner) return;

    // AI logic: Find empty cells
    const emptyIndices = currentBoard.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
    if (emptyIndices.length === 0) return;

    // Simulating intermediate moves
    const randomCell = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    const updatedBoard = [...currentBoard];
    updatedBoard[randomCell] = 'O';
    setBoard(updatedBoard);
    setIsUserTurn(true);
    setGameStatus('Your Turn');

    const nextWinner = checkWinner(updatedBoard);
    if (nextWinner) {
      handleGameOver(nextWinner);
    } else {
      setPartnerSpeech("Your turn! Make it count 😉");
    }
  };

  const handleGameOver = (winner) => {
    if (winner === 'X') {
      setGameStatus('🎉 You Won!');
      setPartnerSpeech("Wow! You're super smart! Teach me your tricks 💖");
      confetti({ particleCount: 60, spread: 50 });
    } else if (winner === 'O') {
      setGameStatus(`😢 ${partner.name} Won!`);
      setPartnerSpeech("Yay! I won! Don't worry, you played exceptionally well 🌟");
    } else {
      setGameStatus("🤝 It's a Draw!");
      setPartnerSpeech("A draw! That was a super tense battle. Play again?");
    }
  };

  const resetTicTacToe = () => {
    setBoard(Array(9).fill(null));
    setIsUserTurn(true);
    setGameStatus('Your Turn');
    setPartnerSpeech("New game! I won't go easy this time 😋");
  };

  // Spin Wheel logic
  const handleSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setSelectedSlice(null);

    const randomDeg = 1800 + Math.floor(Math.random() * 360);
    setWheelDegree(prev => prev + randomDeg);

    setTimeout(() => {
      setSpinning(false);
      const index = Math.random() > 0.5 ? 'truth' : 'dare';
      setSelectedSlice(index);

      // Confetti burst on result
      confetti({ particleCount: 20, spread: 30 });

      // Partner says challenge
      if (index === 'truth') {
        const randTruth = TRUTHS[Math.floor(Math.random() * TRUTHS.length)];
        setPartnerSpeech(`🔍 Truth Time! Here is your question: "${randTruth}"`);
      } else {
        const randDare = DARES[Math.floor(Math.random() * DARES.length)];
        setPartnerSpeech(`⚡ Dare Challenge! Complete this: "${randDare}"`);
      }
    }, 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
      
      {/* Header tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBackToRoom} className="frnd-btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
          ← Back to Chat
        </button>
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '12px' }}>
          <button 
            onClick={() => setActiveTab('tic-tac-toe')} 
            className="frnd-btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '11px', border: 'none', background: activeTab === 'tic-tac-toe' ? 'var(--primary)' : 'transparent', fontWeight: '700' }}
          >
            Tic-Tac-Toe
          </button>
          <button 
            onClick={() => setActiveTab('spin-wheel')} 
            className="frnd-btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '11px', border: 'none', background: activeTab === 'spin-wheel' ? 'var(--primary)' : 'transparent', fontWeight: '700' }}
          >
            Spin The Wheel
          </button>
        </div>
      </div>

      {/* Play Partner Status */}
      <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '12px 16px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(45deg, var(--primary), var(--secondary))', padding: '1px' }}>
          <div className="rj-avatar" style={{ background: '#190e25' }}>
            {renderAvatarSVG(partner.skin, partner.hair, partner.accessory, partner.outfit)}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '13px', fontWeight: '700' }}>Playing with {partner.name}</h4>
          <p style={{ fontSize: '12px', color: 'var(--accent)', italic: true }}>"{partnerSpeech}"</p>
        </div>
      </div>

      {/* Game Visuals */}
      {activeTab === 'tic-tac-toe' ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-secondary)' }}>
            Status: <span style={{ color: '#fff' }}>{gameStatus}</span>
          </div>

          <div className="game-board">
            {board.map((cell, idx) => (
              <div 
                key={idx} 
                className={`game-cell ${cell ? cell.toLowerCase() : ''}`} 
                onClick={() => handleCellClick(idx)}
              >
                {cell}
              </div>
            ))}
          </div>

          <button 
            onClick={resetTicTacToe}
            className="frnd-btn-secondary" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '12px', padding: '8px 16px', borderRadius: '10px' }}
          >
            <RotateCcw size={14} /> Reset Board
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          
          {/* Wheel Graphic */}
          <div style={{ position: 'relative', width: '200px', height: '200px', margin: '10px 0' }}>
            {/* Pointer */}
            <div style={{ position: 'absolute', top: '-10px', left: 'calc(50% - 12px)', width: '0', height: '0', borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '20px solid var(--primary)', zIndex: 10, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }} />
            
            {/* Spinning Circle */}
            <div 
              style={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: '50%', 
                border: '6px solid var(--glass-border)',
                background: 'conic-gradient(var(--primary) 0deg 180deg, var(--secondary) 180deg 360deg)',
                transform: `rotate(${wheelDegree}deg)`,
                transition: spinning ? 'transform 3s cubic-bezier(0.15, 0.85, 0.35, 1)' : 'none',
                boxShadow: '0 8px 30px rgba(139, 60, 255, 0.4)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translate(-50%, -50%) rotate(90deg)', fontSize: '14px', fontWeight: '800', color: '#fff' }}>TRUTH</div>
              <div style={{ position: 'absolute', top: '75%', left: '50%', transform: 'translate(-50%, -50%) rotate(270deg)', fontSize: '14px', fontWeight: '800', color: '#fff' }}>DARE</div>
            </div>
          </div>

          <button 
            onClick={handleSpin}
            disabled={spinning}
            className="frnd-btn"
            style={{ padding: '12px 32px', fontSize: '14px', background: spinning ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--primary), var(--secondary))' }}
          >
            {spinning ? 'Spinning...' : '💥 SPIN WHEEL 💥'}
          </button>

          {selectedSlice && (
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: '14px', textAlign: 'center', width: '100%' }}>
              <span className="tag-badge pink" style={{ textTransform: 'uppercase', fontSize: '12px' }}>
                Landed On: {selectedSlice}
              </span>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
