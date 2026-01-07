import { db } from '../../db/database.js';
import { 
  getDealCreationSteps,
  getDealPreviewMessage,
  getDealPublishedMessage,
  getBizDealCardMessage,
  getNoBizDealsMessage,
  getBizMainMenuMessage,
  getBizErrorMessage 
} from '../../utils/messages/businessMessages.js';
import { 
  businessMainMenuKeyboard,
  minPeopleKeyboard,
  durationKeyboard,
  dealConfirmKeyboard,
  businessDealCardKeyboard,
  cancelKeyboard
} from '../../utils/keyboards/businessKeyboards.js';

/**
 * Реєстрація обробників створення/управління пропозиціями
 */
export const registerBusinessDealsHandlers = (bot) => {
  // Нова пропозиція (текстова кнопка)
  bot.hears('➕ Нова пропозиція', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      
      if (!business) {
        await ctx.reply('Спочатку зареєструй свій бізнес!');
        return;
      }

      await db.updateBusinessState(ctx.from.id, 'creating_deal_title', {});
      
      await ctx.reply(getDealCreationSteps.title, {
        parse_mode: 'HTML',
        reply_markup: cancelKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in new deal:', error);
      await ctx.reply(getBizErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Мої пропозиції (текстова кнопка)
  bot.hears('📊 Мої пропозиції', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      
      if (!business) {
        await ctx.reply('Спочатку зареєструй свій бізнес!');
        return;
      }

      const deals = await db.getBusinessDeals(business.id);
      
      if (deals.length === 0) {
        await ctx.reply(getNoBizDealsMessage(), {
          parse_mode: 'HTML',
          reply_markup: businessMainMenuKeyboard.reply_markup,
        });
        return;
      }

      await ctx.reply(`📊 <b>Твої пропозиції (${deals.length}):</b>`, { parse_mode: 'HTML' });
      
      for (const deal of deals) {
        await ctx.reply(getBizDealCardMessage(deal), {
          parse_mode: 'HTML',
          reply_markup: businessDealCardKeyboard(deal.id).reply_markup,
        });
      }
    } catch (error) {
      console.error('Error in my deals:', error);
      await ctx.reply(getBizErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Статистика (текстова кнопка)
  bot.hears('📈 Статистика', async (ctx) => {
    // Викликаємо команду /stats
    ctx.message.text = '/stats';
    await bot.handleUpdate({ message: ctx.message });
  });

  // Вибір мінімальної кількості людей
  bot.action(/deal_minpeople_(\d+)/, async (ctx) => {
    try {
      const minPeople = parseInt(ctx.match[1]);
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      const stateData = business?.state_data || {};
      
      await db.updateBusinessState(ctx.from.id, 'creating_deal_duration', {
        ...stateData,
        min_people: minPeople,
      });

      await ctx.answerCbQuery();
      await ctx.editMessageText(getDealCreationSteps.duration, {
        parse_mode: 'HTML',
        reply_markup: durationKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in minpeople selection:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Вибір терміну дії
  bot.action(/deal_duration_(\d+)/, async (ctx) => {
    try {
      const duration = parseInt(ctx.match[1]);
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      const stateData = business?.state_data || {};
      
      const dealData = {
        ...stateData,
        duration_days: duration,
      };

      await db.updateBusinessState(ctx.from.id, 'confirming_deal', dealData);

      await ctx.answerCbQuery();
      await ctx.editMessageText(getDealPreviewMessage(dealData), {
        parse_mode: 'HTML',
        reply_markup: dealConfirmKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in duration selection:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Публікація пропозиції
  bot.action('deal_publish', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      const stateData = business?.state_data || {};
      
      if (!stateData.title || !stateData.original_price || !stateData.discount_price) {
        await ctx.answerCbQuery('Недостатньо даних для створення пропозиції');
        return;
      }

      // Створюємо пропозицію
      const deal = await db.createDeal(business.id, {
        title: stateData.title,
        original_price: stateData.original_price,
        discount_price: stateData.discount_price,
        min_people: stateData.min_people || 10,
        duration_days: stateData.duration_days || 7,
      });

      if (!deal) {
        await ctx.answerCbQuery('Помилка створення пропозиції');
        return;
      }

      await db.updateBusinessState(ctx.from.id, 'idle', {});

      await ctx.answerCbQuery('✅ Опубліковано!');
      await ctx.editMessageText(getDealPublishedMessage(deal), {
        parse_mode: 'HTML',
        reply_markup: businessMainMenuKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in deal publish:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Редагування (повернення до початку)
  bot.action('deal_edit', async (ctx) => {
    try {
      await db.updateBusinessState(ctx.from.id, 'creating_deal_title', {});
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(getDealCreationSteps.title, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error('Error in deal edit:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Скасування створення
  bot.action('deal_cancel', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      await db.updateBusinessState(ctx.from.id, 'idle', {});
      
      await ctx.answerCbQuery('Скасовано');
      await ctx.editMessageText(getBizMainMenuMessage(business), {
        parse_mode: 'HTML',
        reply_markup: businessMainMenuKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in deal cancel:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Статистика акції
  bot.action(/biz_deal_stats_(\d+)/, async (ctx) => {
    try {
      const dealId = parseInt(ctx.match[1]);
      const deal = await db.getDealById(dealId);
      
      if (!deal) {
        await ctx.answerCbQuery('Пропозицію не знайдено');
        return;
      }

      const bookings = await db.getDealBookings(dealId);
      const usedBookings = bookings.filter(b => ['used', 'confirmed'].includes(b.status));
      
      const statsMessage = `📈 <b>Статистика акції</b>

🏷️ ${deal.title}

━━━━━━━━━━━━━━━
👥 Приєдналось: ${deal.current_people}
🎫 Використано кодів: ${usedBookings.length}
💰 Потенційний дохід: ${deal.current_people * deal.discount_price} грн
━━━━━━━━━━━━━━━`;

      await ctx.answerCbQuery();
      await ctx.reply(statsMessage, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error in deal stats:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Завершення акції достроково
  bot.action(/biz_deal_end_(\d+)/, async (ctx) => {
    try {
      const dealId = parseInt(ctx.match[1]);
      
      await db.updateDealStatus(dealId, 'completed');
      
      // Створюємо звіт
      const deal = await db.getDealById(dealId);
      if (deal) {
        await db.createOrUpdateReport(deal.businesses.id, dealId);
      }
      
      await ctx.answerCbQuery('✅ Акцію завершено');
      await ctx.reply('Акцію завершено. Звіт буде доступний у розділі статистики.', {
        reply_markup: businessMainMenuKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in deal end:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Головне меню бізнесу
  bot.action('biz_main_menu', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      
      await ctx.answerCbQuery();
      await ctx.reply(getBizMainMenuMessage(business), {
        parse_mode: 'HTML',
        reply_markup: businessMainMenuKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in biz main menu:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });
};

/**
 * Обробка текстових повідомлень при створенні пропозиції
 */
export const handleDealCreationText = async (ctx, business) => {
  const state = business?.state;
  const stateData = business?.state_data || {};
  const text = ctx.message.text;

  switch (state) {
    case 'creating_deal_title':
      if (text.length < 3 || text.length > 100) {
        await ctx.reply('❌ Назва має бути від 3 до 100 символів. Спробуй ще раз:');
        return true;
      }
      
      await db.updateBusinessState(ctx.from.id, 'creating_deal_original_price', {
        title: text,
      });
      
      await ctx.reply(getDealCreationSteps.originalPrice, {
        parse_mode: 'HTML',
      });
      return true;

    case 'creating_deal_original_price':
      const originalPrice = parseInt(text);
      if (isNaN(originalPrice) || originalPrice < 10 || originalPrice > 100000) {
        await ctx.reply('❌ Введи коректну ціну (число від 10 до 100000):');
        return true;
      }
      
      await db.updateBusinessState(ctx.from.id, 'creating_deal_discount_price', {
        ...stateData,
        original_price: originalPrice,
      });
      
      await ctx.reply(getDealCreationSteps.discountPrice, {
        parse_mode: 'HTML',
      });
      return true;

    case 'creating_deal_discount_price':
      const discountPrice = parseInt(text);
      if (isNaN(discountPrice) || discountPrice < 10) {
        await ctx.reply('❌ Введи коректну ціну (число від 10):');
        return true;
      }
      
      if (discountPrice >= stateData.original_price) {
        await ctx.reply('❌ Ціна зі знижкою має бути менше за звичайну ціну. Спробуй ще раз:');
        return true;
      }
      
      await db.updateBusinessState(ctx.from.id, 'creating_deal_min_people', {
        ...stateData,
        discount_price: discountPrice,
      });
      
      await ctx.reply(getDealCreationSteps.minPeople, {
        parse_mode: 'HTML',
        reply_markup: minPeopleKeyboard.reply_markup,
      });
      return true;

    default:
      return false;
  }
};

