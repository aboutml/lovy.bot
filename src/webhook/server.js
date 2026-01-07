import express from 'express';
import { config } from '../config.js';

/**
 * Створення Express сервера для вебхуків та health check
 */
export const createWebhookServer = (userBot, businessBot) => {
  const app = express();

  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      bots: {
        user: !!userBot,
        business: !!businessBot,
      },
    });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Lovi Bot API',
      version: '1.0.0',
      status: 'running',
    });
  });

  // Webhook endpoints (для продакшену)
  if (userBot) {
    app.post(`/webhook/user/${config.telegram.userBotToken}`, (req, res) => {
      userBot.handleUpdate(req.body, res);
    });
  }

  if (businessBot) {
    app.post(`/webhook/business/${config.telegram.businessBotToken}`, (req, res) => {
      businessBot.handleUpdate(req.body, res);
    });
  }

  return app;
};

/**
 * Запуск сервера
 */
export const startWebhookServer = (app) => {
  const port = config.app.port;

  app.listen(port, () => {
    console.log(`🌐 Webhook server running on port ${port}`);
    console.log(`   Health check: http://localhost:${port}/health`);
  });
};

/**
 * Налаштування webhook (для продакшену)
 */
export const setupWebhook = async (bot, webhookUrl, path) => {
  try {
    await bot.telegram.setWebhook(`${webhookUrl}${path}`);
    console.log(`✅ Webhook set: ${webhookUrl}${path}`);
  } catch (error) {
    console.error('❌ Error setting webhook:', error);
  }
};

