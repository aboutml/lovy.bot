import { db } from '../../db/database.js';
import { 
  getCodeActivatedMessage, 
  getNoBookingsMessage, 
  getErrorMessage 
} from '../../utils/messages/userMessages.js';
import { 
  mainMenuKeyboard, 
  activatedCodeInlineKeyboard
} from '../../utils/keyboards/userKeyboards.js';
import { formatDate, getStatusEmoji, escapeHtml } from '../../utils/helpers.js';

/**
 * Реєстрація обробників бронювань
 */
export const registerBookingHandlers = (bot) => {
  // Мої бронювання (inline callback)
  bot.action('my_bookings', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const user = await db.getUserByTelegramId(ctx.from.id);
      
      if (!user) {
        await ctx.reply('Спочатку натисни /start для реєстрації');
        return;
      }

      const bookings = await db.getUserActiveBookings(user.id);
      
      if (bookings.length === 0) {
        await ctx.reply(getNoBookingsMessage(), {
          parse_mode: 'HTML',
          reply_markup: mainMenuKeyboard.reply_markup,
        });
        return;
      }

      await ctx.reply(`🎫 <b>Твої бронювання (${bookings.length}):</b>`, { parse_mode: 'HTML' });

      for (const booking of bookings) {
        const deal = booking.deals;
        const business = deal?.businesses;
        
        let message = `${getStatusEmoji(booking.status)} <b>${escapeHtml(deal?.title || 'Акція')}</b>\n`;
        message += `🏪 ${escapeHtml(business?.name || 'Бізнес')}\n`;
        message += `📍 ${escapeHtml(business?.address || '')}\n`;
        
        if (booking.status === 'activated') {
          message += `\n🎫 Код: <code>${booking.code}</code>\n`;
          message += `⏰ Дійсний до: ${formatDate(booking.expires_at)}`;
        } else if (booking.status === 'pending') {
          const remaining = deal.min_people - deal.current_people;
          message += `\n⏳ Очікує активації (залишилось ${remaining} людей)`;
        } else if (booking.status === 'used') {
          message += `\n✅ Використано`;
        }

        await ctx.reply(message, { parse_mode: 'HTML' });
      }
    } catch (error) {
      console.error('Error in my_bookings:', error);
      await ctx.reply(getErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Активні коди
  bot.action('my_active_codes', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const user = await db.getUserByTelegramId(ctx.from.id);
      
      if (!user) {
        await ctx.reply('Спочатку натисни /start для реєстрації');
        return;
      }

      const bookings = await db.getUserBookings(user.id, 'activated');
      
      if (bookings.length === 0) {
        await ctx.reply('📭 У тебе немає активних кодів.\n\nКоди активуються коли акція набирає достатньо учасників.', {
          parse_mode: 'HTML',
          reply_markup: mainMenuKeyboard.reply_markup,
        });
        return;
      }

      await ctx.reply(`🎫 <b>Твої активні коди (${bookings.length}):</b>`, { parse_mode: 'HTML' });

      for (const booking of bookings) {
        const deal = booking.deals;
        
        await ctx.reply(getCodeActivatedMessage(booking, deal), {
          parse_mode: 'HTML',
          reply_markup: activatedCodeInlineKeyboard(booking).reply_markup,
        });
      }
    } catch (error) {
      console.error('Error in my_active_codes:', error);
      await ctx.reply(getErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Історія
  bot.action('my_history', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      const user = await db.getUserByTelegramId(ctx.from.id);
      
      if (!user) {
        await ctx.reply('Спочатку натисни /start для реєстрації');
        return;
      }

      const bookings = await db.getUserBookings(user.id);
      const completedBookings = bookings.filter(b => ['used', 'confirmed', 'expired'].includes(b.status));
      
      if (completedBookings.length === 0) {
        await ctx.reply('📭 Історія порожня.\n\nКоли ти скористаєшся знижками — вони з\'являться тут.', {
          parse_mode: 'HTML',
          reply_markup: mainMenuKeyboard.reply_markup,
        });
        return;
      }

      let message = `📋 <b>Історія (${completedBookings.length}):</b>\n\n`;

      for (const booking of completedBookings.slice(0, 10)) {
        const deal = booking.deals;
        const business = deal?.businesses;
        
        message += `${getStatusEmoji(booking.status)} ${escapeHtml(deal?.title || 'Акція')}\n`;
        message += `🏪 ${escapeHtml(business?.name || 'Бізнес')}\n`;
        message += `📅 ${formatDate(booking.created_at)}\n\n`;
      }

      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: mainMenuKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in my_history:', error);
      await ctx.reply(getErrorMessage(), { parse_mode: 'HTML' });
    }
  });

};

