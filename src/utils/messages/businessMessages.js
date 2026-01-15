import { formatPrice, calculateDiscount, generateProgressBar, getTimeRemaining, formatDate, escapeHtml, formatDateTime } from '../helpers.js';
import { config } from '../../config.js';

/**
 * Привітальне повідомлення для бізнесу
 */
export const getBizWelcomeMessage = () => {
  return `🏪 <b>Вітаємо в Лови Бізнес!</b>

Отримуй клієнтів без ризику:
• 💰 Платиш тільки за результат
• 👥 Клієнти вже зацікавлені
• 📊 Прозора статистика в реальному часі

<b>Як це працює:</b>
1️⃣ Створюєш пропозицію зі знижкою
2️⃣ Клієнти приєднуються
3️⃣ Коли набирається мінімум — акція активується
4️⃣ Клієнти приходять з кодами
5️⃣ Ти платиш комісію тільки за тих, хто прийшов

Комісія сервісу: <b>${config.commission.defaultRate * 100}%</b> від ціни зі знижкою`;
};

/**
 * Повідомлення "Як це працює" для бізнесу
 */
export const getBizHowItWorksMessage = () => {
  return `ℹ️ <b>Як працює Лови для бізнесу</b>

<b>1. Створення пропозиції</b>
Ти вказуєш послугу, звичайну ціну, ціну зі знижкою та мінімальну кількість людей.

<b>2. Набір учасників</b>
Клієнти бачать твою пропозицію і приєднуються. Чим більше людей — тим швидше активація.

<b>3. Активація знижки</b>
Коли набирається мінімум учасників — кожен отримує унікальний код.

<b>4. Візит клієнтів</b>
Клієнти приходять, показують код. Ти підтверджуєш візит у боті.

<b>5. Оплата комісії</b>
Наприкінці акції отримуєш звіт. Платиш ${config.commission.defaultRate * 100}% тільки за тих, хто реально прийшов.

━━━━━━━━━━━━━━━
<b>Переваги:</b>
✅ Нульовий ризик — платиш за результат
✅ Нові клієнти, які шукають саме твої послуги
✅ Прозора статистика
✅ Все в Telegram — без сайтів та додатків`;
};

/**
 * Кроки реєстрації
 */
export const getBizRegistrationSteps = {
  name: '📝 <b>Крок 1/5: Назва закладу</b>\n\nЯк називається твій бізнес?',
  category: '📝 <b>Крок 2/5: Категорія</b>\n\nОбери категорію свого бізнесу:',
  city: '📝 <b>Крок 3/5: Місто</b>\n\nВ якому місті знаходиться твій бізнес?',
  address: '📝 <b>Крок 4/5: Адреса</b>\n\nВкажи адресу (вулиця, номер будинку):',
  social: '📝 <b>Крок 5/5: Соціальні мережі</b>\n\nНадішли посилання на Instagram, TikTok або Telegram:\n<i>(наприклад: https://instagram.com/your_business або @username)</i>',
};

/**
 * Повідомлення після реєстрації
 */
export const getBizRegistrationCompleteMessage = (business) => {
  let info = `✅ <b>Бізнес зареєстровано!</b>

🏪 ${escapeHtml(business.name)}
📍 ${escapeHtml(business.cities?.name || '')}, ${escapeHtml(business.address || '')}`;

  if (business.social_link) {
    info += `\n🔗 ${escapeHtml(business.social_link)}`;
  }

  info += `\n\nТепер ти можеш створювати пропозиції та залучати клієнтів!`;
  
  return info;
};

/**
 * Головне меню бізнесу
 */
export const getBizMainMenuMessage = (business) => {
  return `🏪 <b>${escapeHtml(business.name)}</b>

📍 ${escapeHtml(business.cities?.name || '')}
⭐ Рейтинг: ${business.rating ? business.rating.toFixed(1) : 'Немає відгуків'}

Що робимо далі?`;
};

/**
 * Кроки створення пропозиції
 */
