-- Міграція: додати image_url до deals
-- Запусти цей SQL в Supabase SQL Editor

-- Додаємо колонку image_url до таблиці deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Перевірка
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deals' AND column_name = 'image_url';

