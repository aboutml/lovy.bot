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
  cancelKeyboard
} from '../../utils/keyboards/businessKeyboards.js';
import { isValidPhone, formatPhone, isValidSocialLink } from '../../utils/helpers.js';

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

  // Початок реєстрації (перший бізнес або продовження незавершеної)
  bot.action('business_register', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const list = await db.getBusinessesByTelegramId(ctx.from.id);
      const current = list.length > 0 ? await db.getCurrentBusiness(ctx.from.id) : null;

      if (current?.name) {
        await ctx.editMessageText(getBizMainMenuMessage(current), {
          parse_mode: 'HTML',
          reply_markup: businessMainMenuKeyboard.reply_markup,
        });
        return;
      }

      if (list.length === 0) {
        await db.createBusiness(ctx.from.id, { state: 'registering_name', state_data: {} });
      } else {
        await db.updateBusinessState(current.id, 'registering_name', {});
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

  // Додати ще один бізнес (inline з списку)
  bot.action('biz_add_business', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await db.createBusiness(ctx.from.id, { state: 'registering_name', state_data: {} });
      await ctx.reply(getBizRegistrationSteps.name, {
        parse_mode: 'HTML',
        reply_markup: cancelKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in biz_add_business:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Переключити на інший бізнес
  bot.action(/biz_switch_(\d+)/, async (ctx) => {
    try {
      const businessId = parseInt(ctx.match[1]);
      const business = await db.getBusinessById(businessId);
      if (!business || business.telegram_id !== ctx.from.id) {
        await ctx.answerCbQuery('Бізнес не знайдено');
        return;
      }
      await db.setCurrentBusiness(ctx.from.id, businessId);
      await ctx.answerCbQuery(`Обрано: ${business.name || 'Бізнес'}`);
      await ctx.deleteMessage().catch(() => {});
      await ctx.reply(getBizMainMenuMessage(business), {
        parse_mode: 'HTML',
        reply_markup: businessMainMenuKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in biz_switch:', error);
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
      
      await db.updateBusinessState(business.id, 'registering_city', {
        ...stateData,
        category_id: category.id,
      });

      // Отримуємо активні міста з бази
      const cities = await db.getAllCities();

      await ctx.answerCbQuery();
      await ctx.editMessageText(getBizRegistrationSteps.city, {
        parse_mode: 'HTML',
        reply_markup: businessCityKeyboard(cities).reply_markup,
      });
    } catch (error) {
      console.error('Error in category selection:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Вибір міста (по ID)
  bot.action(/biz_city_(\d+)/, async (ctx) => {
    try {
      const cityId = parseInt(ctx.match[1]);

      const business = await db.getBusinessByTelegramId(ctx.from.id);
      const stateData = business?.state_data || {};
      
      await db.updateBusinessState(business.id, 'registering_address', {
        ...stateData,
        city_id: cityId,
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
      
      if (business?.name) {
        await db.updateBusinessState(business.id, 'idle', {});
        await ctx.reply(getBizMainMenuMessage(business), {
          parse_mode: 'HTML',
          reply_markup: businessMainMenuKeyboard.reply_markup,
        });
      } else {
        await db.updateBusinessState(business.id, 'idle', {});
        await ctx.reply('Реєстрацію скасовано.', {
          reply_markup: startKeyboard.reply_markup,
        });
      }
    } catch (error) {
      console.error('Error in cancel:', error);
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
      
      await db.updateBusinessById(business.id, { name: text });
      await db.updateBusinessState(business.id, 'registering_category', { name: text });
      
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
      
      await db.updateBusinessState(business.id, 'registering_social', {
        ...stateData,
        address: text,
      });
      
      await ctx.reply(getBizRegistrationSteps.social, {
        parse_mode: 'HTML',
        reply_markup: cancelKeyboard.reply_markup,
      });
      return true;

    case 'registering_social':
      // Валідація соц. мережі (тільки Instagram, TikTok, Telegram)
      const socialValidation = isValidSocialLink(text);
      
      if (!socialValidation.valid) {
        await ctx.reply(socialValidation.error, { parse_mode: 'HTML' });
        return true;
      }
      
      // Зберігаємо нормалізоване значення (якщо є)
      const socialLink = socialValidation.normalized || text;
      
      await db.updateBusinessById(business.id, {
        category_id: stateData.category_id,
        city_id: stateData.city_id,
        address: stateData.address,
        social_link: socialLink,
      });
      await db.updateBusinessState(business.id, 'idle', {});
      const updatedBusiness = await db.getBusinessById(business.id);
      
      await ctx.reply(getBizRegistrationCompleteMessage(updatedBusiness), {
        parse_mode: 'HTML',
        reply_markup: businessMainMenuKeyboard.reply_markup,
      });
      return true;

    default:
      return false;
  }
};

