import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegram: {
    userBotToken: process.env.TELEGRAM_USER_BOT_TOKEN,
    businessBotToken: process.env.TELEGRAM_BUSINESS_BOT_TOKEN,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000'),
  },
  admin: {
    userIds: (process.env.ADMIN_USER_IDS || '')
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id)),
  },
  commission: {
    defaultRate: parseFloat(process.env.DEFAULT_COMMISSION_RATE || '0.15'),
  },
  code: {
    prefix: process.env.CODE_PREFIX || 'LOVY',
    validityDays: parseInt(process.env.CODE_VALIDITY_DAYS || '14'),
  },
};

// Валідація конфігурації
const requiredEnvVars = [
  'TELEGRAM_USER_BOT_TOKEN',
  'TELEGRAM_BUSINESS_BOT_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️  Warning: ${envVar} is not set`);
  }
}

