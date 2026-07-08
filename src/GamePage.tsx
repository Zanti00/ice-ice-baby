import { useState, useEffect, useCallback, useRef } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import { supabase } from "./lib/supabase";
import { Podium, X, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useNickname } from "./NicknameContext";
import { usePresence } from "./hooks/usePresence";

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

export default function GamePage() {
  const [health, setHealth] = useState(100);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFlashbang, setIsFlashbang] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const { nickname } = useNickname();
  const { track, untrack, players } = usePresence("ice-lobby");
  const activeLobbyPlayers = players.length;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  // Track state for use in callbacks
  const latestElapsedTime = useRef(elapsedTime);
  useEffect(() => {
    latestElapsedTime.current = elapsedTime;
  }, [elapsedTime]);

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

  // Sync presence periodically and on hit
  const syncPresence = useCallback(
    (currentHealth: number) => {
      if (currentHealth > 0 && currentHealth < 100) {
        track({
          nickname: nickname,
          elapsedTime: latestElapsedTime.current,
          clickCount: 100 - currentHealth,
        });
      }
    },
    [nickname, track],
  );

  // Keep a stable ref to syncPresence for use in intervals
  const syncPresenceRef = useRef(syncPresence);
  useEffect(() => {
    syncPresenceRef.current = syncPresence;
  }, [syncPresence]);

  const healthRef = useRef(health);
  useEffect(() => {
    healthRef.current = health;
  }, [health]);

  // Periodic sync of elapsed time so the lobby timer ticks between clicks
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        syncPresenceRef.current(healthRef.current);
      }, 500);
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
        syncPresence(0);
        setTimeout(() => untrack(), 500);
      } else if (newHealth === 66 || newHealth === 33) {
        playCrackSound();
        syncPresence(newHealth); // Immediate lobby update on every hit
      } else {
        playHitSound();
        syncPresence(newHealth); // Immediate lobby update on every hit
      }

      // Trigger a shake animation
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 150);
    }
  }, [health, showCongrats, syncPresence, untrack]);

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
      // Trigger flashbang immediately
      setIsFlashbang(true);
      setTimeout(() => setIsFlashbang(false), 700);

      setTimeout(() => setShowCongrats(true), 500); // delay showing congrats slightly

      // Fetch personal best immediately so it's ready when modal shows
      if (nickname) {
        supabase
          .from("leaderboard")
          .select("time_ms")
          .eq("username", nickname.trim())
          .single()
          .then(({ data, error }) => {
            if (data && !error) setPersonalBest(data.time_ms);
            else setPersonalBest(null);
          });
      }
    }
  }, [health, nickname]);

  // Clean up presence on unmount AND on page refresh/close.
  // React's effect cleanup runs on unmount (route change), but NOT reliably on
  // page unload. The beforeunload listener covers the refresh/tab-close case.
  useEffect(() => {
    const handleUnload = () => {
      untrack();
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      // Always untrack on unmount regardless of isPlaying state
      untrack();
    };
  }, [untrack]);

  const resetGame = () => {
    setHealth(100);
    setElapsedTime(0);
    setIsPlaying(false);
    setShowCongrats(false);
    setShowLeaderboard(false);
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

  const beatPersonalBest = personalBest === null || elapsedTime < personalBest;
  const qualifiesForLeaderboard =
    !scoreSubmitted &&
    beatPersonalBest &&
    (leaderboard.length < 10 ||
      elapsedTime < (leaderboard[leaderboard.length - 1]?.time_ms ?? Infinity));

  const handleScoreSubmission = async () => {
    if (!nickname.trim()) return;
    setIsSubmitting(true);
    setSubmitError("");

    let error;
    if (personalBest !== null) {
      // They are replacing their score
      const res = await supabase
        .from("leaderboard")
        .update({ time_ms: elapsedTime })
        .eq("username", nickname.trim());
      error = res.error;
    } else {
      // New insertion
      const res = await supabase
        .from("leaderboard")
        .insert([{ username: nickname.trim(), time_ms: elapsedTime }]);
      error = res.error;
    }

    if (error) {
      setSubmitError("An error occurred while submitting.");
      setIsSubmitting(false);
    } else {
      setScoreSubmitted(true);
      setIsSubmitting(false);
      setPersonalBest(elapsedTime);
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
        <div className="top-bar">
          <Link to="/lobby" className="icon-btn lobby-btn" title="Live Arena">
            <Users size={24} />
            {activeLobbyPlayers > 0 && <span className="live-dot" />}
          </Link>
          <button
            className="icon-btn leaderboard-btn"
            onClick={() => setShowLeaderboard(true)}
            title="Leaderboard"
          >
            <Podium size={24} />
          </button>
        </div>
        <div className="header">
          <h1>Break the Ice!</h1>
          <p>
            Spam the <strong>SPACEBAR</strong> or <strong>CLICK</strong> to melt
            the ice block.
          </p>
        </div>

        {/* Flashbang overlay */}
        {isFlashbang && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "white",
              zIndex: 9999,
              pointerEvents: "none",
              animation: "flashbang 700ms ease-out forwards",
            }}
          />
        )}

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
                  {personalBest !== null ? (
                    <p>
                      You beat your personal best of{" "}
                      {(personalBest / 1000).toFixed(2)}s! Replace your old
                      record?
                    </p>
                  ) : (
                    <p>You made it to the Top 10, {nickname}!</p>
                  )}
                  {submitError && <p className="error-text">{submitError}</p>}
                  <div className="modal-buttons">
                    <button
                      className="submit-score-btn"
                      onClick={handleScoreSubmission}
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? "Submitting..."
                        : personalBest !== null
                          ? "Yes, Replace"
                          : "Submit Score"}
                    </button>
                    <button className="play-again-btn" onClick={resetGame}>
                      Play Again
                    </button>
                  </div>
                </div>
              ) : (
                <div className="leaderboard-submission">
                  {!beatPersonalBest && personalBest !== null && (
                    <p style={{ color: "#f87171", marginBottom: "1rem" }}>
                      Your personal best is {(personalBest / 1000).toFixed(2)}s.
                    </p>
                  )}
                  <div className="modal-buttons">
                    <button
                      className="leaderboard-btn-secondary"
                      onClick={() => {
                        setShowCongrats(false);
                        setShowLeaderboard(true);
                      }}
                    >
                      Show Leaderboard
                    </button>
                    <button className="play-again-btn" onClick={resetGame}>
                      Play Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showLeaderboard && (
          <div className="modal-overlay">
            <div
              className="modal leaderboard-modal"
              style={{ position: "relative" }}
            >
              <button
                className="close-modal-btn"
                onClick={() => setShowLeaderboard(false)}
              >
                <X size={24} />
              </button>
              <h2>Top 10 Fastest Breakers</h2>
              <div className="leaderboard-list">
                {leaderboard.map((entry, index) => (
                  <div key={entry.id} className="leaderboard-item">
                    <span className="rank">#{index + 1}</span>
                    <span className="name">{entry.username}</span>
                    <span className="time">
                      {(entry.time_ms / 1000).toFixed(2)}s
                    </span>
                  </div>
                ))}
                {leaderboard.length === 0 && (
                  <p>No records yet. Be the first!</p>
                )}
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
