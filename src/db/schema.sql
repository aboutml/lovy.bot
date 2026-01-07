-- =============================================
-- ЛОВИ БОТ - Схема бази даних
-- =============================================

-- Міста
CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Початкові міста
INSERT INTO cities (name, slug) VALUES 
  ('Дніпро', 'dnipro'),
  ('Київ', 'kyiv'),
  ('Львів', 'lviv'),
  ('Одеса', 'odesa')
ON CONFLICT (slug) DO NOTHING;

-- Категорії
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10),
  slug VARCHAR(50) UNIQUE NOT NULL
);

-- Початкові категорії
INSERT INTO categories (name, emoji, slug) VALUES 
  ('Краса', '💅', 'beauty'),
  ('Їжа', '🍕', 'food'),
  ('Послуги', '🎯', 'services'),
  ('Спорт', '🏋️', 'sport'),
  ('Розваги', '🎭', 'entertainment'),
  ('Здоров''я', '💊', 'health')
ON CONFLICT (slug) DO NOTHING;

-- Користувачі (клієнти)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  city_id INTEGER REFERENCES cities(id),
  bonus_points INTEGER DEFAULT 0,
  total_saved INTEGER DEFAULT 0,
  deals_used INTEGER DEFAULT 0,
  state VARCHAR(50) DEFAULT 'idle',
  state_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Бізнеси
CREATE TABLE IF NOT EXISTS businesses (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  name VARCHAR(255),
  category_id INTEGER REFERENCES categories(id),
  city_id INTEGER REFERENCES cities(id),
  address TEXT,
  phone VARCHAR(50),
  description TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  trust_score INTEGER DEFAULT 100,
  total_clients INTEGER DEFAULT 0,
  total_revenue INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  state VARCHAR(50) DEFAULT 'idle',
  state_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Пропозиції (акції)
CREATE TABLE IF NOT EXISTS deals (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  original_price INTEGER NOT NULL,
  discount_price INTEGER NOT NULL,
  min_people INTEGER NOT NULL DEFAULT 10,
  current_people INTEGER DEFAULT 0,
  max_people INTEGER,
  duration_days INTEGER DEFAULT 7,
  validity_days INTEGER DEFAULT 14,
  conditions TEXT,
  status VARCHAR(50) DEFAULT 'active',
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Типи статусів акцій:
-- 'draft' - чернетка
-- 'active' - активна, набирає людей
-- 'activated' - набрала мінімум, коди активні
-- 'completed' - завершена
-- 'cancelled' - скасована

-- Бронювання (клієнт приєднався до акції)
CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  deal_id BIGINT REFERENCES deals(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  business_confirmed BOOLEAN DEFAULT false,
  user_confirmed BOOLEAN DEFAULT false,
  business_confirmed_at TIMESTAMP,
  user_confirmed_at TIMESTAMP,
  reminder_sent BOOLEAN DEFAULT false,
  review_requested BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, deal_id)
);

-- Типи статусів бронювань:
-- 'pending' - очікує активації акції
-- 'activated' - код активний, можна використати
-- 'used' - код використано (бізнес підтвердив)
-- 'confirmed' - клієнт підтвердив візит
-- 'expired' - термін дії вийшов
-- 'cancelled' - скасовано

-- Відгуки
CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  deal_id BIGINT REFERENCES deals(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Скарги (для антифроду)
CREATE TABLE IF NOT EXISTS complaints (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  resolved_at TIMESTAMP,
  resolution_note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Типи скарг:
-- 'not_served' - не обслужили
-- 'wrong_price' - інша ціна
-- 'bad_service' - погане обслуговування
-- 'fraud' - шахрайство

-- Звіти для бізнесу
CREATE TABLE IF NOT EXISTS business_reports (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  deal_id BIGINT REFERENCES deals(id) ON DELETE CASCADE,
  total_bookings INTEGER DEFAULT 0,
  codes_used INTEGER DEFAULT 0,
  codes_confirmed INTEGER DEFAULT 0,
  revenue INTEGER DEFAULT 0,
  commission INTEGER DEFAULT 0,
  commission_rate DECIMAL(3,2) DEFAULT 0.15,
  status VARCHAR(50) DEFAULT 'pending',
  due_date DATE,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Сповіщення (для масових розсилок)
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ІНДЕКСИ
-- =============================================

CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city_id);
CREATE INDEX IF NOT EXISTS idx_users_state ON users(state);

CREATE INDEX IF NOT EXISTS idx_businesses_telegram ON businesses(telegram_id);
CREATE INDEX IF NOT EXISTS idx_businesses_city ON businesses(city_id);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category_id);
CREATE INDEX IF NOT EXISTS idx_businesses_state ON businesses(state);

CREATE INDEX IF NOT EXISTS idx_deals_business ON deals(business_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_expires ON deals(expires_at);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_deal ON bookings(deal_id);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings(code);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

CREATE INDEX IF NOT EXISTS idx_complaints_business ON complaints(business_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

-- =============================================
-- ФУНКЦІЇ
-- =============================================

-- Функція для оновлення updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Тригери для автооновлення updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Функція для оновлення рейтингу бізнесу
CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE businesses 
    SET 
        rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE business_id = NEW.business_id),
        review_count = (SELECT COUNT(*) FROM reviews WHERE business_id = NEW.business_id)
    WHERE id = NEW.business_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_business_rating_trigger ON reviews;
CREATE TRIGGER update_business_rating_trigger
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_business_rating();

-- Функція для оновлення лічильника людей в акції
CREATE OR REPLACE FUNCTION update_deal_people_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE deals 
        SET current_people = current_people + 1
        WHERE id = NEW.deal_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE deals 
        SET current_people = GREATEST(0, current_people - 1)
        WHERE id = OLD.deal_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_deal_people_count_trigger ON bookings;
CREATE TRIGGER update_deal_people_count_trigger
    AFTER INSERT OR DELETE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_deal_people_count();

