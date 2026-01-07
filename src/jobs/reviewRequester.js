import cron from 'node-cron';
import { db } from '../db/database.js';
import { notificationService } from '../services/notificationService.js';
import { delay } from '../utils/helpers.js';

/**
 * Job для запиту відгуків
 * Запускається кожні 30 хвилин
 */
export const startReviewRequesterJob = () => {
  console.log('[ReviewRequester] Starting job...');

  // Запуск кожні 30 хвилин
  cron.schedule('*/30 * * * *', async () => {
    console.log('[ReviewRequester] Checking for review requests...');
    await requestReviews();
  });

  console.log('[ReviewRequester] Job scheduled');
};

/**
 * Запит відгуків у користувачів
 */
const requestReviews = async () => {
  try {
    const bookings = await db.getBookingsForReviewRequest();
    
    console.log(`[ReviewRequester] Found ${bookings.length} bookings for review request`);

    for (const booking of bookings) {
      try {
        await notificationService.requestReview(booking);
        await delay(500); // Затримка між запитами
      } catch (error) {
        console.error(`[ReviewRequester] Error requesting review for booking ${booking.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[ReviewRequester] Error:', error);
  }
};

/**
 * Одноразовий запуск (для тестування)
 */
export const runReviewRequests = async () => {
  console.log('[ReviewRequester] Manual run...');
  await requestReviews();
};

