import { config } from './config.js';
import { createUserBot, launchUserBot } from './bots/userBot.js';
import { createBusinessBot, launchBusinessBot } from './bots/businessBot.js';
import { createWebhookServer, startWebhookServer } from './webhook/server.js';
import { notificationService } from './services/notificationService.js';
import { startDealActivatorJob } from './jobs/dealActivator.js';
import { startReviewRequesterJob } from './jobs/reviewRequester.js';
import { startReminderSenderJob } from './jobs/reminderSender.js';

console.log('🚀 Запуск Lovy Bot...');
console.log(`   Environment: ${config.app.nodeEnv}`);
console.log(`   User Bot Token: ${config.telegram.userBotToken ? '✅ Set' : '❌ Missing'}`);
console.log(`   Business Bot Token: ${config.telegram.businessBotToken ? '✅ Set' : '❌ Missing'}`);
console.log(`   Supabase URL: ${config.supabase.url ? '✅ Set' : '❌ Missing'}`);

// Створюємо боти
const userBot = createUserBot();
console.log(`   User Bot: ${userBot ? '✅ Created' : '❌ Failed'}`);

const businessBot = createBusinessBot();
console.log(`   Business Bot: ${businessBot ? '✅ Created' : '❌ Failed'}`);

// Встановлюємо боти в сервіс сповіщень
notificationService.setBots(userBot, businessBot);

// Створюємо webhook сервер
const webhookApp = createWebhookServer(userBot, businessBot);
startWebhookServer(webhookApp);

// Запускаємо боти
const startBots = async () => {
  try {
    // Запускаємо боти ПАРАЛЕЛЬНО (launch() не завершується, тримає polling)
    const launches = [];
    
    if (userBot) {
      launches.push(launchUserBot(userBot));
    }
    
    if (businessBot) {
      launches.push(launchBusinessBot(businessBot));
    }

    // Не чекаємо на завершення - вони працюють вічно
    // Просто даємо їм час на ініціалізацію
    await Promise.race([
      Promise.all(launches),
      new Promise(resolve => setTimeout(resolve, 5000)) // 5 сек на старт
    ]);

    // Запускаємо фонові задачі
    startDealActivatorJob();
    startReviewRequesterJob();
    startReminderSenderJob();

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Lovy Bot успішно запущено!');
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

