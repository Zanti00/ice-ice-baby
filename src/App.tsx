import { Routes, Route } from "react-router-dom";
import { NicknameProvider } from "./NicknameContext";
import GamePage from "./GamePage";
import LobbyPage from "./LobbyPage";
import "./App.css";

function App() {
  return (
    <NicknameProvider>
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/lobby" element={<LobbyPage />} />
      </Routes>
    </NicknameProvider>
  );
}

export default App;
