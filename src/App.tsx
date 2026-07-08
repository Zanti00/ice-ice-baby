import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [health, setHealth] = useState(100);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  // Handle Spacebar press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling when spacebar is pressed
      if (e.code === 'Space') {
        e.preventDefault();
      }
      
      if (e.code === 'Space' && health > 0 && !showCongrats) {
        setHealth((prev) => Math.max(0, prev - 1));
        
        // Trigger a shake animation
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 150);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [health, showCongrats]);

  useEffect(() => {
    if (health === 0) {
      setTimeout(() => setShowCongrats(true), 500); // delay showing congrats slightly
    }
  }, [health]);

  const resetGame = () => {
    setHealth(100);
    setShowCongrats(false);
  };

  // Determine which image to show based on health
  let imageSrc = '/ice-1.png';
  if (health === 0) {
    imageSrc = '/ice-4.png';
  } else if (health <= 33) {
    imageSrc = '/ice-3.png';
  } else if (health <= 66) {
    imageSrc = '/ice-2.png';
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Break the Ice!</h1>
        <p>Spam the <strong>SPACEBAR</strong> to melt the ice block.</p>
      </div>

      <div className="game-area">
        <div className={`ice-container ${isAnimating ? 'shake' : ''} ${health === 0 ? 'broken' : ''}`}>
          <img src={imageSrc} alt="Ice block" className="ice-image" draggable="false" />
        </div>
        
        <div className="health-bar-container">
          <div className="health-bar" style={{ width: `${health}%` }}></div>
        </div>
        <div className="health-text">{health}% Solid</div>
      </div>

      {showCongrats && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Ice Broken! 🧊🔥</h2>
            <p>Great job! You successfully broke the ice.</p>
            <button className="play-again-btn" onClick={resetGame}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
