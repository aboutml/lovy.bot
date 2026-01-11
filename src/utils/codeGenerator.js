import { config } from '../config.js';

/**
 * Генерація унікального коду для бронювання
 * Формат: LOVY-XXXX (де XXXX - 4 цифри)
 */
export const generateBookingCode = () => {
  const prefix = config.code.prefix;
  const randomPart = Math.floor(1000 + Math.random() * 9000); // 4 цифри
  return `${prefix}-${randomPart}`;
};

/**
 * Генерація унікального коду з перевіркою в базі
 * Якщо код вже існує - генеруємо новий
 */
export const generateUniqueCode = async (db, maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateBookingCode();
    const existing = await db.getBookingByCode(code);
    
    if (!existing) {
      return code;
    }
  }
  
  // Якщо не вдалося згенерувати унікальний за maxAttempts спроб,
  // додаємо timestamp
  const prefix = config.code.prefix;
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${timestamp}`;
};

/**
 * Валідація формату коду
 */
export const isValidCodeFormat = (code) => {
  const prefix = config.code.prefix;
  const regex = new RegExp(`^${prefix}-[A-Z0-9]{4,}$`, 'i');
  return regex.test(code);
};

/**
 * Нормалізація коду (uppercase, без зайвих пробілів)
 */
export const normalizeCode = (code) => {
  return code.trim().toUpperCase();
};

/**
 * Перевірка чи повідомлення схоже на код
 * (починається з LOVY- або схожого префікса)
 */
export const looksLikeCode = (text) => {
  if (!text) return false;
  const normalized = text.trim().toUpperCase();
  const prefix = config.code.prefix;
  return normalized.startsWith(prefix + '-') || normalized.startsWith(prefix);
};

