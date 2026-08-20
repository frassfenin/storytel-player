import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  MemoryRouter,
  BrowserRouter,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import LoginForm from "./components/LoginForm";
import Dashboard from "./components/Dashboard";
import PlayerView from "./components/PlayerView";
import api from "./utils/api";
import storage from "./utils/storage";
import BookView from "./components/BookView";
import WelcomeModal from "./components/WelcomeModal";
import LogsModal from "./components/LogsModal";
import SettingsModal from "./components/SettingsModal";
import ConfirmLogoutModal from "./components/ConfirmLogoutModal";
import SearchModal from "./components/SearchModal";
import FloatingMenu from "./components/FloatingMenu";
import { AudioProvider } from "./contexts/AudioContext";

const useMemoryRouter =
  import.meta.env.VITE_REACT_APP_USE_MEMORY_ROUTER === "true";
const Router = useMemoryRouter ? MemoryRouter : BrowserRouter;

function App() {
  const { t } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [triggerLogout, setTriggerLogout] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    checkAuthStatus();

    // Listen for logout event from tray
    if (window.trayControls?.onLogout) {
      window.trayControls.onLogout(() => {
        setTriggerLogout(true);
      });
    }

    // Global keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K -> Search modal
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
      // Ctrl+Alt+D -> Logs modal
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowLogsModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (triggerLogout) {
      setShowConfirmModal(true);
      setTriggerLogout(false);
    }
  }, [triggerLogout]);

  useEffect(() => {
    const handleUnauthorized = async () => {
      await storage.remove("token");
      setIsAuthenticated(false);
      setSessionExpired(true);
      if (window.trayControls?.updateAuthState) {
        window.trayControls.updateAuthState(false);
      }
    };
    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await storage.get("token");
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        if (window.trayControls?.updateAuthState) {
          window.trayControls.updateAuthState(false);
        }
        return;
      }

      const response = await api.get("/auth/status");
      const authenticated = response.data.authenticated;
      setIsAuthenticated(authenticated);
      if (window.trayControls?.updateAuthState) {
        window.trayControls.updateAuthState(authenticated);
      }
    } catch (error) {
      setIsAuthenticated(false);
      await storage.remove("token");
      if (window.trayControls?.updateAuthState) {
        window.trayControls.updateAuthState(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkFirstTime = async () => {
      if (isAuthenticated && !isLoading) {
        const hasSeenWelcome = await storage.get("hasSeenWelcome");
        if (!hasSeenWelcome || hasSeenWelcome === "false") {
          setShowWelcomeModal(true);
        }
      }
    };
    checkFirstTime();
  }, [isAuthenticated, isLoading]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setSessionExpired(false);
    if (window.trayControls?.updateAuthState) {
      window.trayControls.updateAuthState(true);
    }
  };

  const handleWelcomeClose = async () => {
    await storage.set("hasSeenWelcome", "true");
    setShowWelcomeModal(false);
  };

  const handleLogout = async () => {
    try {
      await api.post("/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      await storage.remove("token");
      setIsAuthenticated(false);
      setShowConfirmModal(false);
      setShowSettingsModal(false);
      if (window.trayControls?.updateAuthState) {
        window.trayControls.updateAuthState(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <Router>
      <AudioProvider>
        <div className="scrollable min-h-screen bg-black">
          <Routes>
            <Route
              path="/login"
              element={
                !isAuthenticated ? (
                  <LoginForm onLogin={handleLogin} sessionExpired={sessionExpired} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Dashboard
                    onLogout={handleLogout}
                    triggerLogout={triggerLogout}
                    setTriggerLogout={setTriggerLogout}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/player/:bookId"
              element={
                isAuthenticated ? (
                  <PlayerView />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route
              path="/book/:bookId"
              element={
                isAuthenticated ? <BookView /> : <Navigate to="/login" replace />
              }
            />
          </Routes>

          {/* Global Floating Bottom Menu */}
          {isAuthenticated && (
            <FloatingMenu
              onOpenSearch={() => setShowSearchModal(true)}
              onOpenLogs={() => setShowLogsModal(true)}
              onOpenSettings={() => setShowSettingsModal(true)}
            />
          )}

          {/* Modals */}
          {isAuthenticated && (
            <>
              <SearchModal
                isOpen={showSearchModal}
                onClose={() => setShowSearchModal(false)}
              />
              <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                onLogout={() => {
                  setShowSettingsModal(false);
                  setShowConfirmModal(true);
                }}
              />
              <ConfirmLogoutModal
                isOpen={showConfirmModal}
                onConfirm={handleLogout}
                onCancel={() => setShowConfirmModal(false)}
              />
              <WelcomeModal
                isOpen={showWelcomeModal}
                onClose={handleWelcomeClose}
              />
            </>
          )}

          <LogsModal
            isOpen={showLogsModal}
            onClose={() => setShowLogsModal(false)}
          />
        </div>
      </AudioProvider>
    </Router>
  );
}

export default App;
