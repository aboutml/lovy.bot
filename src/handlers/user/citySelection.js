import { db } from '../../db/database.js';
import { getCitySelectedMessage, getMainMenuMessage, getErrorMessage } from '../../utils/messages/userMessages.js';
import { mainMenuKeyboard, citySelectionKeyboard } from '../../utils/keyboards/userKeyboards.js';

/**
 * Реєстрація обробників вибору міста
 */
export const registerCitySelectionHandlers = (bot) => {
  // Обробка текстових кнопок вибору міста (динамічно по назві)
  bot.hears(/^📍 (.+)$/, async (ctx) => {
    try {
      const cityName = ctx.match[1];
      
      // Пропускаємо кнопку "Змінити місто" — вона обробляється окремо
      if (cityName === 'Змінити місто') {
        return;
      }
      
      // Шукаємо місто по назві в базі
      const city = await db.getCityByName(cityName);
      
      if (!city) {
        const cities = await db.getAllCities();
        await ctx.reply('❌ Місто не знайдено. Спробуй ще раз.', {
          reply_markup: citySelectionKeyboard(cities).reply_markup,
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
      const cities = await db.getAllCities();
      await ctx.reply('Обери нове місто:', {
        reply_markup: citySelectionKeyboard(cities).reply_markup,
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
      const cities = await db.getAllCities();
      await ctx.reply('Обери нове місто:', {
        reply_markup: citySelectionKeyboard(cities).reply_markup,
      });
    } catch (error) {
      console.error('Error in change_city callback:', error);
      await ctx.answerCbQuery('Помилка. Спробуй ще раз.');
    }
  });
};

