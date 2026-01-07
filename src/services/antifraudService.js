import { db } from '../db/database.js';

/**
 * Сервіс антифроду
 */
class AntifraudService {
  /**
   * Перевірка підозрілої активності бізнесу
   */
  async checkBusinessActivity(businessId) {
    try {
      const business = await db.supabase
        ?.from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (!business?.data) return null;

      const issues = [];

      // Перевіряємо trust_score
      if (business.data.trust_score < 50) {
        issues.push('low_trust_score');
      }

      // Отримуємо скарги
      const { data: complaints } = await db.supabase
        ?.from('complaints')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'open');

      if (complaints && complaints.length >= 3) {
        issues.push('multiple_complaints');
      }

      // Перевіряємо співвідношення використаних/підтверджених кодів
      const { data: reports } = await db.supabase
        ?.from('business_reports')
        .select('*')
        .eq('business_id', businessId);

      if (reports && reports.length > 0) {
        const totalUsed = reports.reduce((sum, r) => sum + (r.codes_used || 0), 0);
        const totalConfirmed = reports.reduce((sum, r) => sum + (r.codes_confirmed || 0), 0);

        // Якщо менше 50% клієнтів підтвердили візит
        if (totalUsed > 10 && totalConfirmed / totalUsed < 0.5) {
          issues.push('low_confirmation_rate');
        }
      }

      return {
        businessId,
        trustScore: business.data.trust_score,
        issues,
        isHighRisk: issues.length >= 2,
      };
    } catch (error) {
      console.error('[AntifraudService] Error checking business activity:', error);
      return null;
    }
  }

  /**
   * Обробка скарги
   */
  async processComplaint(complaintId) {
    try {
      const { data: complaint } = await db.supabase
        ?.from('complaints')
        .select('*, businesses(*)')
        .eq('id', complaintId)
        .single();

      if (!complaint) return;

      // Зменшуємо trust_score в залежності від типу скарги
      const penaltyMap = {
        'not_served': 15,
        'wrong_price': 10,
        'bad_service': 5,
        'fraud': 30,
      };

      const penalty = penaltyMap[complaint.type] || 10;
      await db.decreaseBusinessTrustScore(complaint.business_id, penalty);

      console.log(`[AntifraudService] Processed complaint ${complaintId}, penalty: -${penalty} trust score`);
    } catch (error) {
      console.error('[AntifraudService] Error processing complaint:', error);
    }
  }

  /**
   * Перевірка чи можна довіряти бізнесу
   */
  async isBusinessTrustworthy(businessId) {
    const activity = await this.checkBusinessActivity(businessId);
    
    if (!activity) return true; // Якщо не можемо перевірити - довіряємо
    
    return !activity.isHighRisk && activity.trustScore >= 30;
  }

  /**
   * Аналіз патернів шахрайства
   */
  async analyzePatterns() {
    try {
      // Знаходимо бізнеси з підозрілими патернами
      
      // 1. Бізнеси де багато кодів "не використані" але скарг немає
      const { data: businesses } = await db.supabase
        ?.from('businesses')
        .select('*')
        .eq('is_active', true);

      const suspiciousBusinesses = [];

      for (const business of businesses || []) {
        const activity = await this.checkBusinessActivity(business.id);
        
        if (activity?.isHighRisk) {
          suspiciousBusinesses.push({
            business,
            ...activity,
          });
        }
      }

      console.log(`[AntifraudService] Found ${suspiciousBusinesses.length} suspicious businesses`);
      
      return suspiciousBusinesses;
    } catch (error) {
      console.error('[AntifraudService] Error analyzing patterns:', error);
      return [];
    }
  }

  /**
   * Розрахунок рекомендованого ліміту для нового бізнесу
   */
  getNewBusinessLimit(business) {
    // Нові бізнеси починають з ліміту
    const baseLimit = 20;

    // Якщо верифікований - більший ліміт
    if (business.is_verified) {
      return baseLimit * 2;
    }

    // Якщо є рейтинг - коригуємо
    if (business.rating >= 4.5 && business.review_count >= 10) {
      return baseLimit * 1.5;
    }

    return baseLimit;
  }
}

export const antifraudService = new AntifraudService();

