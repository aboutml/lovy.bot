import cron from 'node-cron';
import { dealService } from '../services/dealService.js';

/**
 * Job для автоматичної активації акцій
 * Запускається кожні 5 хвилин
 */
export const startDealActivatorJob = () => {
  console.log('[DealActivator] Starting job...');

  // Перевірка активації - кожні 5 хвилин
  cron.schedule('*/5 * * * *', async () => {
    console.log('[DealActivator] Running activation check...');
    await dealService.checkAndActivateDeals();
  });

  // Перевірка прострочених - кожну годину
  cron.schedule('0 * * * *', async () => {
    console.log('[DealActivator] Running expiration check...');
    await dealService.checkExpiredDeals();
  });

  console.log('[DealActivator] Job scheduled');
};

/**
 * Одноразова перевірка (для тестування)
 */
export const runActivationCheck = async () => {
  console.log('[DealActivator] Manual activation check...');
  await dealService.checkAndActivateDeals();
  await dealService.checkExpiredDeals();
};

