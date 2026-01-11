import { Markup } from 'telegraf';

/**
 * Стартова клавіатура для незареєстрованого бізнесу
 */
export const startKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('📝 Зареєструвати бізнес', 'business_register')],
  [Markup.button.callback('ℹ️ Як це працює?', 'business_how_it_works')],
]);

/**
 * Головне меню бізнесу
 */
export const businessMainMenuKeyboard = Markup.keyboard([
  ['➕ Нова пропозиція', '📊 Мої пропозиції'],
  ['🎫 Перевірити код', '📈 Статистика'],
  ['⚙️ Налаштування'],
]).resize();

/**
 * Клавіатура вибору категорії
 */
export const categorySelectionKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('💅 Краса', 'biz_cat_beauty')],
  [Markup.button.callback('🍕 Їжа', 'biz_cat_food')],
  [Markup.button.callback('🎯 Послуги', 'biz_cat_services')],
  [Markup.button.callback('🏋️ Спорт', 'biz_cat_sport')],
  [Markup.button.callback('🎭 Розваги', 'biz_cat_entertainment')],
  [Markup.button.callback('💊 Здоров\'я', 'biz_cat_health')],
]);

/**
 * Генерує клавіатуру вибору міста для бізнесу (динамічно з бази)
 * @param {Array} cities - масив міст з бази даних
 */
export const businessCityKeyboard = (cities) => {
  const buttons = cities.map(city => 
    [Markup.button.callback(`📍 ${city.name}`, `biz_city_${city.id}`)]
  );
  return Markup.inlineKeyboard(buttons);
};

/**
 * Клавіатура вибору мінімальної кількості людей
 * @param {boolean} isAdmin - чи є користувач адміном (показує тестові опції)
 */
export const minPeopleKeyboard = (isAdmin = false) => {
  const buttons = [];
  
  // Тестові опції тільки для адмінів
  if (isAdmin) {
    buttons.push([
      Markup.button.callback('1 👤 (тест)', 'deal_minpeople_1'),
      Markup.button.callback('2 👥 (тест)', 'deal_minpeople_2'),
      Markup.button.callback('5', 'deal_minpeople_5'),
    ]);
  }
  
  buttons.push([
    Markup.button.callback('10', 'deal_minpeople_10'),
    Markup.button.callback('15', 'deal_minpeople_15'),
    Markup.button.callback('20', 'deal_minpeople_20'),
  ]);
  buttons.push([
    Markup.button.callback('25', 'deal_minpeople_25'),
    Markup.button.callback('30', 'deal_minpeople_30'),
    Markup.button.callback('50', 'deal_minpeople_50'),
  ]);
  
  return Markup.inlineKeyboard(buttons);
};

/**
 * Клавіатура вибору терміну дії
 * @param {boolean} isAdmin - чи є користувач адміном (показує тестові опції)
 */
export const durationKeyboard = (isAdmin = false) => {
  const buttons = [];
  
  // Тестові опції тільки для адмінів
  if (isAdmin) {
    buttons.push([
      Markup.button.callback('10 хв ⚡ (тест)', 'deal_duration_min_10'),
      Markup.button.callback('1 год (тест)', 'deal_duration_min_60'),
    ]);
  }
  
  buttons.push([
    Markup.button.callback('3 дні', 'deal_duration_3'),
    Markup.button.callback('7 днів', 'deal_duration_7'),
    Markup.button.callback('14 днів', 'deal_duration_14'),
  ]);
  
  return Markup.inlineKeyboard(buttons);
};

/**
 * Клавіатура підтвердження пропозиції
 */
export const dealConfirmKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('✅ Опублікувати', 'deal_publish')],
  [Markup.button.callback('✏️ Редагувати', 'deal_edit')],
  [Markup.button.callback('❌ Скасувати', 'deal_cancel')],
]);

/**
 * Кнопка скасування
 */
export const cancelKeyboard = Markup.keyboard([
  ['❌ Скасувати'],
]).resize();

/**
 * Кнопка пропустити + скасувати (для опціональних кроків)
 */
export const skipKeyboard = Markup.keyboard([
  ['⏭️ Пропустити'],
  ['❌ Скасувати'],
]).resize();

/**
 * Inline кнопки для картки пропозиції бізнесу
 */
export const businessDealCardKeyboard = (dealId, isCompleted = false) => {
  const buttons = [
    [Markup.button.callback('📊 Детальна статистика', `biz_deal_stats_${dealId}`)],
  ];
  
  // Кнопка завершення тільки для активних пропозицій
  if (!isCompleted) {
    buttons.push([Markup.button.callback('❌ Завершити достроково', `biz_deal_end_${dealId}`)]);
  }
  
  return Markup.inlineKeyboard(buttons);
};

/**
 * Клавіатура підтвердження візиту
 */
export const confirmVisitKeyboard = (bookingId) => Markup.inlineKeyboard([
  [Markup.button.callback('✅ Підтвердити візит', `confirm_visit_${bookingId}`)],
  [Markup.button.callback('❌ Клієнт не прийшов', `decline_visit_${bookingId}`)],
]);

/**
 * Клавіатура налаштувань бізнесу
 */
export const businessSettingsKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('✏️ Редагувати профіль', 'biz_edit_profile')],
  [Markup.button.callback('📞 Змінити телефон', 'biz_edit_phone')],
  [Markup.button.callback('📍 Змінити адресу', 'biz_edit_address')],
  [Markup.button.callback('💳 Платіжні реквізити', 'biz_payment_details')],
  [Markup.button.callback('🔙 Назад', 'biz_main_menu')],
]);

/**
 * Inline кнопки для звіту
 */
export const reportInlineKeyboard = (reportId) => Markup.inlineKeyboard([
  [Markup.button.callback('📥 Завантажити PDF', `report_pdf_${reportId}`)],
  [Markup.button.callback('💬 Підтримка', 'contact_support')],
  [Markup.button.callback('🔙 Назад', 'biz_reports_list')],
]);

/**
 * Пагінація для списків бізнесу
 */
export const bizPaginationKeyboard = (currentPage, totalPages, prefix) => {
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

