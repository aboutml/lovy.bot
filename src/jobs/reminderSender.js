import cron from 'node-cron';
import { db } from '../db/database.js';
import { notificationService } from '../services/notificationService.js';
import { delay } from '../utils/helpers.js';

/**
 * Job для відправки нагадувань
 * Запускається щодня о 10:00
 */
export const startReminderSenderJob = () => {
  console.log('[ReminderSender] Starting job...');

  // Запуск щодня о 10:00
  cron.schedule('0 10 * * *', async () => {
    console.log('[ReminderSender] Sending reminders...');
    await sendReminders();
  });

  console.log('[ReminderSender] Job scheduled');
};

/**
 * Відправка нагадувань про невикористані коди
 */
const sendReminders = async () => {
  try {
    // Знаходимо активовані бронювання де:
    // - статус 'activated'
    // - нагадування ще не відправлено
    // - до закінчення терміну залишилось 2-3 дні
    const { data: bookings, error } = await db.supabase
      ?.from('bookings')
      .select('*, users(*), deals(*, businesses(*, categories(*)))')
      .eq('status', 'activated')
      .eq('reminder_sent', false);

    if (error) {
      console.error('[ReminderSender] Error fetching bookings:', error);
      return;
    }

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    // Фільтруємо бронювання, де до закінчення 2-3 дні
    const bookingsToRemind = (bookings || []).filter(booking => {
      const expiresAt = new Date(booking.expires_at);
      return expiresAt > twoDaysFromNow && expiresAt <= threeDaysFromNow;
    });

    console.log(`[ReminderSender] Found ${bookingsToRemind.length} bookings to remind`);

    for (const booking of bookingsToRemind) {
      try {
        await notificationService.sendCodeReminder(booking);
        
        // Позначаємо що нагадування відправлено
        await db.supabase
          ?.from('bookings')
          .update({ reminder_sent: true })
          .eq('id', booking.id);

        await delay(500);
      } catch (error) {
        console.error(`[ReminderSender] Error sending reminder for booking ${booking.id}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[ReminderSender] Error:', error);
  }
};

/**
 * Одноразовий запуск (для тестування)
 */
export const runReminders = async () => {
  console.log('[ReminderSender] Manual run...');
  await sendReminders();
};

