import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ConfirmLogoutModal from './ConfirmLogoutModal';
import SettingsModal from './SettingsModal';

interface DashboardHeaderProps {
  onLogout: () => void;
  triggerLogout?: boolean;
  setTriggerLogout?: (value: boolean) => void;
}

function DashboardHeader({ onLogout, triggerLogout, setTriggerLogout }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    if (triggerLogout) {
      setShowConfirmModal(true);
      if (setTriggerLogout) {
        setTriggerLogout(false);
      }
    }
  }, [triggerLogout, setTriggerLogout]);

  const handleSettingsClick = () => {
    setShowSettingsModal(true);
  };

  const handleLogoutClick = () => {
    setShowSettingsModal(false);
    setShowConfirmModal(true);
  };

  const handleConfirmLogout = () => {
    setShowConfirmModal(false);
    onLogout();
  };

  const handleCancelLogout = () => {
    setShowConfirmModal(false);
  };

  return (
    <>
      <nav className="bg-[#0A0A0A] border-b border-white/5 sticky top-0 z-30 backdrop-blur-md bg-opacity-95">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            {/* Storytel Orange Logo Icon */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF5100] rounded-2xl flex items-center justify-center shadow-lg shadow-[#FF5100]/25 transition-transform hover:scale-105">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                </svg>
              </div>
              <span className="text-white font-bold text-lg tracking-tight hidden sm:inline">
                Storytel
              </span>
            </div>

            {/* Settings Button */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSettingsClick}
                className="bg-[#1A1A1A] hover:bg-[#2C2C2E] border border-white/10 text-white px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-2 shadow-sm hover:border-white/20"
              >
                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{t('dashboard.settings', 'Inställningar')}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onLogout={handleLogoutClick}
      />
      <ConfirmLogoutModal
        isOpen={showConfirmModal}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </>
  );
}

export default DashboardHeader;
