import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

const supabase = createClient(config.supabase.url, config.supabase.key);

const BUCKET_NAME = 'business-images';

/**
 * Завантажує файл в Supabase Storage
 * @param {Buffer} fileBuffer - буфер файлу
 * @param {string} fileName - ім'я файлу
 * @param {string} mimeType - MIME тип файлу
 * @returns {Promise<string|null>} - публічний URL або null
 */
export const uploadImage = async (fileBuffer, fileName, mimeType = 'image/jpeg') => {
  try {
    const filePath = `${Date.now()}_${fileName}`;
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      console.error('Error uploading to Supabase Storage:', error);
      return null;
    }

    // Отримуємо публічний URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    return null;
  }
};

/**
 * Завантажує фото з Telegram та зберігає в Supabase Storage
 * @param {object} ctx - Telegraf context
 * @param {string} fileId - Telegram file_id
 * @returns {Promise<string|null>} - публічний URL або null
 */
export const uploadTelegramPhoto = async (ctx, fileId) => {
  try {
    // Отримуємо посилання на файл від Telegram
    const fileLink = await ctx.telegram.getFileLink(fileId);
    
    // Завантажуємо файл
    const response = await fetch(fileLink.href);
    
    if (!response.ok) {
      console.error('Failed to download from Telegram:', response.status);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Генеруємо унікальне ім'я файлу
    const fileName = `${fileId.slice(-10)}.jpg`;
    
    // Завантажуємо в Supabase
    return await uploadImage(buffer, fileName, 'image/jpeg');
  } catch (error) {
    console.error('Error in uploadTelegramPhoto:', error);
    return null;
  }
};

/**
 * Видаляє файл з Supabase Storage
 * @param {string} fileUrl - публічний URL файлу
 * @returns {Promise<boolean>}
 */
export const deleteImage = async (fileUrl) => {
  try {
    // Витягуємо шлях файлу з URL
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split(`/${BUCKET_NAME}/`);
    
    if (pathParts.length < 2) {
      return false;
    }
    
    const filePath = pathParts[1];
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting from Supabase Storage:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteImage:', error);
    return false;
  }
};

