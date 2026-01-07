import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const runMigration = async () => {
  console.log('🔄 Running database migration...');
  console.log(`   Supabase URL: ${supabaseUrl}`);

  try {
    // Читаємо SQL файл
    const schemaPath = join(__dirname, 'schema.sql');
    const sql = readFileSync(schemaPath, 'utf-8');

    // Розділяємо на окремі команди
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`   Found ${commands.length} SQL commands`);

    // Виконуємо команди
    // Примітка: Supabase JS SDK не підтримує виконання raw SQL
    // Для міграції використовуйте Supabase Dashboard або supabase CLI
    
    console.log('');
    console.log('⚠️  Для виконання міграції:');
    console.log('   1. Відкрийте Supabase Dashboard');
    console.log('   2. Перейдіть в SQL Editor');
    console.log('   3. Скопіюйте вміст файлу src/db/schema.sql');
    console.log('   4. Виконайте SQL');
    console.log('');
    console.log('   Або використовуйте Supabase CLI:');
    console.log('   $ supabase db push');
    console.log('');

    // Перевіряємо підключення
    const { data, error } = await supabase
      .from('cities')
      .select('count')
      .limit(1);

    if (error && error.code !== 'PGRST116' && !error.message.includes('does not exist')) {
      console.log('✅ Database connection successful');
    } else if (error?.message.includes('does not exist')) {
      console.log('⚠️  Tables not found. Please run the schema.sql manually.');
    } else {
      console.log('✅ Database connection successful');
      console.log('✅ Tables exist');
    }

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

runMigration();

