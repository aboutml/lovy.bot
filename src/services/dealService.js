import { db } from '../db/database.js';
import { notificationService } from './notificationService.js';

/**
 * Сервіс для роботи з акціями
 */
class DealService {
  /**
   * Перевірка та активація акцій
   */
  async checkAndActivateDeals() {
    try {
      console.log('[DealService] Checking deals for activation...');
      
      // Отримуємо всі активні акції
      const deals = await db.getDealsToActivate();
      
      console.log(`[DealService] Found ${deals.length} deals ready for activation`);
      
      for (const deal of deals) {
        await this.activateDeal(deal);
      }
    } catch (error) {
      console.error('[DealService] Error checking deals:', error);
    }
  }

  /**
   * Активація акції
   */
  async activateDeal(deal) {
    try {
      console.log(`[DealService] Activating deal ${deal.id}: ${deal.title}`);
      
      // Оновлюємо статус акції
      await db.updateDealStatus(deal.id, 'activated');
      
      // Активуємо всі бронювання
      const bookings = await db.activateDealBookings(deal.id);
      
      console.log(`[DealService] Activated ${bookings.length} bookings for deal ${deal.id}`);
      
      // Отримуємо повні дані для сповіщень
      const fullDeal = await db.getDealById(deal.id);
      const fullBookings = await db.getDealBookings(deal.id);
      
      // Сповіщаємо користувачів
      await notificationService.notifyUsersAboutActivation(fullDeal, fullBookings);
      
      // Сповіщаємо бізнес
      await notificationService.notifyBusinessAboutActivation(fullDeal);
      
    } catch (error) {
      console.error(`[DealService] Error activating deal ${deal.id}:`, error);
    }
  }

  /**
   * Перевірка прострочених акцій
   */
  async checkExpiredDeals() {
    try {
      console.log('[DealService] Checking expired deals...');
      
      const expiredDeals = await db.getExpiredDeals();
      
      console.log(`[DealService] Found ${expiredDeals.length} expired deals`);
      
      for (const deal of expiredDeals) {
        await this.expireDeal(deal);
      }
    } catch (error) {
      console.error('[DealService] Error checking expired deals:', error);
    }
  }

  /**
   * Завершення простроченої акції
   */
  async expireDeal(deal) {
    try {
      console.log(`[DealService] Expiring deal ${deal.id}: ${deal.title} (status: ${deal.status})`);
      
      // Якщо акція вже активована — завершуємо як completed
      if (deal.status === 'activated') {
        await db.updateDealStatus(deal.id, 'completed');
        console.log(`[DealService] Deal ${deal.id} completed (was activated)`);
        return;
      }
      
      // Якщо акція active і набрала мінімум — активуємо перед завершенням
      if (deal.current_people >= deal.min_people) {
        await this.activateDeal(deal);
        // Після активації одразу завершуємо
        await db.updateDealStatus(deal.id, 'completed');
        console.log(`[DealService] Deal ${deal.id} activated and completed`);
        return;
      }
      
      // Інакше скасовуємо (не набрали мінімум)
      await db.updateDealStatus(deal.id, 'cancelled');
      
      // Скасовуємо всі бронювання
      const bookings = await db.getDealBookings(deal.id);
      for (const booking of bookings) {
        await db.updateBookingStatus(booking.id, 'cancelled');
      }
      
      console.log(`[DealService] Deal ${deal.id} cancelled (not enough people)`);
      
    } catch (error) {
      console.error(`[DealService] Error expiring deal ${deal.id}:`, error);
    }
  }

  /**
   * Завершення акції та створення звіту
   */
  async completeDeal(dealId) {
    try {
      const deal = await db.getDealById(dealId);
      if (!deal) return null;

      // Оновлюємо статус
      await db.updateDealStatus(dealId, 'completed');
      
      // Створюємо/оновлюємо звіт
      const report = await db.createOrUpdateReport(deal.businesses.id, dealId);
      
      console.log(`[DealService] Completed deal ${dealId}, report created`);
      
      return report;
    } catch (error) {
      console.error(`[DealService] Error completing deal ${dealId}:`, error);
      return null;
    }
  }
}

export const dealService = new DealService();

