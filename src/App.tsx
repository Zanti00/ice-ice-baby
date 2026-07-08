import { useState, useEffect, useCallback } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import { supabase } from "./lib/supabase";
import { Podium, X } from "lucide-react";
import "./App.css";

const hitAudio = new Audio("/hit.ogg");
const playHitSound = () => {
  hitAudio.currentTime = 0;
  hitAudio.play().catch((e) => console.log("Audio play failed:", e));
};

const shatterAudio = new Audio("/shatter.ogg");
const playShatterSound = () => {
  shatterAudio.currentTime = 0;
  shatterAudio.play().catch((e) => console.log("Audio play failed:", e));
};

const crackAudio = new Audio("/crack.ogg");
const playCrackSound = () => {
  crackAudio.currentTime = 0;
  crackAudio.play().catch((e) => console.log("Audio play failed:", e));
};

const windAudio = new Audio("/wind-snow.mp3");
windAudio.loop = true;
windAudio.volume = 1.0;

function App() {
  const [health, setHealth] = useState(100);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  const fetchLeaderboard = async () => {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("*")
      .order("time_ms", { ascending: true })
      .limit(10);
    if (!error && data) {
      setLeaderboard(data);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setElapsedTime((prev) => prev + 10);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const particlesInit = useCallback(async (engine: any) => {
    await loadFull(engine);
  }, []);

  // Attempt to autoplay background sound, or wait for any global interaction
  useEffect(() => {
    const startAudio = () => {
      if (windAudio.paused) {
        windAudio.play().catch(() => {});
      }
      window.removeEventListener("click", startAudio);
      window.removeEventListener("keydown", startAudio);
    };

    windAudio.play().catch(() => {
      // Autoplay blocked: wait for any interaction on the page
      window.addEventListener("click", startAudio);
      window.addEventListener("keydown", startAudio);
    });

    return () => {
      window.removeEventListener("click", startAudio);
      window.removeEventListener("keydown", startAudio);
    };
  }, []);

  const handleHit = useCallback(() => {
    if (health > 0 && !showCongrats) {
      if (health === 100) {
        setIsPlaying(true);
      }

      const newHealth = Math.max(0, health - 1);
      setHealth(newHealth);

      if (newHealth === 0) {
        setIsPlaying(false);
        playShatterSound();
      } else if (newHealth === 66 || newHealth === 33) {
        playCrackSound();
      } else {
        playHitSound();
      }

      // Trigger a shake animation
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 150);
    }
  }, [health, showCongrats]);

  // Handle Spacebar press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling when spacebar is pressed
      if (e.code === "Space") {
        e.preventDefault();

        // Prevent holding down spacebar to spam
        if (!e.repeat) {
          handleHit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleHit]);

  useEffect(() => {
    if (health === 0) {
      setTimeout(() => setShowCongrats(true), 500); // delay showing congrats slightly
    }
  }, [health]);

  const resetGame = () => {
    setHealth(100);
    setElapsedTime(0);
    setIsPlaying(false);
    setShowCongrats(false);
    setShowLeaderboard(false);
    setUsername("");
    setSubmitError("");
    setScoreSubmitted(false);
  };

  // Determine which image to show based on health
  let imageSrc = "/ice-1.png";
  if (health === 0) {
    imageSrc = "/ice-4.png";
  } else if (health <= 33) {
    imageSrc = "/ice-3.png";
  } else if (health <= 66) {
    imageSrc = "/ice-2.png";
  }

  const qualifiesForLeaderboard = !scoreSubmitted && (leaderboard.length < 10 || elapsedTime < (leaderboard[leaderboard.length - 1]?.time_ms ?? Infinity));

  const submitScore = async () => {
    if (!username.trim()) return;
    setIsSubmitting(true);
    setSubmitError("");
    
    const { error } = await supabase
      .from("leaderboard")
      .insert([{ username: username.trim(), time_ms: elapsedTime }]);

    if (error) {
      if (error.code === '23505') {
        setSubmitError("Username already taken. Please choose another.");
      } else {
        setSubmitError("An error occurred while submitting.");
      }
      setIsSubmitting(false);
    } else {
      setScoreSubmitted(true);
      setIsSubmitting(false);
      await fetchLeaderboard();
      setShowCongrats(false);
      setShowLeaderboard(true);
    }
  };

  return (
    <>
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          fullScreen: { enable: true, zIndex: 0 },
          particles: {
            color: { value: "#bae6fd" },
            number: { value: 120, density: { enable: true, area: 800 } },
            shape: { type: "circle" },
            opacity: { value: 0.8 },
            size: { value: { min: 1, max: 4 } },
            move: {
              enable: true,
              speed: 2,
              direction: "bottom",
              straight: false,
              outModes: "out",
            },
          },
          interactivity: {
            detectsOn: "window",
            events: {
              onHover: { enable: true, mode: "repulse" },
            },
            modes: {
              repulse: { distance: 100, duration: 0.4 },
            },
          },
          background: { color: "transparent" },
        }}
      />
      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <button className="top-right-leaderboard-btn" onClick={() => setShowLeaderboard(true)}>
          <Podium size={24} />
        </button>
        <div className="header">
          <h1>Break the Ice!</h1>
          <p>
            Spam the <strong>SPACEBAR</strong> or <strong>CLICK</strong> to melt
            the ice block.
          </p>
        </div>

        <div className="game-area">
          <div
            className={`ice-container ${isAnimating ? "shake" : ""} ${health === 0 ? "broken" : ""}`}
            onClick={handleHit}
            style={{
              cursor: health > 0 && !showCongrats ? "pointer" : "default",
            }}
          >
            <img
              src={imageSrc}
              alt="Ice block"
              className="ice-image"
              draggable="false"
            />
          </div>

          <div className="health-bar-container">
            <div className="health-bar" style={{ width: `${health}%` }}></div>
          </div>
          <div
            className="timer-display"
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            ⏱ {(elapsedTime / 1000).toFixed(2)}s
          </div>
        </div>

        {showCongrats && (
          <div className="modal-overlay">
            <div className="modal">
              <img
                src="/sid.png"
                alt="Sid the Sloth"
                style={{
                  position: "absolute",
                  top: "-100px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "180px",
                  height: "auto",
                  zIndex: 10,
                  filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.5))",
                }}
              />
              <h2>Ice Broken!</h2>
              <p>
                Great job! You successfully broke the ice in{" "}
                <strong>{(elapsedTime / 1000).toFixed(2)}</strong> seconds.
              </p>

              {qualifiesForLeaderboard ? (
                <div className="leaderboard-submission">
                  <p>You made it to the Top 10! Enter your name:</p>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isSubmitting}
                    className="username-input"
                  />
                  {submitError && <p className="error-text">{submitError}</p>}
                  <div className="modal-buttons">
                    <button className="submit-score-btn" onClick={submitScore} disabled={isSubmitting || !username.trim()}>
                      {isSubmitting ? "Submitting..." : "Submit Score"}
                    </button>
                    <button className="play-again-btn" onClick={resetGame}>
                      Play Again
                    </button>
                  </div>
                </div>
              ) : (
                <div className="modal-buttons">
                  <button className="leaderboard-btn" onClick={() => { setShowCongrats(false); setShowLeaderboard(true); }}>
                    Show Leaderboard
                  </button>
                  <button className="play-again-btn" onClick={resetGame}>
                    Play Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {showLeaderboard && (
          <div className="modal-overlay">
            <div className="modal leaderboard-modal" style={{ position: "relative" }}>
              <button className="close-modal-btn" onClick={() => setShowLeaderboard(false)}>
                <X size={24} />
              </button>
              <h2>Top 10 Fastest Breakers</h2>
              <div className="leaderboard-list">
                {leaderboard.map((entry, index) => (
                  <div key={entry.id} className="leaderboard-item">
                    <span className="rank">#{index + 1}</span>
                    <span className="name">{entry.username}</span>
                    <span className="time">{(entry.time_ms / 1000).toFixed(2)}s</span>
                  </div>
                ))}
                {leaderboard.length === 0 && <p>No records yet. Be the first!</p>}
              </div>
              <div className="modal-buttons">
                <button className="play-again-btn" onClick={resetGame}>
                  Play Again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
