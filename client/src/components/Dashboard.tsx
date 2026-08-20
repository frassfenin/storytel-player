import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import BookCard from './BookCard';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import DashboardHeader from './DashboardHeader';
import { BookShelfEntity, BookShelfResponse } from '../interfaces/books';

interface DashboardProps {
  onLogout: () => void;
  triggerLogout?: boolean;
  setTriggerLogout?: (value: boolean) => void;
}

function Dashboard({ onLogout, triggerLogout, setTriggerLogout }: DashboardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [books, setBooks] = useState<BookShelfEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [filteredBooks, setFilteredBooks] = useState<BookShelfEntity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBookshelf();
  }, []);

  useEffect(() => {
    if (books.length === 0) {
      setFilteredBooks([]);
      return;
    }

    let result = [...books];

    // Filter by status if selected
    if (filterStatus !== null) {
      result = result.filter((book) => +book.status === filterStatus);
    }

    // Filter by local search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (book) =>
          book.book?.name?.toLowerCase().includes(q) ||
          book.book?.authorsAsString?.toLowerCase().includes(q) ||
          book.abook?.narratorAsString?.toLowerCase().includes(q)
      );
    }

    // Sort by most recently updated
    result.sort((a, b) => {
      const getTimestamp = (book: BookShelfEntity): number => {
        if (book.positionUpdatedTime) return new Date(book.positionUpdatedTime).getTime();
        if (book.stateUpdateTime) return new Date(book.stateUpdateTime).getTime();
        return 0;
      };
      return getTimestamp(b) - getTimestamp(a);
    });

    setFilteredBooks(result);
  }, [filterStatus, books, searchQuery]);

  const loadBookshelf = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<BookShelfResponse>('/bookshelf');
      setBooks(response.data.books || []);
    } catch (err: any) {
      try {
        const offline = await api.get<BookShelfResponse>('/offline/bookshelf');
        setBooks(offline.data?.books || []);
      } catch {
        setError(err.response?.data?.error || t('dashboard.loadError', 'Kunde inte ladda bokhyllan'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSelect = (book: BookShelfEntity) => {
    const bookId = book.abook?.id || book.id;
    navigate(`/book/${bookId}`, {
      state: { book },
    });
  };

  const handleFilterToggle = (status: number) => {
    setFilterStatus((prev) => (prev === status ? null : status));
  };

  if (isLoading) {
    return <LoadingState message={t('dashboard.loading', 'Laddar bokhylla...')} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <DashboardHeader
          onLogout={onLogout}
          triggerLogout={triggerLogout}
          setTriggerLogout={setTriggerLogout}
        />
        <ErrorState error={error} onRetry={() => window.location.reload()} onLogout={onLogout} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#FF5100] selection:text-white">
      <DashboardHeader
        onLogout={onLogout}
        triggerLogout={triggerLogout}
        setTriggerLogout={setTriggerLogout}
      />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto py-6 px-4 pb-36">
        {/* Search Bar */}
        <div className="relative mb-5">
          <div className="relative flex items-center bg-[#1A1A1A] border border-[#2C2C2E] focus-within:border-[#FF5100]/60 focus-within:ring-1 focus-within:ring-[#FF5100]/30 rounded-2xl px-4 py-3.5 transition-all shadow-inner">
            <svg
              className="w-5 h-5 text-gray-400 flex-shrink-0 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('dashboard.search', 'Sök böcker...')}
              className="w-full bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-white ml-2 p-1 rounded-full hover:bg-white/10"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2.5 mb-6 overflow-x-auto pb-1 no-scrollbar">
          {[
            { status: 1, label: 'Ej påbörjad', i18nKey: 'dashboard.filters.notStarted' },
            { status: 2, label: 'Påbörjad', i18nKey: 'dashboard.filters.started' },
            { status: 3, label: 'Avslutad', i18nKey: 'dashboard.filters.concluded' },
          ].map(({ status, label, i18nKey }) => {
            const isActive = filterStatus === status;
            return (
              <button
                key={status}
                onClick={() => handleFilterToggle(status)}
                className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#2C2C2E] text-white border border-white/25 shadow-md'
                    : 'bg-[#141414] text-gray-400 hover:text-white hover:bg-[#1A1A1A] border border-white/5'
                }`}
              >
                {t(i18nKey, label)}
              </button>
            );
          })}
        </div>

        {/* Book List */}
        {books.length === 0 ? (
          <div className="text-center py-20 bg-[#141414] border border-white/5 rounded-3xl p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-900 rounded-full flex items-center justify-center text-gray-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div className="text-white text-lg font-semibold mb-1">
              {t('dashboard.noBooks', 'Inga böcker i bokhyllan')}
            </div>
            <p className="text-gray-400 text-sm">{t('dashboard.emptyLibrary', 'Sök efter en bok för att börja lyssna')}</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-16 bg-[#141414] border border-white/5 rounded-3xl p-8">
            <p className="text-gray-400 text-sm mb-4">Inga böcker matchade ditt filter eller din sökning.</p>
            {searchQuery && (
              <p className="text-xs text-gray-500">
                Tips: Använd sökknappen 🔍 i menyn längst ner för att söka i hela Storytels katalog.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredBooks
              .filter((book) => !!book?.abook || !!book?.book)
              .map((book) => (
                <BookCard
                  key={book.abook?.id || book.id || book.book?.consumableId}
                  book={book}
                  onBookSelect={handleBookSelect}
                />
              ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
