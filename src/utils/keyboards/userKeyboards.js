import { Markup } from 'telegraf';

/**
 * Генерує клавіатуру вибору міста (динамічно з бази)
 * @param {Array} cities - масив міст з бази даних
 */
export const citySelectionKeyboard = (cities) => {
  // Групуємо по 2 міста в ряд
  const buttons = [];
  for (let i = 0; i < cities.length; i += 2) {
    const row = [`📍 ${cities[i].name}`];
    if (cities[i + 1]) {
      row.push(`📍 ${cities[i + 1].name}`);
    }
    buttons.push(row);
  }
  return Markup.keyboard(buttons).resize();
};

/**
 * Головне меню користувача
 */
export const mainMenuKeyboard = Markup.keyboard([
  ['🔥 Гарячі пропозиції'],
  ['💅 Краса', '🍕 Їжа', '🎯 Послуги'],
  ['👤 Мій профіль', '📍 Змінити місто'],
]).resize();

/**
 * Клавіатура категорій
 */
export const categoriesKeyboard = Markup.keyboard([
  ['💅 Краса', '🍕 Їжа'],
  ['🎯 Послуги', '🏋️ Спорт'],
  ['🎭 Розваги', '💊 Здоров\'я'],
  ['🔙 Назад'],
]).resize();

/**
 * Кнопка "Назад"
 */
export const backKeyboard = Markup.keyboard([
  ['🔙 Назад'],
]).resize();

/**
 * Кнопка "Головне меню"
 */
export const homeKeyboard = Markup.keyboard([
  ['🏠 Головне меню'],
]).resize();

/**
 * Inline кнопки для картки пропозиції
 */
export const dealCardInlineKeyboard = (dealId) => Markup.inlineKeyboard([
  [Markup.button.callback('🙋 Я з вами!', `deal_join_${dealId}`)],
  [Markup.button.callback('📤 Поділитися', `deal_share_${dealId}`)],
]);

/**
 * Inline кнопки після приєднання до пропозиції
 */
export const afterJoinInlineKeyboard = (dealId) => Markup.inlineKeyboard([
  [Markup.button.callback('📤 Поділитися', `deal_share_${dealId}`)],
  [Markup.button.callback('📋 Мої бронювання', 'my_bookings')],
  [Markup.button.callback('🏠 Головне меню', 'main_menu')],
]);

/**
 * Inline кнопки для активованого коду
 */
export const activatedCodeInlineKeyboard = (booking) => {
  const buttons = [];
  
  if (booking.deals?.businesses?.phone) {
    buttons.push([Markup.button.url('📞 Зателефонувати', `tel:${booking.deals.businesses.phone}`)]);
  }
  
  buttons.push([Markup.button.callback('📋 Мої бронювання', 'my_bookings')]);
  buttons.push([Markup.button.callback('🏠 Головне меню', 'main_menu')]);
  
  return Markup.inlineKeyboard(buttons);
};

/**
 * Inline кнопки для опитування після візиту
 */
export const reviewRequestInlineKeyboard = (bookingId) => Markup.inlineKeyboard([
  [Markup.button.callback('⭐ Залишити відгук', `review_good_${bookingId}`)],
  [Markup.button.callback('❌ Не скористався', `review_notused_${bookingId}`)],
]);

/**
 * Inline кнопки для оцінки (зірки)
 */
export const ratingInlineKeyboard = (bookingId) => Markup.inlineKeyboard([
  [
    Markup.button.callback('⭐', `rate_${bookingId}_1`),
    Markup.button.callback('⭐⭐', `rate_${bookingId}_2`),
    Markup.button.callback('⭐⭐⭐', `rate_${bookingId}_3`),
  ],
  [
    Markup.button.callback('⭐⭐⭐⭐', `rate_${bookingId}_4`),
    Markup.button.callback('⭐⭐⭐⭐⭐', `rate_${bookingId}_5`),
  ],
]);

/**
 * Inline кнопки профілю
 */
export const profileInlineKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('🎫 Мої активні коди', 'my_active_codes')],
  [Markup.button.callback('📋 Історія', 'my_history')],
  [Markup.button.callback('📍 Змінити місто', 'change_city')],
]);

/**
 * Пагінація для списків
 */
export const paginationInlineKeyboard = (currentPage, totalPages, prefix) => {
  const buttons = [];
  
  if (currentPage > 1) {
    buttons.push(Markup.button.callback('⬅️', `${prefix}_page_${currentPage - 1}`));
  }
  
  buttons.push(Markup.button.callback(`${currentPage}/${totalPages}`, 'noop'));
  
  if (currentPage < totalPages) {
    buttons.push(Markup.button.callback('➡️', `${prefix}_page_${currentPage + 1}`));
  }
  
  return Markup.inlineKeyboard([buttons]);
};