export const getDealCreationSteps = {
  title: '📝 <b>Крок 1/6: Назва послуги</b>\n\nЯк називається послуга?\n<i>(наприклад: "Манікюр + гель-лак")</i>',
  originalPrice: '📝 <b>Крок 2/6: Звичайна ціна</b>\n\nВкажи звичайну ціну послуги в гривнях:\n<i>(тільки число, наприклад: 900)</i>',
  discountPrice: '📝 <b>Крок 3/6: Ціна зі знижкою</b>\n\nВкажи ціну зі знижкою в гривнях:\n<i>(тільки число, наприклад: 600)</i>',
  minPeople: '📝 <b>Крок 4/6: Мінімум людей</b>\n\nСкільки людей потрібно для активації знижки?',
  duration: '📝 <b>Крок 5/6: Термін дії</b>\n\nСкільки днів буде тривати набір людей?',
  photo: '📝 <b>Крок 6/6: Фото</b>\n\nНадішли фото для цієї пропозиції 📸\n\n<i>Це може бути фото послуги, результату роботи або товару</i>',
};

/**
 * Попередній перегляд пропозиції
 */
export const getDealPreviewMessage = (dealData) => {
  const discount = calculateDiscount(dealData.original_price, dealData.discount_price);
  const commission = Math.round(dealData.discount_price * config.commission.defaultRate);
  
  // Форматування терміну
  let durationText;
  if (dealData.duration_minutes) {
    durationText = dealData.duration_minutes >= 60 
      ? `${dealData.duration_minutes / 60} год` 
      : `${dealData.duration_minutes} хв ⚡`;
  } else {
    durationText = `${dealData.duration_days} днів`;
  }
  
  return `📋 <b>Перевір пропозицію:</b>

🏷️ ${escapeHtml(dealData.title)}
💰 ${formatPrice(dealData.original_price)} → <b>${formatPrice(dealData.discount_price)}</b> (-${discount}%)
👥 Мінімум: ${dealData.min_people} людей
⏰ Термін набору: ${durationText}

━━━━━━━━━━━━━━━
<b>Комісія сервісу:</b> ${config.commission.defaultRate * 100}%
💵 ${formatPrice(commission)} з кожного клієнта
━━━━━━━━━━━━━━━

Все вірно?`;
};

/**
 * Повідомлення про публікацію пропозиції
 */
export const getDealPublishedMessage = (deal) => {
  return `✅ <b>Пропозицію опубліковано!</b>

🏷️ ${escapeHtml(deal.title)}
💰 ${formatPrice(deal.original_price)} → ${formatPrice(deal.discount_price)}
👥 Мінімум: ${deal.min_people} людей
⏰ Завершення: ${formatDate(deal.expires_at)}

Тепер клієнти можуть приєднуватись до твоєї пропозиції!

Слідкуй за прогресом у розділі "Мої пропозиції" 📊`;
};

/**
 * Картка пропозиції бізнесу
 */
export const getBizDealCardMessage = (deal) => {
  const discount = calculateDiscount(deal.original_price, deal.discount_price);
  const progress = generateProgressBar(deal.current_people, deal.min_people);
  const progressPercent = Math.round((deal.current_people / deal.min_people) * 100);
  const timeLeft = getTimeRemaining(deal.expires_at);
  
  const statusEmoji = {
    'active': '🟢',
    'activated': '✅',
    'completed': '🏁',
    'cancelled': '❌',
  };

  // Дати для відображення
  const startDate = formatDate(deal.created_at);
  const endDate = deal.completed_at ? formatDate(deal.completed_at) : formatDate(deal.expires_at);
  const isFinished = ['completed', 'cancelled', 'expired'].includes(deal.status);
  
  let timeInfo;
  if (isFinished) {
    timeInfo = `📅 ${startDate} — ${endDate}`;
  } else {
    timeInfo = `⏰ ${timeLeft}`;
  }
  
  return `${statusEmoji[deal.status] || '❓'} <b>${escapeHtml(deal.title)}</b>

💰 ${formatPrice(deal.original_price)} → ${formatPrice(deal.discount_price)} (-${discount}%)
👥 ${progress} ${deal.current_people}/${deal.min_people} (${progressPercent}%)
${timeInfo}

Статус: <b>${getStatusText(deal.status)}</b>`;
};

/**
 * Текст статусу
 */
