import { Telegraf } from 'telegraf';
import { config } from '../config.js';
import { registerBusinessCommands } from '../handlers/business/commands.js';
import { registerBusinessRegistrationHandlers, handleRegistrationText } from '../handlers/business/registration.js';
import { registerBusinessDealsHandlers, handleDealCreationText } from '../handlers/business/deals.js';
import { registerVerificationHandlers, handleCodeVerificationText } from '../handlers/business/verification.js';
import { db } from '../db/database.js';
import { getBizMainMenuMessage, getBizErrorMessage } from '../utils/messages/businessMessages.js';
import { businessMainMenuKeyboard, startKeyboard } from '../utils/keyboards/businessKeyboards.js';

/**
 * Створення та налаштування бота для бізнесу
 */
export const createBusinessBot = () => {
  if (!config.telegram.businessBotToken) {
    console.error('❌ TELEGRAM_BUSINESS_BOT_TOKEN is required!');
    return null;
  }

  const bot = new Telegraf(config.telegram.businessBotToken);

  // Middleware для логування
  bot.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`[BusinessBot] ${ctx.updateType} - ${ms}ms`);
  });

  // Реєстрація всіх обробників
  registerBusinessCommands(bot);
  registerBusinessRegistrationHandlers(bot);
  registerBusinessDealsHandlers(bot);
  registerVerificationHandlers(bot);

  // Обробка текстових повідомлень для станів
  bot.on('text', async (ctx) => {
    try {
      // Ігноруємо команди
      if (ctx.message.text.startsWith('/')) return;

      const business = await db.getBusinessByTelegramId(ctx.from.id);
      
      // Якщо бізнес не зареєстрований і це не кнопка скасування
      if (!business && ctx.message.text !== '❌ Скасувати') {
        // Можливо це процес реєстрації
        const tempBusiness = { state: 'registering_name', state_data: {} };
        
        // Перевіряємо чи є запис з state
        const existingRecord = await db.getBusinessByTelegramId(ctx.from.id);
        if (existingRecord?.state?.startsWith('registering_')) {
          const handled = await handleRegistrationText(ctx, existingRecord);
          if (handled) return;
        }
        return;
      }

      // Обробка реєстрації
      if (business?.state?.startsWith('registering_')) {
        const handled = await handleRegistrationText(ctx, business);
        if (handled) return;
      }

      // Обробка створення пропозиції
      if (business?.state?.startsWith('creating_deal_')) {
        const handled = await handleDealCreationText(ctx, business);
        if (handled) return;
      }

      // Обробка перевірки коду
      if (business?.state === 'checking_code') {
        const handled = await handleCodeVerificationText(ctx, business);
        if (handled) return;
      }

    } catch (error) {
      console.error('[BusinessBot] Error handling text:', error);
      await ctx.reply(getBizErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Обробка помилок
  bot.catch((err, ctx) => {
    console.error('[BusinessBot] Error:', err);
    ctx.reply('❌ Виникла помилка. Спробуй ще раз.').catch(() => {});
  });

  return bot;
};

/**
 * Запуск бота бізнесу
 */
export const launchBusinessBot = async (bot) => {
  if (!bot) return;

  try {
    // Налаштування меню команд
    await bot.telegram.setMyCommands([
      { command: 'start', description: 'Головне меню' },
      { command: 'new', description: 'Нова пропозиція' },
      { command: 'deals', description: 'Мої пропозиції' },
      { command: 'check', description: 'Перевірити код' },
      { command: 'stats', description: 'Статистика' },
      { command: 'help', description: 'Допомога' },
    ]);

    await bot.launch();
    console.log('✅ Business Bot запущено!');
  } catch (error) {
    console.error('❌ Помилка запуску Business Bot:', error);
  }
};

