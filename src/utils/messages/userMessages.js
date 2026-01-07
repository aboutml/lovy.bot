import { formatPrice, calculateDiscount, generateProgressBar, getTimeRemaining, formatDate, escapeHtml, getRatingStars } from '../helpers.js';

/**
 * Привітальне повідомлення
 */
export const getWelcomeMessage = (firstName) => {
  return `🎁 Привіт${firstName ? `, ${escapeHtml(firstName)}` : ''}! Я — <b>Лови</b> 👋

Тут знижки, які працюють коли нас багато!
Більше людей = нижча ціна 📉

<b>Як це працює:</b>
1️⃣ Обираєш пропозицію зі знижкою
2️⃣ Натискаєш "Я з вами"
3️⃣ Коли набереться мінімум людей — знижка активується!
4️⃣ Отримуєш код і йдеш за послугою

Обери своє місто, щоб почати 👇`;
};

/**
 * Повідомлення після вибору міста
 */
export const getCitySelectedMessage = (cityName) => {
  return `📍 Твоє місто: <b>${escapeHtml(cityName)}</b>

Що шукаємо? 👇`;
};

/**
 * Повідомлення головного меню
 */
export const getMainMenuMessage = (cityName) => {
  return `📍 ${escapeHtml(cityName)}

Обери категорію або подивись гарячі пропозиції 🔥`;
};

/**
 * Картка пропозиції (для списку)
 */
export const getDealCardMessage = (deal) => {
  const business = deal.businesses;
  const discount = calculateDiscount(deal.original_price, deal.discount_price);
  const progress = generateProgressBar(deal.current_people, deal.min_people);
  const timeLeft = getTimeRemaining(deal.expires_at);
  
  return `${business?.categories?.emoji || '🏪'} <b>${escapeHtml(deal.title)}</b>
🏪 ${escapeHtml(business?.name || 'Бізнес')}
${business?.rating > 0 ? `⭐ ${business.rating.toFixed(1)} (${business.review_count} відгуків)\n` : ''}📍 ${escapeHtml(business?.address || '')}

💰 <s>${formatPrice(deal.original_price)}</s> → <b>${formatPrice(deal.discount_price)}</b> (-${discount}%)
👥 ${progress} ${deal.current_people}/${deal.min_people}
⏰ ${timeLeft}`;
};

/**
 * Детальна картка пропозиції
 */
export const getDealDetailsMessage = (deal, isJoined = false) => {
  const business = deal.businesses;
  const discount = calculateDiscount(deal.original_price, deal.discount_price);
  const progress = generateProgressBar(deal.current_people, deal.min_people);
  const timeLeft = getTimeRemaining(deal.expires_at);
  const progressPercent = Math.round((deal.current_people / deal.min_people) * 100);

  let message = `${business?.categories?.emoji || '🏪'} <b>${escapeHtml(deal.title)}</b>

🏪 <b>${escapeHtml(business?.name || 'Бізнес')}</b>
${business?.rating > 0 ? `${getRatingStars(business.rating)} ${business.rating.toFixed(1)} (${business.review_count} відгуків)\n` : ''}📍 ${escapeHtml(business?.address || '')}

━━━━━━━━━━━━━━━
💰 Звичайна ціна: <s>${formatPrice(deal.original_price)}</s>
🎁 <b>Твоя ціна: ${formatPrice(deal.discount_price)}</b> (-${discount}%)

👥 Прогрес: ${progress} ${progressPercent}%
   ${deal.current_people} з ${deal.min_people} людей
⏰ До завершення: ${timeLeft}
━━━━━━━━━━━━━━━`;

  if (deal.description) {
    message += `\n\n📝 <b>Опис:</b>\n${escapeHtml(deal.description)}`;
  }

  if (deal.conditions) {
    message += `\n\n⚠️ <b>Умови:</b>\n${escapeHtml(deal.conditions)}`;
  }

  if (isJoined) {
    message += '\n\n✅ <i>Ти вже приєднався до цієї пропозиції</i>';
  }

  return message;
};

/**
 * Повідомлення після приєднання
 */
