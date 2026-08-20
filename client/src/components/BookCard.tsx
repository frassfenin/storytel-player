import React from 'react';
import { buildCoverUrl, formatMicrosecondsTime } from '../utils/helpers';
import { BookShelfEntity } from '../interfaces/books';
import { useTranslation } from 'react-i18next';

interface BookCardProps {
  book: BookShelfEntity;
  onBookSelect: (book: BookShelfEntity) => void;
}

function BookCard({ book, onBookSelect }: BookCardProps) {
  const { t } = useTranslation();

  const position = book.abookMark ? book.abookMark.pos : 0;
  const totalDuration = book.abook?.time || 0;
  const remainingTime = Math.max(totalDuration - position, 0);

  const progressPercent =
    totalDuration > 0 ? Math.min(Math.max((position / totalDuration) * 100, 0), 100) : 0;

  const coverUrl =
    book.book.largeCover ||
    book.book.largeCoverE ||
    book.book.cover ||
    book.book.coverE ||
    book.book.smallCover;

  return (
    <div
      onClick={() => onBookSelect(book)}
      className="bg-[#141414] hover:bg-[#1A1A1A] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex gap-4 transition-all duration-200 shadow-lg cursor-pointer group select-none relative overflow-hidden"
    >
      {/* Book Cover */}
      <div className="relative flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shadow-md bg-gray-900 flex items-center justify-center">
        {coverUrl ? (
          <img
            src={buildCoverUrl(coverUrl)}
            alt={book.book.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )}
      </div>

      {/* Book Information */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h3 className="text-white font-bold text-base sm:text-lg line-clamp-1 group-hover:text-orange-400 transition-colors">
            {book.book.name}
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
            <span className="text-gray-400">{t('bookCard.author', 'Författare')}:</span>{' '}
            <span className="text-gray-300 font-medium">{book.book.authorsAsString || '—'}</span>
          </p>
          {book.abook?.narratorAsString && (
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5 truncate">
              <span className="text-gray-400">{t('bookCard.narrator', 'Uppläsare')}:</span>{' '}
              <span className="text-gray-300 font-medium">{book.abook.narratorAsString}</span>
            </p>
          )}
        </div>

        {/* Bottom Progress Row */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
          <span className="text-xs text-gray-400 font-medium">
            {position > 0 && remainingTime > 0
              ? `${formatMicrosecondsTime(remainingTime)} ${t('bookCard.remaining', 'kvar')}`
              : totalDuration > 0
              ? formatMicrosecondsTime(totalDuration)
              : t('bookCard.completed', 'Avslutad')}
          </span>

          <div className="w-24 sm:w-36 h-1.5 bg-[#2C2C2E] rounded-full overflow-hidden flex-shrink-0">
            <div
              className="bg-[#FF5100] h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(255,81,0,0.5)]"
              style={{
                width: `${position > 0 ? progressPercent : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookCard;
