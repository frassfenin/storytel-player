// Build a usable cover URL. The new bookshelf API returns absolute URLs
// (https://covers.storytel.com/...); the legacy API returned relative paths
// that needed the www.storytel.com host prepended. Storytel only serves the
// 640px variant, so there is no smaller size to request.
export const buildCoverUrl = (cover?: string | null): string => {
    if (!cover) return '';
    return /^https?:\/\//.test(cover) ? cover : `https://www.storytel.com${cover}`;
};

export const localizedLanguageName = (
    code?: string | null,
    uiLocale = 'en',
    fallbackName?: string | null
): string => {
    if (!code) {
        return fallbackName ? fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1) : '';
    }
    try {
        const name = new Intl.DisplayNames([uiLocale], {type: 'language'}).of(code);
        if (name && name.toLowerCase() !== code.toLowerCase()) {
            return name.charAt(0).toUpperCase() + name.slice(1);
        }
    } catch {
        // ignore Intl lookup error
    }
    if (fallbackName) {
        return fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
    }
    return code.toUpperCase();
};

export const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};


export const formatMicrosecondsTime = (microseconds: number) => {
    const totalSeconds = Math.floor(microseconds / 1000 / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours} h ${minutes} min`;
};

export const formatTimeNatural = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (hours > 0) {
        parts.push(`${hours}h`);
    }
    if (minutes > 0) {
        parts.push(`${minutes}min`);
    }
    if (secs > 0 || parts.length === 0) {
        parts.push(`${secs}s`);
    }

    return parts.join(' ');
};

// Pick the translation key for a failed "add to library" call. The backend
// reports a machine-readable `code` so the user-facing wording stays in the
// i18n files instead of coming back as an untranslated server string.
export const addToBookshelfErrorKey = (err: any): string =>
    err?.response?.data?.code === 'ADD_TO_BOOKSHELF_NOT_CONFIRMED'
        ? 'search.errors.addToBookshelfNotConfirmed'
        : 'search.errors.addToBookshelfFailed';

// Same idea for "remove from library".
export const removeFromBookshelfErrorKey = (err: any): string =>
    err?.response?.data?.code === 'REMOVE_FROM_BOOKSHELF_NOT_CONFIRMED'
        ? 'bookshelf.errors.removeNotConfirmed'
        : 'bookshelf.errors.removeFailed';

export const truncateTitle = (title: string, maxLength: number = 30): string => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
};
