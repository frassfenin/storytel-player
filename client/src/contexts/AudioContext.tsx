import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import api, { trackAction } from '../utils/api';
import storage from '../utils/storage';
import { BookShelfEntity } from '../interfaces/books';
import { BookmarkPositional } from '../interfaces/bookmarks';

interface LocalPosition {
  position: number;
  updatedAt: string;
}

const positionStorageKey = (consumableId: string) => `pos:${consumableId}`;

const readLocalPosition = async (consumableId: string): Promise<LocalPosition | null> => {
  try {
    const raw = await storage.get(positionStorageKey(consumableId));
    if (!raw) return null;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (typeof parsed?.position === 'number' && typeof parsed?.updatedAt === 'string') {
      return parsed as LocalPosition;
    }
    return null;
  } catch {
    return null;
  }
};

const writeLocalPosition = async (consumableId: string, position: number) => {
  try {
    const payload: LocalPosition = {
      position,
      updatedAt: new Date().toISOString(),
    };
    await storage.set(positionStorageKey(consumableId), JSON.stringify(payload));
  } catch {
    // best-effort cache; ignore failures
  }
};

export interface AudioContextType {
  activeBook: BookShelfEntity | null;
  activeBookId: string | null;
  activeConsumableId: string | null;
  audioSrc: string | null;
  isLoading: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  loadBook: (book: BookShelfEntity | null, bookId: string, autoPlay?: boolean) => Promise<void>;
  togglePlayPause: () => void;
  seek: (seekTime: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  setRate: (rate: number) => void;
  cyclePlaybackRate: () => void;
  setVolume: (newVolume: number) => void;
  toggleMute: () => void;
  error: string | null;
  setError: (err: string | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const PLAYBACK_RATES = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const positionUpdateIntervalRef = useRef<any>(null);

  const [activeBook, setActiveBook] = useState<BookShelfEntity | null>(null);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [activeConsumableId, setActiveConsumableId] = useState<string | null>(null);

  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolumeState] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(1.0);
  const [error, setError] = useState<string | null>(null);

  // Position synchronization helper
  const updatePosition = useCallback(async () => {
    if (!audioRef.current || !activeConsumableId) return;

    const position = Math.floor(audioRef.current.currentTime * 1000);
    // Always persist locally first so offline listening is preserved
    await writeLocalPosition(activeConsumableId, position);

    try {
      await api.put(`/bookmark-positional/${activeConsumableId}`, { position });
    } catch (err) {
      console.warn('Failed to sync position to API, kept locally', err);
    }
  }, [activeConsumableId]);

  // Read remote/local saved position and jump
  const goToPosition = useCallback(async (consumableId: string) => {
    let remote: { position: number; updatedAt: string | null } | null = null;
    try {
      const response = await api.get<BookmarkPositional[]>(`/bookmark-positional/${consumableId}`);
      const entry = response.data?.find((format) => format.type === 'abook');
      if (entry) {
        remote = {
          position: entry.position || 0,
          updatedAt: entry.updatedTime || null,
        };
      }
    } catch (err) {
      console.warn('Failed to fetch remote position, will use local cache', err);
    }

    const local = await readLocalPosition(consumableId);
    let chosenPosition = 0;
    if (remote && local) {
      const remoteTime = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
      const localTime = Date.parse(local.updatedAt);
      chosenPosition = localTime > remoteTime ? local.position : remote.position;
    } else if (remote) {
      chosenPosition = remote.position;
    } else if (local) {
      chosenPosition = local.position;
    }

    if (audioRef.current) {
      audioRef.current.currentTime = Math.floor(chosenPosition / 1000);
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  // Main book loader
  const loadBook = useCallback(
    async (book: BookShelfEntity | null, bookId: string, autoPlay: boolean = true) => {
      const consumableId = book?.book?.consumableId || bookId;

      // If this book is already active and stream is loaded, don't restart
      if (activeBookId === bookId && audioSrc) {
        if (book) setActiveBook(book);
        if (autoPlay && audioRef.current && !isPlaying) {
          audioRef.current.play().catch(console.error);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        setActiveBook(book);
        setActiveBookId(bookId);
        setActiveConsumableId(consumableId);

        const response = await api.post('/stream', { bookId, consumableId });
        const streamUrl = response.data.streamUrl;
        setAudioSrc(streamUrl);

        if (audioRef.current) {
          audioRef.current.src = streamUrl;
          audioRef.current.load();
        }
      } catch (err: any) {
        console.error('Failed to load audio stream:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load audio');
        setIsLoading(false);
      }
    },
    [activeBookId, audioSrc, isPlaying]
  );

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  }, [isPlaying]);

  const seek = useCallback((seekTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  }, []);

  const skipForward = useCallback(
    (seconds: number = 15) => {
      if (audioRef.current) {
        const nextTime = Math.min(audioRef.current.currentTime + seconds, duration || audioRef.current.duration || Infinity);
        audioRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
        trackAction('skip_forward', { bookId: activeBookId, consumableId: activeConsumableId, seconds });
      }
    },
    [duration, activeBookId, activeConsumableId]
  );

  const skipBackward = useCallback(
    (seconds: number = 15) => {
      if (audioRef.current) {
        const nextTime = Math.max(audioRef.current.currentTime - seconds, 0);
        audioRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
        trackAction('skip_backward', { bookId: activeBookId, consumableId: activeConsumableId, seconds });
      }
    },
    [activeBookId, activeConsumableId]
  );

  const setRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const cyclePlaybackRate = useCallback(() => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length] || 1.0;
    setRate(nextRate);
  }, [playbackRate, setRate]);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = previousVolume;
      setVolumeState(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      audioRef.current.volume = 0;
      setVolumeState(0);
      setIsMuted(true);
    }
  }, [isMuted, previousVolume, volume]);

  // Audio element listeners
  const onPlay = () => {
    setIsPlaying(true);
    if (positionUpdateIntervalRef.current) clearInterval(positionUpdateIntervalRef.current);
    positionUpdateIntervalRef.current = setInterval(updatePosition, 15000);
    trackAction('play', { bookId: activeBookId, consumableId: activeConsumableId });
    if (window.trayControls?.updatePlayingState) {
      window.trayControls.updatePlayingState(true, activeBook?.book?.name || null);
    }
  };

  const onPause = () => {
    setIsPlaying(false);
    updatePosition();
    if (positionUpdateIntervalRef.current) {
      clearInterval(positionUpdateIntervalRef.current);
      positionUpdateIntervalRef.current = null;
    }
    trackAction('pause', { bookId: activeBookId, consumableId: activeConsumableId });
    if (window.trayControls?.updatePlayingState) {
      window.trayControls.updatePlayingState(false, activeBook?.book?.name || null);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = async () => {
    if (audioRef.current && activeConsumableId) {
      setDuration(audioRef.current.duration);
      await goToPosition(activeConsumableId);
      setIsLoading(false);
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch(console.error);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    updatePosition();
  };

  // Tray play/pause listeners
  useEffect(() => {
    if (window.trayControls?.onPlayPause) {
      window.trayControls.onPlayPause(() => {
        togglePlayPause();
      });
    }
  }, [togglePlayPause]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (positionUpdateIntervalRef.current) {
        clearInterval(positionUpdateIntervalRef.current);
      }
    };
  }, []);

  return (
    <AudioContext.Provider
      value={{
        activeBook,
        activeBookId,
        activeConsumableId,
        audioSrc,
        isLoading,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        volume,
        isMuted,
        audioRef,
        loadBook,
        togglePlayPause,
        seek,
        skipForward,
        skipBackward,
        setRate,
        cyclePlaybackRate,
        setVolume,
        toggleMute,
        error,
        setError,
      }}
    >
      {/* Central persistent audio element */}
      <audio
        ref={audioRef}
        onPlay={onPlay}
        onPause={onPause}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        onError={(e) => {
          console.error('Audio error:', e);
          setIsLoading(false);
          setIsPlaying(false);
        }}
      />
      {children}
    </AudioContext.Provider>
  );
}

export function useAudioContext() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioContext must be used within an AudioProvider');
  }
  return context;
}
