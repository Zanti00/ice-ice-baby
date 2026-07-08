import React, { createContext, useContext, useState, useEffect } from "react";

interface NicknameContextType {
  nickname: string;
  setNickname: (name: string) => void;
  showModal: boolean;
}

const NicknameContext = createContext<NicknameContextType | undefined>(undefined);

export function NicknameProvider({ children }: { children: React.ReactNode }) {
  const [nickname, setNicknameState] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const savedName = localStorage.getItem("playerNickname");
    if (savedName) {
      setNicknameState(savedName);
    } else {
      setShowModal(true);
    }
  }, []);

  const setNickname = (name: string) => {
    setNicknameState(name);
    localStorage.setItem("playerNickname", name);
    setShowModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setNickname(inputValue.trim());
    }
  };

  return (
    <NicknameContext.Provider value={{ nickname, setNickname, showModal }}>
      {children}
      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal">
            <h2>Welcome to the Ice Arena</h2>
            <p>Enter your nickname to start playing.</p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                maxLength={20}
                placeholder="Nickname"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="username-input"
                autoFocus
              />
              <div className="modal-buttons">
                <button
                  type="submit"
                  className="submit-score-btn"
                  disabled={!inputValue.trim()}
                >
                  Enter Arena
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </NicknameContext.Provider>
  );
}

export function useNickname() {
  const context = useContext(NicknameContext);
  if (context === undefined) {
    throw new Error("useNickname must be used within a NicknameProvider");
  }
  return context;
}
