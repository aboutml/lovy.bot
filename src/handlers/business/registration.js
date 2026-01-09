import { db } from '../../db/database.js';
import { 
  getBizWelcomeMessage, 
  getBizHowItWorksMessage,
  getBizRegistrationSteps,
  getBizRegistrationCompleteMessage,
  getBizMainMenuMessage,
  getBizErrorMessage 
} from '../../utils/messages/businessMessages.js';
import { 
  startKeyboard, 
  businessMainMenuKeyboard,
  categorySelectionKeyboard,
  businessCityKeyboard,
  cancelKeyboard,
  skipKeyboard
} from '../../utils/keyboards/businessKeyboards.js';
import { isValidPhone, formatPhone } from '../../utils/helpers.js';
import { uploadTelegramPhoto } from '../../services/storage.js';

/**
 * Реєстрація обробників реєстрації бізнесу
 */
export const registerBusinessRegistrationHandlers = (bot) => {
  // Як це працює
  bot.action('business_how_it_works', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.editMessageText(getBizHowItWorksMessage(), {
        parse_mode: 'HTML',
        reply_markup: startKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in how_it_works:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Початок реєстрації
  bot.action('business_register', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      
      // Перевіряємо чи вже зареєстрований
      const existing = await db.getBusinessByTelegramId(ctx.from.id);
      if (existing && existing.name) {
        await ctx.editMessageText(getBizMainMenuMessage(existing), {
          parse_mode: 'HTML',
          reply_markup: businessMainMenuKeyboard.reply_markup,
        });
        return;
      }

      // Створюємо порожній запис бізнесу зі станом реєстрації
      if (!existing) {
        await db.createBusiness(ctx.from.id, { 
          state: 'registering_name',
          state_data: {} 
        });
      } else {
        await db.updateBusinessState(ctx.from.id, 'registering_name', {});
      }
      
      await ctx.reply(getBizRegistrationSteps.name, {
        parse_mode: 'HTML',
        reply_markup: cancelKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in business_register:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Вибір категорії
  bot.action(/biz_cat_(\w+)/, async (ctx) => {
    try {
      const categorySlug = ctx.match[1];
      const category = await db.getCategoryBySlug(categorySlug);
      
      if (!category) {
        await ctx.answerCbQuery('Категорію не знайдено');
        return;
      }

      const business = await db.getBusinessByTelegramId(ctx.from.id);
      const stateData = business?.state_data || {};
      
      await db.updateBusinessState(ctx.from.id, 'registering_city', {
        ...stateData,
        category_id: category.id,
      });

      await ctx.answerCbQuery();
      await ctx.editMessageText(getBizRegistrationSteps.city, {
        parse_mode: 'HTML',
        reply_markup: businessCityKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in category selection:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Вибір міста
  bot.action(/biz_city_(\w+)/, async (ctx) => {
    try {
      const citySlug = ctx.match[1];
      const city = await db.getCityBySlug(citySlug);
      
      if (!city) {
        await ctx.answerCbQuery('Місто не знайдено');
        return;
      }

      const business = await db.getBusinessByTelegramId(ctx.from.id);
      const stateData = business?.state_data || {};
      
      await db.updateBusinessState(ctx.from.id, 'registering_address', {
        ...stateData,
        city_id: city.id,
      });

      await ctx.answerCbQuery();
      await ctx.reply(getBizRegistrationSteps.address, {
        parse_mode: 'HTML',
        reply_markup: cancelKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in city selection:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Скасування реєстрації
  bot.hears('❌ Скасувати', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      
      // Якщо бізнес вже зареєстрований - показуємо меню
      if (business?.name) {
        await db.updateBusinessState(ctx.from.id, 'idle', {});
        await ctx.reply(getBizMainMenuMessage(business), {
          parse_mode: 'HTML',
          reply_markup: businessMainMenuKeyboard.reply_markup,
        });
      } else {
        // Інакше - стартове меню
        await db.updateBusinessState(ctx.from.id, 'idle', {});
        await ctx.reply('Реєстрацію скасовано.', {
          reply_markup: startKeyboard.reply_markup,
        });
      }
    } catch (error) {
      console.error('Error in cancel:', error);
      await ctx.reply(getBizErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Пропустити крок (для опціональних полів)
  bot.hears('⏭️ Пропустити', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      const state = business?.state;
      const stateData = business?.state_data || {};

      if (state === 'registering_photo') {
        // Завершуємо реєстрацію без фото
        await db.updateBusiness(ctx.from.id, {
          category_id: stateData.category_id,
          city_id: stateData.city_id,
          address: stateData.address,
          social_link: stateData.social_link || null,
        });
        
        await db.updateBusinessState(ctx.from.id, 'idle', {});
        
        const updatedBusiness = await db.getBusinessByTelegramId(ctx.from.id);
        
        await ctx.reply(getBizRegistrationCompleteMessage(updatedBusiness), {
          parse_mode: 'HTML',
          reply_markup: businessMainMenuKeyboard.reply_markup,
        });
      }
    } catch (error) {
      console.error('Error in skip:', error);
      await ctx.reply(getBizErrorMessage(), { parse_mode: 'HTML' });
    }
  });
};

/**
 * Обробка текстових повідомлень в процесі реєстрації
 */
export const handleRegistrationText = async (ctx, business) => {
  const state = business?.state;
  const stateData = business?.state_data || {};
  const text = ctx.message.text;

  switch (state) {
    case 'registering_name':
      if (text.length < 2 || text.length > 100) {
        await ctx.reply('❌ Назва має бути від 2 до 100 символів. Спробуй ще раз:');
        return true;
      }
      
      // Оновлюємо запис бізнесу з назвою
      await db.updateBusiness(ctx.from.id, { name: text });
      await db.updateBusinessState(ctx.from.id, 'registering_category', { name: text });
      
      await ctx.reply(getBizRegistrationSteps.category, {
        parse_mode: 'HTML',
        reply_markup: categorySelectionKeyboard.reply_markup,
      });
      return true;

    case 'registering_address':
      if (text.length < 5 || text.length > 200) {
        await ctx.reply('❌ Адреса має бути від 5 до 200 символів. Спробуй ще раз:');
        return true;
      }
      
      await db.updateBusinessState(ctx.from.id, 'registering_social', {
        ...stateData,
        address: text,
      });
      
      await ctx.reply(getBizRegistrationSteps.social, {
        parse_mode: 'HTML',
        reply_markup: cancelKeyboard.reply_markup,
      });
      return true;

    case 'registering_social':
      // Перевіряємо що це схоже на посилання
      const isLink = text.startsWith('http://') || text.startsWith('https://') || text.startsWith('@') || text.includes('.com') || text.includes('.ua');
      
      if (!isLink && text.length > 5) {
        await ctx.reply('❌ Введи посилання на соц. мережу або нікнейм (@username):');
        return true;
      }
      
      await db.updateBusinessState(ctx.from.id, 'registering_photo', {
        ...stateData,
        social_link: text,
      });
      
      await ctx.reply(getBizRegistrationSteps.photo, {
        parse_mode: 'HTML',
        reply_markup: skipKeyboard.reply_markup,
      });
      return true;

    default:
      return false;
  }
};

/**
 * Обробка фото при реєстрації
 * Зберігаємо Telegram file_id - фото зберігається на серверах Telegram безкоштовно
 */
export const handleRegistrationPhoto = async (ctx, business) => {
  const state = business?.state;
  const stateData = business?.state_data || {};

  if (state !== 'registering_photo') {
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
      await ctx.reply('❌ Помилка завантаження фото. Спробуй ще раз або пропусти цей крок.');
      return true;
    }

    // Завершуємо реєстрацію з URL фото
    await db.updateBusiness(ctx.from.id, {
      category_id: stateData.category_id,
      city_id: stateData.city_id,
      address: stateData.address,
      social_link: stateData.social_link || null,
      image_url: imageUrl,
    });
    
    await db.updateBusinessState(ctx.from.id, 'idle', {});
    
    const updatedBusiness = await db.getBusinessByTelegramId(ctx.from.id);
    
    await ctx.reply(getBizRegistrationCompleteMessage(updatedBusiness), {
      parse_mode: 'HTML',
      reply_markup: businessMainMenuKeyboard.reply_markup,
    });
    return true;
  } catch (error) {
    console.error('Error handling photo:', error);
    await ctx.reply('❌ Помилка завантаження фото. Спробуй ще раз або пропусти цей крок.');
    return true;
  }
};

