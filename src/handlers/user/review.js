import { db } from '../../db/database.js';
import { 
  getThankYouForReviewMessage, 
  getErrorMessage 
} from '../../utils/messages/userMessages.js';
import { ratingInlineKeyboard } from '../../utils/keyboards/userKeyboards.js';

/**
 * Реєстрація обробників відгуків
 */
export const registerReviewHandlers = (bot) => {
  // Позитивний відгук - запит рейтингу
  bot.action(/review_good_(\d+)/, async (ctx) => {
    try {
      const bookingId = parseInt(ctx.match[1]);
      
      await ctx.answerCbQuery();
      await ctx.editMessageText('🌟 Чудово! Оціни враження:\n\nЯк би ти оцінив цей бізнес?', {
        reply_markup: ratingInlineKeyboard(bookingId).reply_markup,
      });
    } catch (error) {
      console.error('Error in review_good:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Не скористався
  bot.action(/review_notused_(\d+)/, async (ctx) => {
    try {
      const bookingId = parseInt(ctx.match[1]);
      
      // Оновлюємо статус бронювання
      await db.updateBookingStatus(bookingId, 'expired');
      
      await ctx.answerCbQuery();
      await ctx.editMessageText('😔 Шкода, що не вдалося скористатися.\n\nМожливо наступного разу! Ми додамо нові пропозиції найближчим часом.', {
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error('Error in review_notused:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Оцінка зірками
  bot.action(/rate_(\d+)_(\d)/, async (ctx) => {
    try {
      const bookingId = parseInt(ctx.match[1]);
      const rating = parseInt(ctx.match[2]);
      
      const booking = await db.getBookingById(bookingId);
      
      if (!booking) {
        await ctx.answerCbQuery('Бронювання не знайдено');
        return;
      }

      const user = await db.getUserByTelegramId(ctx.from.id);
      const deal = booking.deals;
      const businessId = deal?.businesses?.id;

      // Створюємо відгук
      await db.createReview(bookingId, user.id, businessId, deal.id, rating);
      
      // Підтверджуємо візит користувачем
      await db.confirmBookingByUser(bookingId);
      
      // Оновлюємо статистику користувача
      const savedAmount = deal.original_price - deal.discount_price;
      await db.incrementUserStats(ctx.from.id, savedAmount);
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(getThankYouForReviewMessage(), {
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error('Error in rate:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });
};

