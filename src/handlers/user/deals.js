import { db } from '../../db/database.js';
import { 
  getDealCardMessage, 
  getDealDetailsMessage, 
  getAfterJoinMessage,
  getCodeActivatedMessage,
  getNoDealsMessage, 
  getAlreadyJoinedMessage,
  getErrorMessage 
} from '../../utils/messages/userMessages.js';
import { 
  mainMenuKeyboard, 
  dealCardInlineKeyboard, 
  dealDetailsInlineKeyboard,
  afterJoinInlineKeyboard,
  activatedCodeInlineKeyboard,
  backKeyboard
} from '../../utils/keyboards/userKeyboards.js';
import { generateUniqueCode } from '../../utils/codeGenerator.js';

// Мапінг категорій
const categoryMapping = {
  '💅 Краса': 'beauty',
  '🍕 Їжа': 'food',
  '🎯 Послуги': 'services',
  '🏋️ Спорт': 'sport',
  '🎭 Розваги': 'entertainment',
  '💊 Здоров\'я': 'health',
};

/**
 * Відправка картки пропозиції з фото (якщо є) або без
 */
const sendDealCard = async (ctx, deal) => {
  const imageUrl = deal.businesses?.image_url;
  const message = getDealCardMessage(deal);
  const keyboard = dealCardInlineKeyboard(deal.id).reply_markup;

  if (imageUrl) {
    try {
      await ctx.replyWithPhoto(imageUrl, {
        caption: message,
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
      return;
    } catch (error) {
      console.error('Error sending photo, falling back to text:', error.message);
    }
  }

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
};

/**
 * Реєстрація обробників акцій
 */
export const registerDealsHandlers = (bot) => {
  // Гарячі пропозиції
  bot.hears('🔥 Гарячі пропозиції', async (ctx) => {
    try {
      const user = await db.getUserByTelegramId(ctx.from.id);
      
      if (!user?.city_id) {
        await ctx.reply('Спочатку обери місто!');
        return;
      }

      const deals = await db.getHotDeals(user.city_id, 5);
      
      if (deals.length === 0) {
        await ctx.reply(getNoDealsMessage(), { parse_mode: 'HTML' });
        return;
      }

      await ctx.reply('🔥 <b>Гарячі пропозиції</b>\n\nНайпопулярніші акції у твоєму місті:', { 
        parse_mode: 'HTML' 
      });

      for (const deal of deals) {
        await sendDealCard(ctx, deal);
      }
    } catch (error) {
      console.error('Error in hot deals:', error);
      await ctx.reply(getErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Обробка категорій
  bot.hears(Object.keys(categoryMapping), async (ctx) => {
    try {
      const categorySlug = categoryMapping[ctx.message.text];
      
      if (!categorySlug) return;

      const user = await db.getUserByTelegramId(ctx.from.id);
      
      if (!user?.city_id) {
        await ctx.reply('Спочатку обери місто!');
        return;
      }

      const category = await db.getCategoryBySlug(categorySlug);
      const deals = await db.getActiveDeals(user.city_id, categorySlug, 10);
      
      if (deals.length === 0) {
        await ctx.reply(getNoDealsMessage(category?.name), { parse_mode: 'HTML' });
        return;
      }

      await ctx.reply(`${category?.emoji || ''} <b>${category?.name || 'Пропозиції'}</b>\n\nЗнайдено ${deals.length} пропозицій:`, { 
        parse_mode: 'HTML' 
      });

      for (const deal of deals) {
        await sendDealCard(ctx, deal);
      }
    } catch (error) {
      console.error('Error in category deals:', error);
      await ctx.reply(getErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Детальний перегляд акції
  bot.action(/deal_view_(\d+)/, async (ctx) => {
    try {
      const dealId = parseInt(ctx.match[1]);
      const deal = await db.getDealById(dealId);
      
      if (!deal) {
        await ctx.answerCbQuery('Пропозицію не знайдено');
        return;
      }

      const user = await db.getUserByTelegramId(ctx.from.id);
      const existingBooking = await db.getUserBooking(user?.id, dealId);
      const isJoined = !!existingBooking;

      const detailsMessage = getDealDetailsMessage(deal, isJoined);
      const keyboard = dealDetailsInlineKeyboard(dealId, isJoined).reply_markup;

      // Перевіряємо чи це повідомлення з фото
      if (ctx.callbackQuery.message.photo) {
        await ctx.editMessageCaption(detailsMessage, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
      } else {
        await ctx.editMessageText(detailsMessage, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
      }
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in deal view:', error);
      await ctx.answerCbQuery('Помилка. Спробуй ще раз.');
    }
  });

  // Приєднатися до акції
  bot.action(/deal_join_(\d+)/, async (ctx) => {
    try {
      const dealId = parseInt(ctx.match[1]);
      const deal = await db.getDealById(dealId);
      
      if (!deal) {
        await ctx.answerCbQuery('Пропозицію не знайдено');
        return;
      }

      if (deal.status !== 'active' && deal.status !== 'activated') {
        await ctx.answerCbQuery('Ця пропозиція вже не активна');
        return;
      }

      const user = await db.getUserByTelegramId(ctx.from.id);
      
      if (!user) {
        await ctx.answerCbQuery('Спочатку натисни /start');
        return;
      }

      // Перевіряємо чи вже приєднався
      const existingBooking = await db.getUserBooking(user.id, dealId);
      
      if (existingBooking) {
        await ctx.answerCbQuery('Ти вже приєднався до цієї пропозиції!');
        
        // Показуємо інформацію про бронювання
        if (existingBooking.status === 'activated') {
          const message = getCodeActivatedMessage(existingBooking, deal);
          const keyboard = activatedCodeInlineKeyboard(existingBooking).reply_markup;
          
          if (ctx.callbackQuery.message.photo) {
            await ctx.editMessageCaption(message, { parse_mode: 'HTML', reply_markup: keyboard });
          } else {
            await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
          }
        }
        return;
      }

      // Генеруємо код та створюємо бронювання
      const code = await generateUniqueCode(db);
      const booking = await db.createBooking(user.id, dealId, code);
      
      if (!booking) {
        await ctx.answerCbQuery('Помилка при бронюванні. Спробуй ще раз.');
        return;
      }

      // Оновлюємо дані акції
      const updatedDeal = await db.getDealById(dealId);

      // Перевіряємо чи набралось достатньо людей
      const isPhotoMessage = ctx.callbackQuery.message.photo;
      
      if (updatedDeal.current_people >= updatedDeal.min_people && updatedDeal.status === 'active') {
        // Активуємо акцію
        await db.updateDealStatus(dealId, 'activated');
        // Активуємо всі бронювання
        await db.activateDealBookings(dealId);
        
        // Оновлюємо бронювання
        const activatedBooking = await db.getBookingByCode(code);
        
        const message = getCodeActivatedMessage(activatedBooking, updatedDeal);
        const keyboard = activatedCodeInlineKeyboard(activatedBooking).reply_markup;
        
        if (isPhotoMessage) {
          await ctx.editMessageCaption(message, { parse_mode: 'HTML', reply_markup: keyboard });
        } else {
          await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
        }
      } else {
        // Показуємо повідомлення про приєднання
        const message = getAfterJoinMessage(updatedDeal);
        const keyboard = afterJoinInlineKeyboard(dealId).reply_markup;
        
        if (isPhotoMessage) {
          await ctx.editMessageCaption(message, { parse_mode: 'HTML', reply_markup: keyboard });
        } else {
          await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
        }
      }
      
      await ctx.answerCbQuery('🎉 Ти приєднався!');
    } catch (error) {
      console.error('Error in deal join:', error);
      await ctx.answerCbQuery('Помилка. Спробуй ще раз.');
    }
  });

  // Поділитися акцією
  bot.action(/deal_share_(\d+)/, async (ctx) => {
    try {
      const dealId = parseInt(ctx.match[1]);
      const deal = await db.getDealById(dealId);
      
      if (!deal) {
        await ctx.answerCbQuery('Пропозицію не знайдено');
        return;
      }

      const botInfo = await ctx.telegram.getMe();
      const botLink = `https://t.me/${botInfo.username}`;

      await ctx.answerCbQuery();
      await ctx.reply(
        `📤 <b>Поділись з друзями!</b>\n\n` +
        `Надішли це повідомлення другу:\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🎁 Подивись яка класна знижка!\n\n` +
        `${deal.businesses?.categories?.emoji || ''} ${deal.title}\n` +
        `🏪 ${deal.businesses?.name}\n` +
        `📍 ${deal.businesses?.cities?.name || ''}\n` +
        `💰 Всього ${deal.discount_price} грн замість ${deal.original_price} грн!\n\n` +
        `👉 ${botLink}\n` +
        `━━━━━━━━━━━━━━━`,
        { 
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🤖 Відкрити бот', url: botLink }]
            ]
          }
        }
      );
    } catch (error) {
      console.error('Error in deal share:', error);
      await ctx.answerCbQuery('Помилка. Спробуй ще раз.');
    }
  });

  // Назад до списку
  bot.action('deals_back', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.reply('Обери категорію або подивись гарячі пропозиції 👇', {
        reply_markup: mainMenuKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in deals back:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Головне меню
  bot.action('main_menu', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const user = await db.getUserByTelegramId(ctx.from.id);
      const cityName = user?.cities?.name || 'Твоє місто';
      
      await ctx.reply(`📍 ${cityName}\n\nОбери категорію або подивись гарячі пропозиції 👇`, {
        parse_mode: 'HTML',
        reply_markup: mainMenuKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in main menu:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Кнопка "Назад"
  bot.hears('🔙 Назад', async (ctx) => {
    try {
      const user = await db.getUserByTelegramId(ctx.from.id);
      const cityName = user?.cities?.name || 'Твоє місто';
      
      await ctx.reply(`📍 ${cityName}\n\nОбери категорію або подивись гарячі пропозиції 👇`, {
        parse_mode: 'HTML',
        reply_markup: mainMenuKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in back button:', error);
      await ctx.reply(getErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Головне меню (текстова кнопка)
  bot.hears('🏠 Головне меню', async (ctx) => {
    try {
      const user = await db.getUserByTelegramId(ctx.from.id);
      const cityName = user?.cities?.name || 'Твоє місто';
      
      await ctx.reply(`📍 ${cityName}\n\nОбери категорію або подивись гарячі пропозиції 👇`, {
        parse_mode: 'HTML',
        reply_markup: mainMenuKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in home button:', error);
      await ctx.reply(getErrorMessage(), { parse_mode: 'HTML' });
    }
  });
};

