import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAudioContext } from '../contexts/AudioContext';
import { buildCoverUrl } from '../utils/helpers';

interface FloatingMenuProps {
  onOpenSearch: () => void;
  onOpenLogs: () => void;
  onOpenSettings: () => void;
}

export function FloatingMenu({
  onOpenSearch,
  onOpenLogs,
  onOpenSettings,
}: FloatingMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const audio = useAudioContext();

  const isHome = location.pathname === '/';
  const isPlayerView = location.pathname.startsWith('/player/');

  const hasActiveAudio = !!audio.activeBookId;
  const progress =
    audio.duration > 0 ? Math.min(Math.max((audio.currentTime / audio.duration) * 100, 0), 100) : 0;

  // SVG Circular Progress Ring constants
  const size = 38;
  const strokeWidth = 2.5;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const bookTitle = audio.activeBook?.book?.name || t('player.nowPlaying', 'Ljudbok');
  const bookAuthor = audio.activeBook?.book?.authorsAsString || '';
  const coverUrl =
    audio.activeBook?.book?.largeCover ||
    audio.activeBook?.book?.largeCoverE ||
    audio.activeBook?.book?.smallCover ||
    '';

  const handleOpenFullPlayer = () => {
    if (audio.activeBookId) {
      navigate(`/player/${audio.activeBookId}`, { state: { book: audio.activeBook } });
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 select-none max-w-[95vw]">
      <nav
        className="flex items-center gap-2 sm:gap-3 px-4 py-2.5 rounded-full bg-[#141414]/90 backdrop-blur-2xl border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.8)] ring-1 ring-white/5 transition-all duration-300"
        aria-label="Floating Navigation Dock"
      >
        {/* 1. Library / Bookshelf Orange Icon Button */}
        <button
          onClick={() => navigate('/')}
          title={t('floatingMenu.library', 'Bokhylla')}
          className={`flex items-center justify-center p-2.5 rounded-2xl transition-all duration-200 ${
            isHome
              ? 'bg-[#FF5100] text-white shadow-lg shadow-[#FF5100]/30 scale-105'
              : 'bg-[#1A1A1A] hover:bg-[#2C2C2E] text-gray-300 hover:text-white border border-white/5'
          }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
          </svg>
        </button>

        {/* 2. Global Search Button */}
        <button
          onClick={onOpenSearch}
          title={t('floatingMenu.search', 'Sök i Storytel')}
          className="flex items-center justify-center p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </button>

        {/* 3. Center Info (Active Book cover with circular progress if playing) */}
        {hasActiveAudio && (
          <div
            onClick={handleOpenFullPlayer}
            className="flex items-center gap-2 px-1 cursor-pointer group/mini"
            title={`${bookTitle} (${Math.round(progress)}%)`}
          >
            <div className="relative w-9 h-9 flex-shrink-0">
              <svg className="w-9 h-9 -rotate-90 absolute inset-0 pointer-events-none" viewBox={`0 0 ${size} ${size}`}>
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  className="text-gray-800"
                  strokeWidth={strokeWidth}
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  className="text-[#FF5100] transition-all duration-300"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-[3px] rounded-full overflow-hidden bg-gray-900 shadow-inner flex items-center justify-center">
                {coverUrl ? (
                  <img src={buildCoverUrl(coverUrl)} alt={bookTitle} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
                  </svg>
                )}
              </div>
            </div>

            <div className="hidden md:flex flex-col max-w-[130px] lg:max-w-[180px] text-left">
              <span className="text-xs font-bold text-white truncate group-hover/mini:text-[#FF5100] transition-colors">
                {bookTitle}
              </span>
              {bookAuthor && <span className="text-[11px] text-gray-400 truncate">{bookAuthor}</span>}
            </div>
          </div>
        )}

        {/* 4. Prominent Center Play / Pause Button */}
        <button
          onClick={audio.togglePlayPause}
          title={audio.isPlaying ? t('player.paused', 'Pausa') : t('player.playing', 'Spela')}
          className="w-12 h-12 rounded-full bg-[#FF5100] hover:bg-[#ff641a] text-white flex items-center justify-center shadow-[0_0_24px_rgba(255,81,0,0.4)] transition-transform hover:scale-105 active:scale-95 flex-shrink-0"
        >
          {audio.isLoading ? (
            <div className="animate-spin w-5 h-5">
              <svg fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : audio.isPlaying ? (
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* 5. Audio Equalizer / Logs Icon Button */}
        <button
          onClick={onOpenLogs}
          title={t('floatingMenu.logs', 'Loggar & Status')}
          className="flex items-center justify-center p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v18M6 8v8M18 6v12" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
          </svg>
        </button>

        {/* 6. Settings Gear Icon Button */}
        <button
          onClick={onOpenSettings}
          title={t('floatingMenu.settings', 'Inställningar')}
          className="flex items-center justify-center p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5 transition-transform hover:rotate-45 duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </nav>
    </div>
  );
}

export default FloatingMenu;
