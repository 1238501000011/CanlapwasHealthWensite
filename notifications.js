import { supabase } from './supabaseClient.js';

/**
 * Send a notification to a specific user or broadcast to all users
 * @param {string} title - The title of the notification
 * @param {string} message - The content of the notification
 * @param {string|null} userId - The ID of the specific user to notify (null for broadcast)
 * @returns {Promise<Object>} Result of the operation
 */
export async function sendNotification(title, message, userId = null) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          title,
          message,
          user_id: userId
        }
      ]);

    if (error) {
      console.error('Error sending notification:', error);
      throw new Error(error.message);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendNotification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get notifications for the current user
 * @param {boolean} includeRead - Whether to include read notifications (default: false)
 * @returns {Promise<Object>} Array of notifications
 */
export async function getUserNotifications(includeRead = false) {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .or('user_id.eq.null, user_id.eq.' + supabase.auth.getUser().data.user.id)
      .order('created_at', { ascending: false });

    if (!includeRead) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error(error.message);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark a notification as read
 * @param {string} notificationId - The ID of the notification to mark as read
 * @returns {Promise<Object>} Result of the operation
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', supabase.auth.getUser().data.user.id);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error(error.message);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark all notifications as read for the current user
 * @returns {Promise<Object>} Result of the operation
 */
export async function markAllNotificationsAsRead() {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .or('user_id.eq.null, user_id.eq.' + supabase.auth.getUser().data.user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error(error.message);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get the count of unread notifications for the current user
 * @returns {Promise<number>} Count of unread notifications
 */
export async function getUnreadNotificationCount() {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .or('user_id.eq.null, user_id.eq.' + supabase.auth.getUser().data.user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread notification count:', error);
      throw new Error(error.message);
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Error in getUnreadNotificationCount:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a notification (admin only)
 * @param {string} notificationId - The ID of the notification to delete
 * @returns {Promise<Object>} Result of the operation
 */
export async function deleteNotification(notificationId) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      throw new Error(error.message);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a broadcast notification to all users
 * @param {string} title - The title of the notification
 * @param {string} message - The content of the notification
 * @returns {Promise<Object>} Result of the operation
 */
export async function sendBroadcastNotification(title, message) {
  return await sendNotification(title, message, null);
}