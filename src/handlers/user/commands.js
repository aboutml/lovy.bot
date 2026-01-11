import { db } from '../../db/database.js';
import { getWelcomeMessage, getMainMenuMessage, getProfileMessage, getErrorMessage } from '../../utils/messages/userMessages.js';
import { citySelectionKeyboard, mainMenuKeyboard, profileInlineKeyboard } from '../../utils/keyboards/userKeyboards.js';
import { parseStartParams } from '../../utils/helpers.js';

/**
 * Реєстрація команд для бота користувачів
 */
export const registerUserCommands = (bot) => {
  // Команда /start
  bot.command('start', async (ctx) => {
    try {
      const user = ctx.from;
      const startParam = ctx.message.text.split(' ')[1];
      const params = parseStartParams(startParam);

      // Створюємо або оновлюємо користувача
      await db.createOrUpdateUser(user.id, {
        username: user.username,
        first_name: user.first_name,
      });

      // Якщо є dealId в параметрах - показуємо деталі цієї акції
      if (params.dealId) {
        // Зберігаємо реферера якщо є
        if (params.referrerId) {
          await db.updateUserState(user.id, 'idle', { referrerId: params.referrerId });
        }
        
        // Перенаправляємо на перегляд акції
        ctx.state = { dealId: params.dealId };
        // Тут можна викликати handler перегляду акції
        // Поки що просто показуємо привітання
      }

      // Перевіряємо чи є вибране місто
      const dbUser = await db.getUserByTelegramId(user.id);
      
      if (dbUser?.city_id) {
        // Є місто - показуємо головне меню
        const cityName = dbUser.cities?.name || 'Невідоме місто';
        await ctx.reply(getMainMenuMessage(cityName), {
          parse_mode: 'HTML',
          reply_markup: mainMenuKeyboard.reply_markup,
        });
      } else {
        // Немає міста - показуємо вибір міста
        const cities = await db.getAllCities();
        await ctx.reply(getWelcomeMessage(user.first_name), {
          parse_mode: 'HTML',
          reply_markup: citySelectionKeyboard(cities).reply_markup,
        });
      }
    } catch (error) {
      console.error('Error in /start command:', error);
      await ctx.reply(getErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Команда /help
  bot.command('help', async (ctx) => {
    const helpMessage = `❓ <b>Допомога</b>

<b>Як користуватися Лови:</b>

1️⃣ <b>Обери місто</b> — ми покажемо пропозиції поруч з тобою

2️⃣ <b>Переглянь пропозиції</b> — обери категорію або подивись гарячі акції

3️⃣ <b>Приєднайся</b> — натисни "Я з вами" на пропозиції, яка тобі подобається

4️⃣ <b>Чекай активації</b> — коли набереться мінімум людей, ти отримаєш код

5️⃣ <b>Використай знижку</b> — покажи код у закладі та насолоджуйся!

━━━━━━━━━━━━━━━
<b>Команди:</b>
/start — Головне меню
/profile — Твій профіль
/bookings — Твої бронювання
/help — Ця довідка

Якщо виникли питання — пиши @lovi_support`;

    await ctx.reply(helpMessage, { parse_mode: 'HTML' });
  });

  // Команда /profile
  bot.command('profile', async (ctx) => {
    try {
      const user = await db.getUserByTelegramId(ctx.from.id);
      
      if (!user) {
        await ctx.reply('Спочатку натисни /start для реєстрації');
        return;
      }

      await ctx.reply(getProfileMessage(user), {
        parse_mode: 'HTML',
        reply_markup: profileInlineKeyboard.reply_markup,
      });
    } catch (error) {
      console.error('Error in /profile command:', error);
      await ctx.reply(getErrorMessage(), { parse_mode: 'HTML' });
    }
  });

  // Команда /bookings
  bot.command('bookings', async (ctx) => {
    try {
      const user = await db.getUserByTelegramId(ctx.from.id);
      
      if (!user) {
        await ctx.reply('Спочатку натисни /start для реєстрації');
        return;
      }

      const bookings = await db.getUserActiveBookings(user.id);
      
      if (bookings.length === 0) {
        await ctx.reply('📭 У тебе немає активних бронювань.\n\nПереглянь пропозиції та приєднуйся до знижок!');
        return;
      }

      let message = `🎫 <b>Твої активні бронювання (${bookings.length}):</b>\n\n`;

      for (const booking of bookings) {
        const deal = booking.deals;
        const business = deal?.businesses;
        const statusEmoji = booking.status === 'activated' ? '✅' : '⏳';
        
        message += `${statusEmoji} <b>${deal?.title || 'Невідома акція'}</b>\n`;
        message += `🏪 ${business?.name || 'Невідомий бізнес'}\n`;
        
        if (booking.status === 'activated') {
          message += `🎫 Код: <code>${booking.code}</code>\n`;
        } else {
          message += `⏳ Очікує активації\n`;
        }
        message += '\n';
      }

      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error) {
      console.error('Error in /bookings command:', error);
      await ctx.reply(getErrorMessage(), { parse_mode: 'HTML' });
    }
  });
};

