import { Link } from "react-router-dom";
import { ArrowLeft, Snowflake } from "lucide-react";
import { usePresence } from "./hooks/usePresence";
import "./LobbyPage.css";

export default function LobbyPage() {
  const { players } = usePresence("ice-lobby");

  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <Link to="/" className="back-btn">
          <ArrowLeft size={24} />
          <span>Back to Game</span>
        </Link>
        <div className="title-container">
          <h1>Live Arena</h1>
          <div className="live-badge">
            <span className="live-dot-header"></span>
            {players.length} Playing
          </div>
        </div>
      </div>

      <div className="lobby-content">
        {players.length === 0 ? (
          <div className="empty-state">
            <Snowflake size={64} className="empty-icon" />
            <h2>It's quiet here...</h2>
            <p>Nobody is currently breaking the ice. Go be the first!</p>
          </div>
        ) : (
          <div className="players-grid">
            {players.map((player) => (
              <div key={player.nickname} className="player-card">
                <h3 className="player-name">{player.nickname}</h3>
                <div className="player-stats">
                  <div className="stat-row">
                    <span className="stat-label">⏱ Time</span>
                    <span className="stat-value">{(player.elapsedTime / 1000).toFixed(2)}s</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">🔨 Hits</span>
                    <span className="stat-value">{player.clickCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
