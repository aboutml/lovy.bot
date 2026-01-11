import { db } from '../../db/database.js';
import { getBizWelcomeMessage, getBizMainMenuMessage, getBizErrorMessage } from '../../utils/messages/businessMessages.js';
import { startKeyboard, businessMainMenuKeyboard } from '../../utils/keyboards/businessKeyboards.js';

/**
 * Реєстрація команд для бота бізнесу
 */
export const registerBusinessCommands = (bot) => {
  // Команда /start
  bot.command('start', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);

      if (business) {
        // Бізнес вже зареєстрований - показуємо головне меню
        await ctx.reply(getBizMainMenuMessage(business), {
          parse_mode: 'HTML',
          reply_markup: businessMainMenuKeyboard.reply_markup,
        });
      } else {
        // Новий бізнес - показуємо привітання
        await ctx.reply(getBizWelcomeMessage(), {
          parse_mode: 'HTML',
          reply_markup: startKeyboard.reply_markup,
        });
      }
    } catch (error) {
      console.error('Error in business /start command:', error);
      await ctx.reply(getBizErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Команда /help
  bot.command('help', async (ctx) => {
    const helpMessage = `❓ <b>Допомога для бізнесу</b>

<b>Основні команди:</b>
/start — Головне меню
/new — Створити нову пропозицію
/deals — Мої пропозиції
/check — Перевірити код клієнта
/stats — Статистика
/help — Ця довідка

<b>Як створити пропозицію:</b>
1. Натисни "Нова пропозиція"
2. Введи назву послуги та ціни
3. Обери мінімум людей та термін
4. Опублікуй!

<b>Як підтвердити візит:</b>
1. Клієнт показує код
2. Натисни "Перевірити код"
3. Введи код
4. Підтверди візит

Питання? Пиши @lovi_support`;

    await ctx.reply(helpMessage, { parse_mode: 'HTML' });
  });

  // Команда /new - швидке створення пропозиції
  bot.command('new', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      
      if (!business) {
        await ctx.reply('Спочатку зареєструй свій бізнес!', {
          reply_markup: startKeyboard.reply_markup,
        });
        return;
      }

      // Запускаємо процес створення
      await db.updateBusinessState(ctx.from.id, 'creating_deal_title', {});
      
      const { getDealCreationSteps } = await import('../../utils/messages/businessMessages.js');
      await ctx.reply(getDealCreationSteps.title, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error('Error in /new command:', error);
      await ctx.reply(getBizErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Команда /deals
  bot.command('deals', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      
      if (!business) {
        await ctx.reply('Спочатку зареєструй свій бізнес!');
        return;
      }

      const deals = await db.getBusinessDeals(business.id);
      
      if (deals.length === 0) {
        await ctx.reply('📭 У тебе ще немає пропозицій.\n\nСтвори першу пропозицію командою /new');
        return;
      }

      const { getBizDealCardMessage } = await import('../../utils/messages/businessMessages.js');
      
      await ctx.reply(`📊 <b>Твої пропозиції (${deals.length}):</b>`, { parse_mode: 'HTML' });
      
      for (const deal of deals) {
        await ctx.reply(getBizDealCardMessage(deal), { parse_mode: 'HTML' });
      }
    } catch (error) {
      console.error('Error in /deals command:', error);
      await ctx.reply(getBizErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Команда /check
  bot.command('check', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      
      if (!business) {
        await ctx.reply('Спочатку зареєструй свій бізнес!');
        return;
      }

      await db.updateBusinessState(ctx.from.id, 'checking_code', {});
      
      const { getCodeCheckPromptMessage } = await import('../../utils/messages/businessMessages.js');
      await ctx.reply(getCodeCheckPromptMessage(), { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error in /check command:', error);
      await ctx.reply(getBizErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Команда /stats
  bot.command('stats', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      
      if (!business) {
        await ctx.reply('Спочатку зареєструй свій бізнес!');
        return;
      }

      const deals = await db.getBusinessDeals(business.id);
      const activeDeals = deals.filter(d => ['active', 'activated'].includes(d.status));
      const completedDeals = deals.filter(d => d.status === 'completed');
      
      const totalClients = deals.reduce((sum, d) => sum + d.current_people, 0);

      const statsMessage = `📈 <b>Статистика</b>

🏪 ${business.name}
⭐ Рейтинг: ${business.rating ? business.rating.toFixed(1) : 'Немає відгуків'} (${business.review_count} відгуків)

━━━━━━━━━━━━━━━
📊 <b>Пропозиції:</b>
• Всього: ${deals.length}
• Активних: ${activeDeals.length}
• Завершених: ${completedDeals.length}

👥 <b>Клієнти:</b>
• Всього приєдналось: ${totalClients}`;

      await ctx.reply(statsMessage, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error in /stats command:', error);
      await ctx.reply(getBizErrorMessage(), { parse_mode: 'HTML' });
    }
  });
};

