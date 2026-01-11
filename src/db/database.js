import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

const supabase = createClient(config.supabase.url, config.supabase.key);

export class Database {
  // =============================================
  // CITIES
  // =============================================
  
  async getAllCities() {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error getting cities:', error);
      return [];
    }
    return data || [];
  }

  async getCityBySlug(slug) {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error) return null;
    return data;
  }

  async getCityByName(name) {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('name', name)
      .eq('is_active', true)
      .single();
    
    if (error) return null;
    return data;
  }

  // =============================================
  // CATEGORIES
  // =============================================
  
  async getAllCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error getting categories:', error);
      return [];
    }
    return data || [];
  }

  async getCategoryBySlug(slug) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();
    
    if (error) return null;
    return data;
  }

  // =============================================
  // USERS (Клієнти)
  // =============================================
  
  async getUserByTelegramId(telegramId) {
    const { data, error } = await supabase
      .from('users')
      .select('*, cities(*)')
      .eq('telegram_id', telegramId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error getting user:', error);
      return null;
    }
    return data;
  }

  async createOrUpdateUser(telegramId, userData) {
    const existingUser = await this.getUserByTelegramId(telegramId);
    
    if (existingUser) {
      const { data, error } = await supabase
        .from('users')
        .update({
          username: userData.username,
          first_name: userData.first_name,
          ...userData,
        })
        .eq('telegram_id', telegramId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating user:', error);
        return null;
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from('users')
        .insert({
          telegram_id: telegramId,
          username: userData.username,
          first_name: userData.first_name,
          ...userData,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating user:', error);
        return null;
      }
      return data;
    }
  }

  async updateUserState(telegramId, state, stateData = {}) {
    const { data, error } = await supabase
      .from('users')
      .update({ state, state_data: stateData })
      .eq('telegram_id', telegramId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user state:', error);
      return null;
    }
    return data;
  }

  async updateUserCity(telegramId, cityId) {
    const { data, error } = await supabase
      .from('users')
      .update({ city_id: cityId })
      .eq('telegram_id', telegramId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user city:', error);
      return null;
    }
    return data;
  }

  async addUserBonus(telegramId, points) {
    const user = await this.getUserByTelegramId(telegramId);
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .update({ bonus_points: (user.bonus_points || 0) + points })
      .eq('telegram_id', telegramId)
      .select()
      .single();
    
    if (error) {
      console.error('Error adding user bonus:', error);
      return null;
    }
    return data;
  }

  async incrementUserStats(telegramId, savedAmount) {
    const user = await this.getUserByTelegramId(telegramId);
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .update({
        deals_used: (user.deals_used || 0) + 1,
        total_saved: (user.total_saved || 0) + savedAmount,
      })
      .eq('telegram_id', telegramId)
      .select()
      .single();
    
    if (error) {
      console.error('Error incrementing user stats:', error);
      return null;
    }
    return data;
  }

  // =============================================
  // BUSINESSES
  // =============================================
  
  async getBusinessByTelegramId(telegramId) {
    const { data, error } = await supabase
      .from('businesses')
      .select('*, cities(*), categories(*)')
      .eq('telegram_id', telegramId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error getting business:', error);
      return null;
    }
    return data;
  }

  async createBusiness(telegramId, businessData) {
    const { data, error } = await supabase
      .from('businesses')
      .insert({
        telegram_id: telegramId,
        ...businessData,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating business:', error);
      return null;
    }
    return data;
  }

  async updateBusiness(telegramId, businessData) {
    const { data, error } = await supabase
      .from('businesses')
      .update(businessData)
      .eq('telegram_id', telegramId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating business:', error);
      return null;
    }
    return data;
  }

  async updateBusinessState(telegramId, state, stateData = {}) {
    const { data, error } = await supabase
      .from('businesses')
      .update({ state, state_data: stateData })
      .eq('telegram_id', telegramId)
      .select()
      .single();
    
    if (error) {
      // PGRST116 = no rows found - це нормально для нових бізнесів
      if (error.code !== 'PGRST116') {
        console.error('Error updating business state:', error);
      }
      return null;
    }
    return data;
  }

  // =============================================
  // DEALS (Акції)
  // =============================================
  
  async createDeal(businessId, dealData) {
    const expiresAt = new Date();
    
    // Підтримка хвилин (для тестування) та днів
    if (dealData.duration_minutes) {
      expiresAt.setMinutes(expiresAt.getMinutes() + dealData.duration_minutes);
    } else {
      expiresAt.setDate(expiresAt.getDate() + (dealData.duration_days || 7));
    }

    // Видаляємо тимчасові поля перед збереженням (duration_minutes не є колонкою в БД)
    const { duration_minutes, ...dataToSave } = dealData;

    const { data, error } = await supabase
      .from('deals')
      .insert({
        business_id: businessId,
        expires_at: expiresAt.toISOString(),
        ...dataToSave,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating deal:', error);
      return null;
    }
    return data;
  }

  async getDealById(dealId) {
    const { data, error } = await supabase
      .from('deals')
      .select('*, businesses(*, cities(*), categories(*))')
      .eq('id', dealId)
      .single();
    
    if (error) {
      console.error('Error getting deal:', error);
      return null;
    }
    return data;
  }

  async getActiveDeals(cityId, categorySlug = null, limit = 10, userId = null) {
    let query = supabase
      .from('deals')
      .select('*, businesses!inner(*, cities(*), categories(*))')
      .in('status', ['active', 'activated'])
      .eq('businesses.city_id', cityId)
      .eq('businesses.is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (categorySlug) {
      query = query.eq('businesses.categories.slug', categorySlug);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error getting active deals:', error);
      return [];
    }
    
    // Фільтруємо пропозиції, до яких користувач вже приєднався
    if (userId && data) {
      const userBookings = await this.getUserBookings(userId);
      const joinedDealIds = userBookings.map(b => b.deal_id);
      return data.filter(deal => !joinedDealIds.includes(deal.id));
    }
    
    return data || [];
  }

  async getHotDeals(cityId, limit = 5, userId = null) {
    // Гарячі - ті що майже набрали мінімум
    const { data, error } = await supabase
      .from('deals')
      .select('*, businesses!inner(*, cities(*), categories(*))')
      .eq('status', 'active')
      .eq('businesses.city_id', cityId)
      .eq('businesses.is_active', true)
      .order('current_people', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error getting hot deals:', error);
      return [];
    }
    
    // Фільтруємо пропозиції, до яких користувач вже приєднався
    if (userId && data) {
      const userBookings = await this.getUserBookings(userId);
      const joinedDealIds = userBookings.map(b => b.deal_id);
      return data.filter(deal => !joinedDealIds.includes(deal.id));
    }
    
    return data || [];
  }

  async getBusinessDeals(businessId) {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting business deals:', error);
      return [];
    }
    return data || [];
  }

  async updateDealStatus(dealId, status) {
    const updates = { status };
    
    if (status === 'activated') {
      updates.activated_at = new Date().toISOString();
    } else if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', dealId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating deal status:', error);
      return null;
    }
    return data;
  }

  async getDealsToActivate() {
    // Знаходимо активні акції
    const { data, error } = await supabase
      .from('deals')
      .select('*, businesses(*)')
      .eq('status', 'active');
    
    if (error) {
      console.error('Error getting deals to activate:', error);
      return [];
    }
    
    // Фільтруємо: current_people >= min_people
    return (data || []).filter(deal => deal.current_people >= deal.min_people);
  }

  async getExpiredDeals() {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .in('status', ['active'])
      .lt('expires_at', new Date().toISOString());
    
    if (error) {
      console.error('Error getting expired deals:', error);
      return [];
    }
    return data || [];
  }

  // =============================================
  // BOOKINGS (Бронювання)
  // =============================================
  
  async createBooking(userId, dealId, code) {
    const deal = await this.getDealById(dealId);
    if (!deal) return null;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (deal.validity_days || config.code.validityDays));

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        deal_id: dealId,
        code,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating booking:', error);
      return null;
    }
    return data;
  }

  async getBookingByCode(code) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, users(*), deals(*, businesses(*))')
      .eq('code', code.toUpperCase())
      .single();
    
    // PGRST116 = код не знайдено (нормальна ситуація)
    if (error && error.code !== 'PGRST116') {
      console.error('Error getting booking by code:', error);
    }
    return data || null;
  }

  async getUserBooking(userId, dealId) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .eq('deal_id', dealId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error getting user booking:', error);
      return null;
    }
    return data;
  }

  async getUserBookings(userId, status = null) {
    let query = supabase
      .from('bookings')
      .select('*, deals(*, businesses(*, cities(*)))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error getting user bookings:', error);
      return [];
    }
    return data || [];
  }

  async getUserActiveBookings(userId) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, deals(*, businesses(*, cities(*)))')
      .eq('user_id', userId)
      .in('status', ['pending', 'activated'])
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting user active bookings:', error);
      return [];
    }
    return data || [];
  }

  async getDealBookings(dealId) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, users(*)')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting deal bookings:', error);
      return [];
    }
    return data || [];
  }

  async updateBookingStatus(bookingId, status) {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating booking status:', error);
      return null;
    }
    return data;
  }

  async confirmBookingByBusiness(bookingId) {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        business_confirmed: true,
        business_confirmed_at: new Date().toISOString(),
        status: 'used',
      })
      .eq('id', bookingId)
      .select()
      .single();
    
    if (error) {
      console.error('Error confirming booking by business:', error);
      return null;
    }
    return data;
  }

  async confirmBookingByUser(bookingId) {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        user_confirmed: true,
        user_confirmed_at: new Date().toISOString(),
        status: 'confirmed',
      })
      .eq('id', bookingId)
      .select()
      .single();
    
    if (error) {
      console.error('Error confirming booking by user:', error);
      return null;
    }
    return data;
  }

  async activateDealBookings(dealId) {
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: 'activated' })
      .eq('deal_id', dealId)
      .eq('status', 'pending')
      .select();
    
    if (error) {
      console.error('Error activating deal bookings:', error);
      return [];
    }
    return data || [];
  }

  async getBookingsForReviewRequest() {
    // Бронювання де бізнес підтвердив, але ще не запитували відгук
    // і минуло 24 години
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const { data, error } = await supabase
      .from('bookings')
      .select('*, users(*), deals(*, businesses(*))')
      .eq('status', 'used')
      .eq('review_requested', false)
      .lt('business_confirmed_at', oneDayAgo.toISOString());
    
    if (error) {
      console.error('Error getting bookings for review request:', error);
      return [];
    }
    return data || [];
  }

  async markReviewRequested(bookingId) {
    await supabase
      .from('bookings')
      .update({ review_requested: true })
      .eq('id', bookingId);
  }

  // =============================================
  // REVIEWS
  // =============================================
  
  async createReview(bookingId, userId, businessId, dealId, rating, comment = null) {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        booking_id: bookingId,
        user_id: userId,
        business_id: businessId,
        deal_id: dealId,
        rating,
        comment,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating review:', error);
      return null;
    }
    return data;
  }

  async getBusinessReviews(businessId, limit = 10) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, users(*)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error getting business reviews:', error);
      return [];
    }
    return data || [];
  }

  // =============================================
  // REPORTS
  // =============================================
  
  async createOrUpdateReport(businessId, dealId) {
    const deal = await this.getDealById(dealId);
    if (!deal) return null;

    const bookings = await this.getDealBookings(dealId);
    const usedBookings = bookings.filter(b => ['used', 'confirmed'].includes(b.status));
    
    const revenue = usedBookings.length * deal.discount_price;
    const commission = Math.round(revenue * config.commission.defaultRate);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const { data: existing } = await supabase
      .from('business_reports')
      .select('*')
      .eq('deal_id', dealId)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('business_reports')
        .update({
          total_bookings: bookings.length,
          codes_used: usedBookings.length,
          codes_confirmed: usedBookings.filter(b => b.user_confirmed).length,
          revenue,
          commission,
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) console.error('Error updating report:', error);
      return data;
    } else {
      const { data, error } = await supabase
        .from('business_reports')
        .insert({
          business_id: businessId,
          deal_id: dealId,
          total_bookings: bookings.length,
          codes_used: usedBookings.length,
          codes_confirmed: usedBookings.filter(b => b.user_confirmed).length,
          revenue,
          commission,
          commission_rate: config.commission.defaultRate,
          due_date: dueDate.toISOString().split('T')[0],
        })
        .select()
        .single();
      
      if (error) console.error('Error creating report:', error);
      return data;
    }
  }

  async getBusinessReports(businessId) {
    const { data, error } = await supabase
      .from('business_reports')
      .select('*, deals(*)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting business reports:', error);
      return [];
    }
    return data || [];
  }

  // =============================================
  // STATS
  // =============================================
  
  async getStats() {
    const { data: users } = await supabase.from('users').select('id', { count: 'exact' });
    const { data: businesses } = await supabase.from('businesses').select('id', { count: 'exact' });
    const { data: deals } = await supabase.from('deals').select('id', { count: 'exact' });
    const { data: bookings } = await supabase.from('bookings').select('id', { count: 'exact' });

    return {
      totalUsers: users?.length || 0,
      totalBusinesses: businesses?.length || 0,
      totalDeals: deals?.length || 0,
      totalBookings: bookings?.length || 0,
    };
  }
}

export const db = new Database();

