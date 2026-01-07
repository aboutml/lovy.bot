import { Telegraf } from 'telegraf';
import { config } from '../config.js';
import { registerUserCommands } from '../handlers/user/commands.js';
import { registerCitySelectionHandlers } from '../handlers/user/citySelection.js';
import { registerDealsHandlers } from '../handlers/user/deals.js';
import { registerBookingHandlers } from '../handlers/user/booking.js';
import { registerReviewHandlers } from '../handlers/user/review.js';
import { registerProfileHandlers } from '../handlers/user/profile.js';
import { db } from '../db/database.js';

/**
 * Створення та налаштування бота для користувачів
 */
export const createUserBot = () => {
  if (!config.telegram.userBotToken) {
    console.error('❌ TELEGRAM_USER_BOT_TOKEN is required!');
    return null;
  }

  const bot = new Telegraf(config.telegram.userBotToken);

  // Middleware для логування
  bot.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`[UserBot] ${ctx.updateType} - ${ms}ms`);
  });

  // Middleware для створення/оновлення користувача
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      await db.createOrUpdateUser(ctx.from.id, {
        username: ctx.from.username,
        first_name: ctx.from.first_name,
      });
    }
    return next();
  });

  // Реєстрація всіх обробників
  registerUserCommands(bot);
  registerCitySelectionHandlers(bot);
  registerDealsHandlers(bot);
  registerBookingHandlers(bot);
  registerReviewHandlers(bot);
  registerProfileHandlers(bot);

  // Обробка текстових повідомлень для станів
  bot.on('text', async (ctx) => {
    try {
      const user = await db.getUserByTelegramId(ctx.from.id);
      
      if (!user) return;

      // Обробка стану очікування текстового відгуку
      if (user.state === 'awaiting_review_text') {
        const stateData = user.state_data || {};
        const bookingId = stateData.bookingId;
        const rating = stateData.rating || 3;
        
        // Створюємо відгук з коментарем
        // TODO: Імплементувати збереження коментаря
        
        await db.updateUserState(ctx.from.id, 'idle', {});
        await ctx.reply('Дякуємо за відгук! 💙');
        return;
      }
    } catch (error) {
      console.error('[UserBot] Error handling text:', error);
    }
  });

  // Обробка помилок
  bot.catch((err, ctx) => {
    console.error('[UserBot] Error:', err);
    ctx.reply('❌ Виникла помилка. Спробуй ще раз.').catch(() => {});
  });

  return bot;
};

/**
 * Запуск бота користувачів
 */
export const launchUserBot = async (bot) => {
  if (!bot) return;

  try {
    // Налаштування меню команд
    await bot.telegram.setMyCommands([
      { command: 'start', description: 'Головне меню' },
      { command: 'profile', description: 'Мій профіль' },
      { command: 'bookings', description: 'Мої бронювання' },
      { command: 'help', description: 'Допомога' },
    ]);

    await bot.launch();
    console.log('✅ User Bot запущено!');
  } catch (error) {
    console.error('❌ Помилка запуску User Bot:', error);
  }
};