const getStatusText = (status) => {
  const statuses = {
    'active': 'Набір учасників',
    'activated': 'Знижка активна',
    'completed': 'Завершено',
    'cancelled': 'Скасовано',
  };
  return statuses[status] || status;
};

/**
 * Повідомлення перевірки коду
 */
export const getCodeCheckPromptMessage = () => {
  return `🎫 <b>Перевірка коду</b>

Введи код клієнта:
<i>(наприклад: LOVY-4829)</i>`;
};

/**
 * Повідомлення з інформацією про код
 */
export const getCodeInfoMessage = (booking) => {
  const user = booking.users;
  const deal = booking.deals;
  
  return `✅ <b>Код знайдено!</b>

👤 Клієнт: ${escapeHtml(user?.first_name || 'Користувач')} ${user?.username ? `(@${user.username})` : ''}
🏷️ Послуга: ${escapeHtml(deal?.title || '')}
💰 Ціна: ${formatPrice(deal?.discount_price || 0)}
⏰ Дійсний до: ${formatDate(booking.expires_at)}

Підтверджуєш візит клієнта?`;
};

/**
 * Повідомлення "код не знайдено"
 */
export const getCodeNotFoundMessage = (code) => {
  return `❌ <b>Код не знайдено</b>

Код "${escapeHtml(code)}" не існує або вже використаний.

Перевір правильність введення та спробуй ще раз.`;
};

/**
 * Повідомлення "код вже використано"
 */
export const getCodeAlreadyUsedMessage = (booking) => {
  return `⚠️ <b>Код вже використано</b>

Цей код був підтверджений ${formatDateTime(booking.business_confirmed_at)}`;
};

/**
 * Повідомлення підтвердження візиту
 */
export const getVisitConfirmedMessage = (deal) => {
  return `✅ <b>Візит підтверджено!</b>

Клієнт отримає сповіщення.
Код деактивовано.`;
};

/**
 * Звіт по акції
 */
export const getDealReportMessage = (report, deal) => {
  return `📊 <b>Звіт по акції</b>

🏷️ ${escapeHtml(deal?.title || '')}
📅 ${formatDate(deal?.created_at)} - ${formatDate(deal?.completed_at || deal?.expires_at)}

━━━━━━━━━━━━━━━
👥 Всього приєднались: ${report.total_bookings}
✅ Використали код: ${report.codes_used}
🎉 Підтвердили візит: ${report.codes_confirmed}
━━━━━━━━━━━━━━━

💰 <b>Фінанси:</b>
• Сума продажів: ${formatPrice(report.revenue)}
• Комісія сервісу (${report.commission_rate * 100}%): ${formatPrice(report.commission)}

📄 Статус: ${report.status === 'paid' ? '✅ Оплачено' : '⏳ Очікує оплати'}
${report.status !== 'paid' ? `⏰ Оплата до: ${formatDate(report.due_date)}` : ''}`;
};

/**
 * Повідомлення про активацію акції (для бізнесу)
 */
export const getDealActivatedNotificationMessage = (deal) => {
  return `🎉 <b>Вітаємо! Твоя акція активована!</b>

🏷️ ${escapeHtml(deal.title)}
👥 Набрано: ${deal.current_people} людей

Тепер клієнти можуть приходити з кодами.
Не забувай підтверджувати візити в боті!`;
};

/**
 * Повідомлення про нового учасника
 */
export const getNewParticipantMessage = (deal) => {
  const remaining = deal.min_people - deal.current_people;
  
  return `👥 <b>Новий учасник!</b>

🏷️ ${escapeHtml(deal.title)}
📊 Прогрес: ${deal.current_people}/${deal.min_people}
${remaining > 0 ? `⏳ Залишилось: ${remaining} людей` : '✅ Мінімум набрано!'}`;
};

/**
 * Повідомлення помилки
 */
export const getBizErrorMessage = () => {
  return `❌ Упс! Щось пішло не так.

Спробуй ще раз або зверніться до підтримки.`;
};

/**
 * Повідомлення "немає пропозицій"
 */
export const getNoBizDealsMessage = () => {
  return `📭 У тебе ще немає пропозицій.

Створи першу пропозицію та почни залучати клієнтів!`;
};

