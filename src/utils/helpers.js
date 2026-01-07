import { config } from '../config.js';

/**
 * Перевірка чи користувач є адміном
 */
export const isAdmin = (userId) => {
  return config.admin.userIds.includes(userId);
};

/**
 * Форматування ціни
 */
export const formatPrice = (price) => {
  return `${price.toLocaleString('uk-UA')} грн`;
};

/**
 * Розрахунок знижки у відсотках
 */
export const calculateDiscount = (originalPrice, discountPrice) => {
  const discount = Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
  return discount;
};

/**
 * Форматування дати
 */
export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Форматування дати та часу
 */
export const formatDateTime = (date) => {
  const d = new Date(date);
  return d.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Обчислення залишку часу
 */
export const getTimeRemaining = (expiresAt) => {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires - now;

  if (diff <= 0) {
    return 'Завершено';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days} дн ${hours} год`;
  } else if (hours > 0) {
    return `${hours} год`;
  } else {
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes} хв`;
  }
};

/**
 * Генерація прогрес-бару
 */
export const generateProgressBar = (current, total, length = 10) => {
  const filled = Math.round((current / total) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
};

/**
 * Отримання emoji статусу
 */
export const getStatusEmoji = (status) => {
  const statuses = {
    'pending': '⏳',
    'active': '🟢',
    'activated': '✅',
    'used': '✔️',
    'confirmed': '🎉',
    'completed': '🏁',
    'expired': '⌛',
    'cancelled': '❌',
  };
  return statuses[status] || '❓';
};

/**
 * Отримання emoji рейтингу
 */
export const getRatingStars = (rating) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  return '⭐'.repeat(fullStars) + (halfStar ? '✨' : '') + '☆'.repeat(emptyStars);
};

/**
 * Escape HTML символів для Telegram
 */
export const escapeHtml = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
 * Скорочення тексту
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Валідація телефону (український формат)
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^(\+?38)?0\d{9}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

/**
 * Форматування телефону
 */
export const formatPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+38${cleaned}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('38')) {
    return `+${cleaned}`;
  }
  return phone;
};

/**
 * Генерація реферального посилання
 */
export const generateReferralLink = (botUsername, dealId, userId) => {
  return `https://t.me/${botUsername}?start=deal_${dealId}_ref_${userId}`;
};

/**
 * Парсинг параметрів start
 */
export const parseStartParams = (startParam) => {
  if (!startParam) return {};

  const result = {};
  
  // deal_123_ref_456
  const dealMatch = startParam.match(/deal_(\d+)/);
  if (dealMatch) {
    result.dealId = parseInt(dealMatch[1]);
  }

  const refMatch = startParam.match(/ref_(\d+)/);
  if (refMatch) {
    result.referrerId = parseInt(refMatch[1]);
  }

  return result;
};

/**
 * Затримка (для rate limiting)
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Безпечний виклик з retry
 */
export const withRetry = async (fn, maxRetries = 3, delayMs = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await delay(delayMs * (i + 1));
      }
    }
  }
  
  throw lastError;
};

