import { Markup } from 'telegraf';

/**
 * Клавіатура вибору міста
 */
export const citySelectionKeyboard = Markup.keyboard([
  ['📍 Дніпро', '📍 Київ'],
  ['📍 Львів', '📍 Одеса'],
]).resize();

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
  [Markup.button.callback('✅ Так, все супер!', `review_good_${bookingId}`)],
  [Markup.button.callback('😐 Так, але є зауваження', `review_ok_${bookingId}`)],
  [Markup.button.callback('❌ Не скористався', `review_notused_${bookingId}`)],
  [Markup.button.callback('🚫 Мене не обслужили', `review_notserved_${bookingId}`)],
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
 * Inline кнопки для списку бронювань
 */
export const bookingItemInlineKeyboard = (bookingId, status) => {
  const buttons = [];
  
  if (status === 'activated') {
    buttons.push([Markup.button.callback('👁️ Показати код', `booking_show_${bookingId}`)]);
  }
  
  buttons.push([Markup.button.callback('📄 Детальніше', `booking_details_${bookingId}`)]);
  
  return Markup.inlineKeyboard(buttons);
};

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

