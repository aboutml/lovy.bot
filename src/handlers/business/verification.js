import { db } from '../../db/database.js';
import { 
  getCodeCheckPromptMessage,
  getCodeInfoMessage,
  getCodeNotFoundMessage,
  getCodeAlreadyUsedMessage,
  getVisitConfirmedMessage,
  getBizMainMenuMessage,
  getBizErrorMessage 
} from '../../utils/messages/businessMessages.js';
import { 
  businessMainMenuKeyboard,
  confirmVisitKeyboard,
  cancelKeyboard
} from '../../utils/keyboards/businessKeyboards.js';
import { normalizeCode, isValidCodeFormat } from '../../utils/codeGenerator.js';
import { notificationService } from '../../services/notificationService.js';

/**
 * Реєстрація обробників перевірки кодів
 */
export const registerVerificationHandlers = (bot) => {
  // Перевірити код (текстова кнопка)
  bot.hears('🎫 Перевірити код', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      
      if (!business) {
        await ctx.reply('Спочатку зареєструй свій бізнес!');
        return;
      }

      await db.updateBusinessState(business.id, 'checking_code', {});
      
      await ctx.reply(getCodeCheckPromptMessage(), {
        parse_mode: 'HTML',
        reply_markup: cancelKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in check code:', error);
      await ctx.reply(getBizErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Підтвердження візиту
  bot.action(/confirm_visit_(\d+)/, async (ctx) => {
    try {
      const bookingId = parseInt(ctx.match[1]);
      
      // Підтверджуємо візит
      const booking = await db.confirmBookingByBusiness(bookingId);
      
      if (!booking) {
        await ctx.answerCbQuery('Помилка підтвердження');
        return;
      }

      // Отримуємо дані для повідомлення
      const deal = await db.getDealById(booking.deal_id);
      
      await ctx.answerCbQuery('✅ Візит підтверджено!');
      await ctx.editMessageText(getVisitConfirmedMessage(deal), {
        parse_mode: 'HTML',
      });
      // Показуємо Reply keyboard окремим повідомленням
      await ctx.reply('👆 Візит підтверджено!', {
        reply_markup: businessMainMenuKeyboard.reply_markup,
      });

      // Надсилаємо сповіщення клієнту
      const fullBooking = await db.getBookingById(bookingId);
      if (fullBooking) {
        await notificationService.notifyUserAboutVisitConfirmation(fullBooking);
      }

      // Перевіряємо чи всі бронювання використані — автозавершення акції
      const dealCompleted = await db.checkAndCompleteDeal(booking.deal_id);
      if (dealCompleted) {
        await ctx.reply('🎉 Всі клієнти скористалися акцією! Акцію автоматично завершено.');
      }
    } catch (error) {
      console.error('Error in confirm visit:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Клієнт не прийшов
  bot.action(/decline_visit_(\d+)/, async (ctx) => {
    try {
      const bookingId = parseInt(ctx.match[1]);
      
      // Позначаємо що клієнт не прийшов
      // Можна додати окремий статус або просто залишити як є
      
      await ctx.answerCbQuery();
      await ctx.editMessageText('📝 Зафіксовано. Код залишається активним, клієнт може прийти пізніше.', {
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.error('Error in decline visit:', error);
      await ctx.answerCbQuery('Помилка');
    }
  });

  // Налаштування (текстова кнопка)
  bot.hears('⚙️ Налаштування', async (ctx) => {
    try {
      const business = await db.getBusinessByTelegramId(ctx.from.id);
      
      if (!business) {
        await ctx.reply('Спочатку зареєструй свій бізнес!');
        return;
      }

      const settingsMessage = `⚙️ <b>Налаштування</b>

🏪 <b>${business.name}</b>
📍 ${business.cities?.name || ''}, ${business.address || ''}
📞 ${business.phone || 'Не вказано'}
📂 ${business.categories?.emoji || ''} ${business.categories?.name || ''}

Для зміни даних зверніться до підтримки @lovi_support`;

      await ctx.reply(settingsMessage, {
        parse_mode: 'HTML',
        reply_markup: businessMainMenuKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in settings:', error);
      await ctx.reply(getBizErrorMessage(), { parse_mode: 'HTML' });
    }
  });
};

/**
 * Обробка введення коду (коли бізнес в стані checking_code)
 */
export const handleCodeVerificationText = async (ctx, business) => {
  const state = business?.state;
  const text = ctx.message.text;

  if (state !== 'checking_code') {
    return false;
  }

  return await verifyCodeDirectly(ctx, business);
};

/**
 * Пряма перевірка коду (автоматично, без стану)
 * Викликається коли бізнес надсилає повідомлення що схоже на код
 */
export const verifyCodeDirectly = async (ctx, business) => {
  const text = ctx.message.text;
  const code = normalizeCode(text);

  if (!isValidCodeFormat(code)) {
    await ctx.reply('❌ Невірний формат коду. Код має бути у форматі LOVY-XXXX.');
    return true;
  }

  // Шукаємо бронювання за кодом
  const booking = await db.getBookingByCode(code);

  if (!booking) {
    await ctx.reply(getCodeNotFoundMessage(code), {
      parse_mode: 'HTML',
      reply_markup: businessMainMenuKeyboard.reply_markup,
    });
    return true;
  }

  // Перевіряємо чи код належить цьому бізнесу
  if (booking.deals?.businesses?.telegram_id !== ctx.from.id) {
    await ctx.reply('❌ Цей код не належить твоєму бізнесу.', {
      reply_markup: businessMainMenuKeyboard.reply_markup,
    });
    return true;
  }

  // Перевіряємо статус коду
  if (booking.status === 'used' || booking.status === 'confirmed') {
    await ctx.reply(getCodeAlreadyUsedMessage(booking), {
      parse_mode: 'HTML',
      reply_markup: businessMainMenuKeyboard.reply_markup,
    });
    return true;
  }

  if (booking.status !== 'activated') {
    await ctx.reply('⚠️ Цей код ще не активований. Акція ще не набрала достатньо учасників.', {
      reply_markup: businessMainMenuKeyboard.reply_markup,
    });
    return true;
  }

  // Перевіряємо термін дії
  if (new Date(booking.expires_at) < new Date()) {
    await ctx.reply('⚠️ Термін дії цього коду вийшов.', {
      reply_markup: businessMainMenuKeyboard.reply_markup,
    });
    return true;
  }

  // Код валідний - показуємо інформацію
  await ctx.reply(getCodeInfoMessage(booking), {
    parse_mode: 'HTML',
    reply_markup: confirmVisitKeyboard(booking.id).reply_markup,
  });

  return true;
};

