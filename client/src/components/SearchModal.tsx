import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { SearchResultBook, SearchResponse } from '../interfaces/books';
import { buildCoverUrl, formatMicrosecondsTime } from '../utils/helpers';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultBook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState('');
  const [addedBooks, setAddedBooks] = useState<Record<string, boolean>>({});
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
      setResults([]);
      setIsLoading(false);
      setSearchedQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const performSearch = async (searchTerm: string) => {
    const q = searchTerm.trim();
    if (!q) {
      setResults([]);
      setIsLoading(false);
      setSearchedQuery('');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.get<SearchResponse>(`/search?q=${encodeURIComponent(q)}`);
      setResults(res.data?.results || []);
      setSearchedQuery(q);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
      setSearchedQuery(q);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setResults([]);
      setSearchedQuery('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      performSearch(val);
    }, 300);
  };

  const handlePlayBook = (bookId: string) => {
    onClose();
    navigate(`/player/${bookId}`);
  };

  const handleViewDetails = (bookId: string) => {
    onClose();
    navigate(`/book/${bookId}`);
  };

  const handleAddToBookshelf = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (addedBooks[bookId] || addingBookId === bookId) return;

    try {
      setAddingBookId(bookId);
      await api.post('/bookshelf/add', { consumableId: bookId });
      setAddedBooks((prev) => ({ ...prev, [bookId]: true }));
    } catch (err) {
      console.error('Failed to add book to library:', err);
    } finally {
      setAddingBookId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 px-4 pb-24 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="relative bg-[#141414] border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] w-full max-w-3xl overflow-hidden flex flex-col max-h-[82vh] transition-all transform animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Search Bar */}
        <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-[#1A1A1A]">
          <div className="text-gray-400 pl-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-base focus:outline-none"
            placeholder={t('search.placeholder', 'Sök efter titel, författare eller uppläsare...')}
            value={query}
            onChange={handleInputChange}
          />
          {isLoading && (
            <div className="animate-spin text-[#FF5100] pr-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
          {query && !isLoading && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setSearchedQuery('');
                inputRef.current?.focus();
              }}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white px-2.5 py-1 text-xs bg-[#2C2C2E] hover:bg-gray-700 rounded-lg transition-colors border border-white/5"
          >
            Esc
          </button>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {/* Initial state */}
          {!query && (
            <div className="text-center py-16 text-gray-500 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#1A1A1A] border border-white/5 flex items-center justify-center text-gray-400 shadow-inner">
                <svg className="w-7 h-7 text-[#FF5100]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <p className="text-base font-semibold text-white">
                {t('search.initialPrompt', 'Sök i Storytels hela katalog')}
              </p>
              <p className="text-xs text-gray-400">
                {t('search.shortcut', 'Tips: Tryck ⌘K när som helst')}
              </p>
            </div>
          )}

          {/* No results */}
          {searchedQuery && !isLoading && results.length === 0 && (
            <div className="text-center py-16 text-gray-400 space-y-2">
              <p className="text-base">
                {t('search.noResults', 'Inga böcker hittades för')} &quot;<span className="text-white font-medium">{searchedQuery}</span>&quot;
              </p>
              <p className="text-xs text-gray-500">Kontrollera stavningen eller sök på ett annat sökord</p>
            </div>
          )}

          {/* Book Cards */}
          {results.map((book) => {
            const isAdded = addedBooks[book.id];
            const isAdding = addingBookId === book.id;
            const durationText =
              book.durationMs > 0 ? formatMicrosecondsTime(book.durationMs * 1000) : '';

            return (
              <div
                key={book.id}
                onClick={() => handleViewDetails(book.id)}
                className="group flex items-center gap-4 p-3.5 rounded-2xl bg-[#1A1A1A] hover:bg-[#242426] border border-white/5 hover:border-white/10 cursor-pointer transition-all duration-150 shadow-md"
              >
                {/* Book Cover */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gray-900 rounded-xl overflow-hidden relative shadow-md">
                  {book.coverUrl ? (
                    <img
                      src={buildCoverUrl(book.coverUrl)}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {book.hasAbook && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#FF5100]/20 text-[#FF5100] border border-[#FF5100]/30">
                        {t('search.audiobook', 'Ljudbok')}
                      </span>
                    )}
                    {book.hasEbook && (
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {t('search.ebook', 'E-bok')}
                      </span>
                    )}
                    {durationText && (
                      <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                        {durationText}
                      </span>
                    )}
                    {book.category && (
                      <span className="text-xs text-gray-500 hidden sm:inline truncate max-w-[120px]">
                        • {book.category}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white truncate group-hover:text-[#FF5100] transition-colors">
                    {book.title}
                  </h3>

                  {book.authors && (
                    <p className="text-xs sm:text-sm text-gray-400 truncate mt-0.5">
                      <span className="text-gray-500">{t('bookCard.author', 'Författare')}:</span> {book.authors}
                    </p>
                  )}

                  {book.narrators && (
                    <p className="text-xs text-gray-400 truncate mt-0.5 hidden sm:block">
                      <span className="text-gray-500">{t('bookCard.narrator', 'Uppläsare')}:</span> {book.narrators}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Add to Library Button */}
                  <button
                    onClick={(e) => handleAddToBookshelf(e, book.id)}
                    title={isAdded ? t('search.addedToBookshelf', 'I bokhyllan') : t('search.addToBookshelf', 'Lägg till i bokhylla')}
                    disabled={isAdded || isAdding}
                    className={`p-2.5 rounded-xl text-xs font-medium transition-all ${
                      isAdded
                        ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                        : 'bg-[#2C2C2E] hover:bg-[#38383a] text-gray-300 hover:text-white border border-white/5'
                    }`}
                  >
                    {isAdding ? (
                      <div className="animate-spin w-4 h-4 text-[#FF5100]">
                        <svg fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    ) : isAdded ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </button>

                  {/* Play Button */}
                  <button
                    onClick={() => handlePlayBook(book.id)}
                    title={t('search.play', 'Spela')}
                    className="px-3.5 py-2 rounded-xl bg-[#FF5100] hover:bg-[#ff641a] text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-[#FF5100]/25 transition-all hover:scale-105 active:scale-95"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="hidden sm:inline">{t('search.play', 'Spela')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SearchModal;
