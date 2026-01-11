import { db } from '../../db/database.js';
import { 
  getThankYouForReviewMessage, 
  getErrorMessage 
} from '../../utils/messages/userMessages.js';
import { 
  mainMenuKeyboard, 
  ratingInlineKeyboard 
} from '../../utils/keyboards/userKeyboards.js';

const REVIEW_BONUS_POINTS = 10;

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

  // Нейтральний відгук
  bot.action(/review_ok_(\d+)/, async (ctx) => {
    try {
      const bookingId = parseInt(ctx.match[1]);
      
      await ctx.answerCbQuery();
      await ctx.editMessageText('😐 Розкажи детальніше, що саме не сподобалось?\n\nНапиши свій відгук:', {
        parse_mode: 'HTML',
      });

      // Зберігаємо стан для очікування текстового відгуку
      await db.updateUserState(ctx.from.id, 'awaiting_review_text', { 
        bookingId, 
        rating: 3 
      });
    } catch (error) {
      console.error('Error in review_ok:', error);
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
        reply_markup: mainMenuKeyboard.reply_markup,
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
      
      const booking = await db.getBookingByCode(
        (await db.supabase?.from('bookings').select('code').eq('id', bookingId).single())?.data?.code
      );
      
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
      
      // Нараховуємо бонуси
      await db.addUserBonus(ctx.from.id, REVIEW_BONUS_POINTS);
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(getThankYouForReviewMessage(REVIEW_BONUS_POINTS), {
        parse_mode: 'HTML',
        reply_markup: mainMenuKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in rate:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });
};

