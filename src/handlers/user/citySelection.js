import { db } from '../../db/database.js';
import { getCitySelectedMessage, getMainMenuMessage, getErrorMessage } from '../../utils/messages/userMessages.js';
import { mainMenuKeyboard, citySelectionKeyboard } from '../../utils/keyboards/userKeyboards.js';

// Мапінг тексту кнопок на slug міста
const cityMapping = {
  '📍 Дніпро': 'dnipro',
  '📍 Київ': 'kyiv',
  '📍 Львів': 'lviv',
  '📍 Одеса': 'odesa',
};

/**
 * Реєстрація обробників вибору міста
 */
export const registerCitySelectionHandlers = (bot) => {
  // Обробка текстових кнопок вибору міста
  bot.hears(Object.keys(cityMapping), async (ctx) => {
    try {
      const citySlug = cityMapping[ctx.message.text];
      
      if (!citySlug) {
        return;
      }

      const city = await db.getCityBySlug(citySlug);
      
      if (!city) {
        await ctx.reply('❌ Місто не знайдено. Спробуй ще раз.', {
          reply_markup: citySelectionKeyboard.reply_markup,
        });
        return;
      }

      // Оновлюємо місто користувача
      await db.updateUserCity(ctx.from.id, city.id);

      // Показуємо підтвердження та головне меню
      await ctx.reply(getCitySelectedMessage(city.name), {
        parse_mode: 'HTML',
        reply_markup: mainMenuKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in city selection:', error);
      await ctx.reply(getErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Обробка кнопки "Змінити місто"
  bot.hears('📍 Змінити місто', async (ctx) => {
    try {
      await ctx.reply('Обери нове місто:', {
        reply_markup: citySelectionKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in change city:', error);
      await ctx.reply(getErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Inline callback для зміни міста
  bot.action('change_city', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.reply('Обери нове місто:', {
        reply_markup: citySelectionKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in change_city callback:', error);
      await ctx.answerCbQuery('Помилка. Спробуй ще раз.');
    }
  });
};

