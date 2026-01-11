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
  cancelKeyboard,
  skipKeyboard
} from '../../utils/keyboards/businessKeyboards.js';
import { isAdmin } from '../../utils/helpers.js';
import { uploadTelegramPhoto } from '../../services/storage.js';

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
          reply_markup: businessDealCardKeyboard(deal.id, deal.status === 'completed').reply_markup,
        });
      }
    } catch (error) {
      console.error('Error in my deals:', error);
      await ctx.reply(getBizErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Статистика (текстова кнопка)
  bot.hears('📈 Статистика', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      
      if (!business) {
        await ctx.reply('Спочатку зареєструй свій бізнес!');
        return;
      }

      const deals = await db.getBusinessDeals(business.id);
      const activeDeals = deals.filter(d => d.status === 'active');
      const completedDeals = deals.filter(d => d.status === 'completed');
      
      // Рахуємо загальну статистику
      let totalBookings = 0;
      let totalUsed = 0;
      let totalRevenue = 0;
      
      for (const deal of deals) {
        const bookings = await db.getDealBookings(deal.id);
        totalBookings += bookings.length;
        const used = bookings.filter(b => ['used', 'confirmed'].includes(b.status));
        totalUsed += used.length;
        totalRevenue += used.length * deal.discount_price;
      }

      const commission = Math.round(totalRevenue * 0.15);

      const statsMessage = `📈 <b>Загальна статистика</b>

🏢 <b>${business.name}</b>

━━━━━━━━━━━━━━━
📊 <b>Пропозиції:</b>
• Активних: ${activeDeals.length}
• Завершених: ${completedDeals.length}
• Всього: ${deals.length}

━━━━━━━━━━━━━━━
👥 <b>Клієнти:</b>
• Всього записів: ${totalBookings}
• Використано кодів: ${totalUsed}

━━━━━━━━━━━━━━━
💰 <b>Фінанси:</b>
• Загальний дохід: ${totalRevenue} грн
• Комісія сервісу (15%): ${commission} грн
━━━━━━━━━━━━━━━`;

      await ctx.reply(statsMessage, { 
        parse_mode: 'HTML',
        reply_markup: businessMainMenuKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in stats:', error);
      await ctx.reply('Помилка отримання статистики');
    }
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
        reply_markup: durationKeyboard(isAdmin(ctx.from.id)).reply_markup,
      });
    } catch (error) {
      console.error('Error in minpeople selection:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Вибір терміну дії (дні)
  bot.action(/deal_duration_(\d+)$/, async (ctx) => {
    try {
      const duration = parseInt(ctx.match[1]);
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      const stateData = business?.state_data || {};
      
      await db.updateBusinessState(ctx.from.id, 'creating_deal_photo', {
        ...stateData,
        duration_days: duration,
        duration_minutes: null,
      });

      await ctx.answerCbQuery();
      await ctx.editMessageText(getDealCreationSteps.photo, {
        parse_mode: 'HTML',
      });
      await ctx.reply('Надішли фото або натисни "Пропустити" 👇', {
        reply_markup: skipKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in duration selection:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Вибір терміну дії (хвилини - для тестування)
  bot.action(/deal_duration_min_(\d+)/, async (ctx) => {
    try {
      const minutes = parseInt(ctx.match[1]);
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      const stateData = business?.state_data || {};
      
      await db.updateBusinessState(ctx.from.id, 'creating_deal_photo', {
        ...stateData,
        duration_days: null,
        duration_minutes: minutes,
        // Для тестових акцій — короткий термін дії коду (1 день)
        validity_days: 1,
      });

      await ctx.answerCbQuery();
      await ctx.editMessageText(getDealCreationSteps.photo, {
        parse_mode: 'HTML',
      });
      await ctx.reply('Надішли фото або натисни "Пропустити" 👇', {
        reply_markup: skipKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in minutes duration selection:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Пропустити фото
  bot.hears('⏭️ Пропустити', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      
      if (business?.state !== 'creating_deal_photo') return;
      
      const stateData = business?.state_data || {};
      
      await db.updateBusinessState(ctx.from.id, 'confirming_deal', stateData);

      await ctx.reply(getDealPreviewMessage(stateData), {
        parse_mode: 'HTML',
        reply_markup: dealConfirmKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in skip photo:', error);
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
      const dealData = {
        title: stateData.title,
        original_price: stateData.original_price,
        discount_price: stateData.discount_price,
        min_people: stateData.min_people || 10,
        image_url: stateData.image_url || null,
      };
      
      // Додаємо опціональні поля тільки якщо вони задані
      if (stateData.duration_days) dealData.duration_days = stateData.duration_days;
      if (stateData.duration_minutes) dealData.duration_minutes = stateData.duration_minutes;
      if (stateData.validity_days) dealData.validity_days = stateData.validity_days;
      
      const deal = await db.createDeal(business.id, dealData);

      if (!deal) {
        await ctx.answerCbQuery('Помилка створення пропозиції');
        return;
      }

      await db.updateBusinessState(ctx.from.id, 'idle', {});

      await ctx.answerCbQuery('✅ Опубліковано!');
      
      // Видаляємо попереднє повідомлення і відправляємо нове з Reply Keyboard
      try {
        await ctx.deleteMessage();
      } catch (e) {
        // Ігноруємо помилку видалення
      }
      
      await ctx.reply(getDealPublishedMessage(deal), {
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
      const deal = await db.getDealById(dealId);
      
      if (!deal) {
        await ctx.answerCbQuery('Пропозицію не знайдено');
        return;
      }

      // Перевіряємо чи не завершена
      if (deal.status === 'completed') {
        await ctx.answerCbQuery('Ця пропозиція вже завершена');
        return;
      }
      
      await db.updateDealStatus(dealId, 'completed');
      
      // Створюємо звіт
      if (deal.businesses) {
        await db.createOrUpdateReport(deal.businesses.id, dealId);
      }
      
      await ctx.answerCbQuery('✅ Акцію завершено');
      await ctx.editMessageText(getBizDealCardMessage({ ...deal, status: 'completed' }), {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📊 Детальна статистика', callback_data: `biz_deal_stats_${dealId}` }],
          ],
        },
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
        reply_markup: minPeopleKeyboard(isAdmin(ctx.from.id)).reply_markup,
      });
      return true;

    default:
      return false;
  }
};

/**
 * Обробка фото при створенні пропозиції
 */
export const handleDealPhoto = async (ctx, business) => {
  const state = business?.state;
  const stateData = business?.state_data || {};

  if (state !== 'creating_deal_photo') {
    return false;
  }

  try {
    // Отримуємо найбільше фото
    const photos = ctx.message.photo;
    const photo = photos[photos.length - 1];
    const fileId = photo.file_id;

    // Показуємо повідомлення про завантаження
    await ctx.reply('⏳ Завантажую фото...');

    // Завантажуємо фото в Supabase Storage
    const imageUrl = await uploadTelegramPhoto(ctx, fileId);

    if (!imageUrl) {
      await ctx.reply('❌ Помилка завантаження фото. Спробуй ще раз або пропусти цей крок.', {
        reply_markup: skipKeyboard.reply_markup,
      });
      return true;
    }

    // Зберігаємо URL фото і переходимо до підтвердження
    const dealData = {
      ...stateData,
      image_url: imageUrl,
    };

    await db.updateBusinessState(ctx.from.id, 'confirming_deal', dealData);

    await ctx.reply(getDealPreviewMessage(dealData), {
      parse_mode: 'HTML',
      reply_markup: dealConfirmKeyboard.reply_markup,
    });

    return true;
  } catch (error) {
    console.error('Error handling deal photo:', error);
    await ctx.reply('❌ Помилка завантаження фото. Спробуй ще раз або пропусти цей крок.', {
      reply_markup: skipKeyboard.reply_markup,
    });
    return true;
  }
};

