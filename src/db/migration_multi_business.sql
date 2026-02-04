-- Міграція: один акаунт — кілька бізнесів (для смм/таргетологів)
-- Запусти в Supabase SQL Editor

-- 1. Дозволити кілька бізнесів на один telegram_id (прибрати UNIQUE)
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_telegram_id_key;

-- 2. Таблиця "поточний бізнес" для оператора (щоб знати, з яким бізнесом працюємо)
CREATE TABLE IF NOT EXISTS business_operator_sessions (
  telegram_id BIGINT PRIMARY KEY,
  current_business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_business_operator_sessions_telegram ON business_operator_sessions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_business_operator_sessions_business ON business_operator_sessions(current_business_id);

-- 3. Для існуючих користувачів: один бізнес на telegram_id — заповнити сесію (опційно, після першого запуску)
-- INSERT INTO business_operator_sessions (telegram_id, current_business_id)
-- SELECT telegram_id, id FROM businesses b
-- ON CONFLICT (telegram_id) DO NOTHING;
