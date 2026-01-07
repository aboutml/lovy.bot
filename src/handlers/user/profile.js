import { db } from '../../db/database.js';
import { getProfileMessage, getErrorMessage } from '../../utils/messages/userMessages.js';
import { mainMenuKeyboard, profileInlineKeyboard } from '../../utils/keyboards/userKeyboards.js';

/**
 * Реєстрація обробників профілю
 */
export const registerProfileHandlers = (bot) => {
  // Мій профіль (текстова кнопка)
  bot.hears('👤 Мій профіль', async (ctx) => {
    try {
      const user = await db.getUserByTelegramId(ctx.from.id);
      
      if (!user) {
        await ctx.reply('Спочатку натисни /start для реєстрації');
        return;
      }

      await ctx.reply(getProfileMessage(user), {
        parse_mode: 'HTML',
        reply_markup: profileInlineKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in profile:', error);
      await ctx.reply(getErrorMessage(), { parse_mode: 'HTML' });
    }
  });
};

