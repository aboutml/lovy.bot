import { config } from './config.js';
import { createUserBot, launchUserBot } from './bots/userBot.js';
import { createBusinessBot, launchBusinessBot } from './bots/businessBot.js';
import { createWebhookServer, startWebhookServer } from './webhook/server.js';
import { notificationService } from './services/notificationService.js';
import { startDealActivatorJob } from './jobs/dealActivator.js';
import { startReviewRequesterJob } from './jobs/reviewRequester.js';
import { startReminderSenderJob } from './jobs/reminderSender.js';

console.log('🚀 Запуск Лови Bot...');
console.log(`   Environment: ${config.app.nodeEnv}`);

// Створюємо боти
const userBot = createUserBot();
const businessBot = createBusinessBot();

// Встановлюємо боти в сервіс сповіщень
notificationService.setBots(userBot, businessBot);

// Створюємо webhook сервер
const webhookApp = createWebhookServer(userBot, businessBot);
startWebhookServer(webhookApp);

// Запускаємо боти
const startBots = async () => {
  try {
    // Запускаємо боти в режимі polling (для розробки)
    // Для продакшену використовуйте webhook
    if (userBot) {
      await launchUserBot(userBot);
    }
    
    if (businessBot) {
      await launchBusinessBot(businessBot);
    }

    // Запускаємо фонові задачі
    startDealActivatorJob();
    startReviewRequesterJob();
    startReminderSenderJob();

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Лови Bot успішно запущено!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
  } catch (error) {
    console.error('❌ Помилка запуску ботів:', error);
    process.exit(1);
  }
};

startBots();

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  if (userBot) {
    userBot.stop(signal);
  }
  
  if (businessBot) {
    businessBot.stop(signal);
  }
  
  process.exit(0);
};

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