export const getAfterJoinMessage = (deal) => {
  const remaining = deal.min_people - deal.current_people;
  
  return `🎉 <b>Ти в списку!</b>

${deal.businesses?.categories?.emoji || '🏪'} ${escapeHtml(deal.title)}
🏪 ${escapeHtml(deal.businesses?.name || '')}

👥 Прогрес: ${generateProgressBar(deal.current_people, deal.min_people)} ${deal.current_people}/${deal.min_people}
${remaining > 0 ? `📢 Залишилось <b>${remaining}</b> людей до активації` : '✅ Знижка ось-ось активується!'}

Хочеш швидше? Поділись з друзями! 👇`;
};

/**
 * Повідомлення активації коду
 */
export const getCodeActivatedMessage = (booking, deal) => {
  const business = deal.businesses;
  const expiresDate = formatDate(booking.expires_at);
  
  return `🎉 <b>ЗНИЖКА АКТИВОВАНА!</b>

${business?.categories?.emoji || '🏪'} ${escapeHtml(deal.title)}
🏪 ${escapeHtml(business?.name || '')}

━━━━━━━━━━━━━━━
🎫 <b>Твій код: ${booking.code}</b>
━━━━━━━━━━━━━━━

📍 Адреса: ${escapeHtml(business?.address || '')}
${business?.phone ? `📞 Телефон: ${business.phone}\n` : ''}⏰ Дійсний до: ${expiresDate}

📱 <b>Покажи цей код адміністратору</b>

⚠️ Після візиту підтверди, що отримав послугу — це допоможе іншим!`;
};

/**
 * Повідомлення з проханням залишити відгук
 */
export const getReviewRequestMessage = (booking) => {
  const deal = booking.deals;
  const business = deal?.businesses;
  
  return `👋 Привіт! Як пройшов візит?

${business?.categories?.emoji || '🏪'} ${escapeHtml(deal?.title || '')}
🏪 ${escapeHtml(business?.name || '')}
🎫 Код: ${booking.code}

Ти скористався знижкою?`;
};

/**
 * Повідомлення з подякою за відгук
 */
export const getThankYouForReviewMessage = (bonusPoints) => {
  return `🌟 <b>Дякуємо за відгук!</b> 💙

${bonusPoints > 0 ? `🎁 За активність ти отримуєш <b>+${bonusPoints} бонусів!</b>

Бонуси можна використати для додаткової знижки на наступні пропозиції.` : ''}`;
};

/**
 * Повідомлення профілю
 */
export const getProfileMessage = (user) => {
  const cityName = user.cities?.name || 'Не вибрано';
  
  return `👤 <b>Твій профіль</b>

📍 Місто: ${escapeHtml(cityName)}

📊 <b>Статистика:</b>
• Використано знижок: ${user.deals_used || 0}
• Заощаджено: ${formatPrice(user.total_saved || 0)}
${user.bonus_points > 0 ? `\n💰 <b>Бонуси:</b> ${user.bonus_points}` : ''}`;
};

/**
 * Повідомлення "немає пропозицій"
 */
export const getNoDealsMessage = (categoryName = null) => {
  if (categoryName) {
    return `😔 На жаль, зараз немає активних пропозицій в категорії "${categoryName}".

Спробуй інші категорії або перевір пізніше!`;
  }
  return `😔 На жаль, зараз немає активних пропозицій у твоєму місті.

Спробуй пізніше — нові пропозиції з'являються щодня!`;
};

/**
 * Повідомлення "немає бронювань"
 */
export const getNoBookingsMessage = () => {
  return `📭 У тебе ще немає бронювань.

Переглянь гарячі пропозиції та приєднуйся до знижок! 🔥`;
};

/**
 * Повідомлення помилки
 */
export const getErrorMessage = () => {
  return `❌ Упс! Щось пішло не так.

Спробуй ще раз або напиши в підтримку.`;
};

/**
 * Повідомлення "вже приєднався"
 */
export const getAlreadyJoinedMessage = () => {
  return `✅ Ти вже приєднався до цієї пропозиції!

Перевір свої бронювання, щоб побачити статус.`;
};

/**
 * Повідомлення про скаргу
 */
export const getComplaintReceivedMessage = () => {
  return `📝 <b>Дякуємо за повідомлення!</b>

Ми отримали твою скаргу і розглянемо її найближчим часом.

Якщо потрібна додаткова інформація — ми зв'яжемося з тобою.`;
};

