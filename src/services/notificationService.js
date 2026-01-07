import { db } from '../db/database.js';
import { getCodeActivatedMessage, getReviewRequestMessage } from '../utils/messages/userMessages.js';
import { getDealActivatedNotificationMessage, getNewParticipantMessage } from '../utils/messages/businessMessages.js';
import { activatedCodeInlineKeyboard, reviewRequestInlineKeyboard } from '../utils/keyboards/userKeyboards.js';
import { delay } from '../utils/helpers.js';

/**
 * Сервіс сповіщень
 */
class NotificationService {
  constructor() {
    this.userBot = null;
    this.businessBot = null;
  }

  /**
   * Встановлення ботів для відправки сповіщень
   */
  setBots(userBot, businessBot) {
    this.userBot = userBot;
    this.businessBot = businessBot;
  }

  /**
   * Сповіщення користувачам про активацію акції
   */
  async notifyUsersAboutActivation(deal, bookings) {
    if (!this.userBot) {
      console.warn('[NotificationService] User bot not set');
      return;
    }

    console.log(`[NotificationService] Notifying ${bookings.length} users about deal ${deal.id} activation`);

    for (const booking of bookings) {
      try {
        const user = booking.users;
        if (!user?.telegram_id) continue;

        await this.userBot.telegram.sendMessage(
          user.telegram_id,
          getCodeActivatedMessage(booking, deal),
          {
            parse_mode: 'HTML',
            reply_markup: activatedCodeInlineKeyboard(booking).reply_markup,
          }
        );

        // Невелика затримка між повідомленнями
        await delay(100);
      } catch (error) {
        console.error(`[NotificationService] Error notifying user ${booking.users?.telegram_id}:`, error.message);
      }
    }
  }

  /**
   * Сповіщення бізнесу про активацію акції
   */
  async notifyBusinessAboutActivation(deal) {
    if (!this.businessBot) {
      console.warn('[NotificationService] Business bot not set');
      return;
    }

    try {
      const business = deal.businesses;
      if (!business?.telegram_id) return;

      await this.businessBot.telegram.sendMessage(
        business.telegram_id,
        getDealActivatedNotificationMessage(deal),
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error(`[NotificationService] Error notifying business:`, error.message);
    }
  }

  /**
   * Сповіщення бізнесу про нового учасника
   */
  async notifyBusinessAboutNewParticipant(deal) {
    if (!this.businessBot) {
      console.warn('[NotificationService] Business bot not set');
      return;
    }

    try {
      const business = deal.businesses;
      if (!business?.telegram_id) return;

      // Не спамимо кожного учасника, тільки коли:
      // - кожні 5 учасників
      // - залишилось 3 або менше до активації
      const remaining = deal.min_people - deal.current_people;
      const shouldNotify = deal.current_people % 5 === 0 || remaining <= 3;

      if (!shouldNotify) return;

      await this.businessBot.telegram.sendMessage(
        business.telegram_id,
        getNewParticipantMessage(deal),
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error(`[NotificationService] Error notifying business about participant:`, error.message);
    }
  }

  /**
   * Запит відгуку у користувача
   */
  async requestReview(booking) {
    if (!this.userBot) {
      console.warn('[NotificationService] User bot not set');
      return;
    }

    try {
      const user = booking.users;
      if (!user?.telegram_id) return;

      await this.userBot.telegram.sendMessage(
        user.telegram_id,
        getReviewRequestMessage(booking),
        {
          parse_mode: 'HTML',
          reply_markup: reviewRequestInlineKeyboard(booking.id).reply_markup,
        }
      );

      // Позначаємо що запит відправлено
      await db.markReviewRequested(booking.id);
    } catch (error) {
      console.error(`[NotificationService] Error requesting review from user ${booking.users?.telegram_id}:`, error.message);
    }
  }

  /**
   * Сповіщення користувача про підтвердження візиту бізнесом
   */
  async notifyUserAboutVisitConfirmation(booking) {
    if (!this.userBot) {
      console.warn('[NotificationService] User bot not set');
      return;
    }

    try {
      const user = booking.users;
      if (!user?.telegram_id) return;

      const deal = booking.deals;
      const business = deal?.businesses;

      const message = `✅ <b>Візит підтверджено!</b>

${business?.categories?.emoji || '🏪'} ${deal?.title || 'Послуга'}
🏪 ${business?.name || 'Бізнес'}

Через деякий час ми попросимо тебе залишити відгук.
Дякуємо, що користуєшся Лови! 💙`;

      await this.userBot.telegram.sendMessage(
        user.telegram_id,
        message,
        { parse_mode: 'HTML' }
      );
    } catch (error) {
      console.error(`[NotificationService] Error notifying user about confirmation:`, error.message);
    }
  }

  /**
   * Нагадування про невикористаний код
   */
  async sendCodeReminder(booking) {
    if (!this.userBot) {
      console.warn('[NotificationService] User bot not set');
      return;
    }

    try {
      const user = booking.users;
      if (!user?.telegram_id) return;

      const deal = booking.deals;
      const business = deal?.businesses;

      const message = `⏰ <b>Нагадування!</b>

У тебе є невикористаний код:

${business?.categories?.emoji || '🏪'} ${deal?.title || 'Послуга'}
🏪 ${business?.name || 'Бізнес'}
🎫 Код: <code>${booking.code}</code>

Не забудь скористатися знижкою!`;

      await this.userBot.telegram.sendMessage(
        user.telegram_id,
        message,
        {
          parse_mode: 'HTML',
          reply_markup: activatedCodeInlineKeyboard(booking).reply_markup,
        }
      );
    } catch (error) {
      console.error(`[NotificationService] Error sending reminder to user ${booking.users?.telegram_id}:`, error.message);
    }
  }
}

export const notificationService = new NotificationService();

