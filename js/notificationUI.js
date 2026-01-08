// Notification UI Component
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getUnreadNotificationCount 
} from './notificationsService.js';
import { supabase } from './supabaseClient.js';

let notificationPanel = null;
let notificationIcon = null;
let notificationBadge = null;
let isPanelOpen = false;

/**
 * Initialize the notification UI
 */
export async function initNotificationUI() {
  // Create notification icon if it doesn't exist
  createNotificationIcon();
  
  // Load and display notifications
  await updateNotificationBadge();
  await loadNotifications();
  
  // Set up real-time subscription
  setupRealtimeSubscription();
  
  // Refresh notifications periodically
  setInterval(async () => {
    await updateNotificationBadge();
    if (isPanelOpen) {
      await loadNotifications();
    }
  }, 30000); // Every 30 seconds
}

/**
 * Create the notification icon in the header
 */
function createNotificationIcon() {
  const nav = document.querySelector('nav');
  if (!nav) return;
  
  // Check if notification icon already exists
  if (document.getElementById('notification-icon-container')) return;
  
  const iconContainer = document.createElement('div');
  iconContainer.id = 'notification-icon-container';
  iconContainer.style.cssText = 'position: relative; cursor: pointer; margin-left: 1rem;';
  
  notificationIcon = document.createElement('div');
  notificationIcon.id = 'notification-icon';
  notificationIcon.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  `;
  notificationIcon.style.cssText = 'color: #1e3a8a; transition: color 0.3s ease;';
  
  notificationBadge = document.createElement('span');
  notificationBadge.id = 'notification-badge';
  notificationBadge.style.cssText = `
    position: absolute;
    top: -6px;
    right: -6px;
    background: #ef4444;
    color: white;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    display: none;
  `;
  
  iconContainer.appendChild(notificationIcon);
  iconContainer.appendChild(notificationBadge);
  
  // Insert before auth link
  const authLink = document.getElementById('auth-link');
  if (authLink && authLink.parentNode) {
    authLink.parentNode.insertBefore(iconContainer, authLink);
  } else {
    nav.appendChild(iconContainer);
  }
  
  // Add click handler
  iconContainer.addEventListener('click', toggleNotificationPanel);
  
  // Create notification panel
  createNotificationPanel();
}

/**
 * Create the notification panel dropdown
 */
function createNotificationPanel() {
  notificationPanel = document.createElement('div');
  notificationPanel.id = 'notification-panel';
  notificationPanel.style.cssText = `
    position: fixed;
    top: 70px;
    right: 20px;
    width: 380px;
    max-width: calc(100vw - 40px);
    max-height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    display: none;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e5e7eb;
  `;
  
  // Add responsive styles via media query
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 768px) {
      #notification-panel {
        top: 60px !important;
        right: 10px !important;
        left: 10px !important;
        width: auto !important;
        max-width: calc(100vw - 20px) !important;
        max-height: calc(100vh - 80px) !important;
      }
      
      #notification-icon-container {
        margin-left: 0.5rem !important;
      }
      
      #notification-icon-container svg {
        width: 20px !important;
        height: 20px !important;
      }
    }
    
    @media (max-width: 480px) {
      #notification-panel {
        top: 55px !important;
        right: 5px !important;
        left: 5px !important;
        max-width: calc(100vw - 10px) !important;
        border-radius: 8px !important;
      }
    }
  `;
  document.head.appendChild(style);
  
  notificationPanel.innerHTML = `
    <div style="padding: 1.25rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #f9fafb;">
      <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #1f2937;">Notifications</h3>
      <button id="mark-all-read-btn" style="background: none; border: none; color: #2563eb; cursor: pointer; font-size: 0.875rem; font-weight: 500; padding: 0.25rem 0.5rem; border-radius: 6px; transition: background 0.2s;">
        Mark all as read
      </button>
    </div>
    <div id="notification-list" style="overflow-y: auto; max-height: 400px;">
      <div style="padding: 2rem; text-align: center; color: #6b7280;">
        <p>No notifications</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(notificationPanel);
  
  // Add mark all as read handler
  const markAllBtn = document.getElementById('mark-all-read-btn');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async () => {
      await handleMarkAllAsRead();
    });
    markAllBtn.addEventListener('mouseenter', function() {
      this.style.background = '#eff6ff';
    });
    markAllBtn.addEventListener('mouseleave', function() {
      this.style.background = 'none';
    });
  }
  
  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    const iconContainer = document.getElementById('notification-icon-container');
    if (isPanelOpen && 
        notificationPanel && 
        !notificationPanel.contains(e.target) && 
        iconContainer && 
        !iconContainer.contains(e.target)) {
      closeNotificationPanel();
    }
  });
}

/**
 * Toggle notification panel
 */
function toggleNotificationPanel() {
  if (isPanelOpen) {
    closeNotificationPanel();
  } else {
    openNotificationPanel();
  }
}

/**
 * Open notification panel
 */
async function openNotificationPanel() {
  if (!notificationPanel) return;
  
  isPanelOpen = true;
  notificationPanel.style.display = 'flex';
  await loadNotifications();
}

/**
 * Close notification panel
 */
function closeNotificationPanel() {
  if (!notificationPanel) return;
  
  isPanelOpen = false;
  notificationPanel.style.display = 'none';
}

/**
 * Load and display notifications
 */
async function loadNotifications() {
  const notificationList = document.getElementById('notification-list');
  if (!notificationList) return;
  
  const result = await getUserNotifications(true); // Include read notifications
  
  if (!result.success || !result.data || result.data.length === 0) {
    notificationList.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #6b7280;">
        <p>No notifications</p>
      </div>
    `;
    return;
  }
  
  const notifications = result.data;
  notificationList.innerHTML = notifications.map(notification => `
    <div class="notification-item" data-id="${notification.id}" style="
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #f3f4f6;
      cursor: pointer;
      transition: background 0.2s;
      ${notification.is_read ? '' : 'background: #eff6ff; font-weight: 500;'}
    " onclick="window.handleNotificationClick('${notification.id}')">
      <div style="display: flex; justify-content: space-between; align-items: start; gap: 0.75rem;">
        <div style="flex: 1;">
          <h4 style="margin: 0 0 0.5rem 0; font-size: 0.95rem; color: #1f2937; ${notification.is_read ? '' : 'font-weight: 600;'}">
            ${escapeHtml(notification.title)}
          </h4>
          <p style="margin: 0; font-size: 0.875rem; color: #6b7280; line-height: 1.5;">
            ${escapeHtml(notification.message)}
          </p>
          <span style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.5rem; display: block;">
            ${formatTimeAgo(notification.created_at)}
          </span>
        </div>
        ${notification.is_read ? '' : '<div style="width: 8px; height: 8px; background: #2563eb; border-radius: 50%; margin-top: 0.5rem; flex-shrink: 0;"></div>'}
      </div>
    </div>
  `).join('');
  
  // Add hover effects
  const notificationItems = notificationList.querySelectorAll('.notification-item');
  notificationItems.forEach(item => {
    const isUnread = item.querySelector('[style*="background: #2563eb"]') !== null;
    item.addEventListener('mouseenter', function() {
      this.style.background = '#f9fafb';
    });
    item.addEventListener('mouseleave', function() {
      this.style.background = isUnread ? '#eff6ff' : '';
    });
  });
}

/**
 * Handle notification click
 */
window.handleNotificationClick = async function(notificationId) {
  await markNotificationAsRead(notificationId);
  await updateNotificationBadge();
  await loadNotifications();
};

/**
 * Handle mark all as read
 */
async function handleMarkAllAsRead() {
  await markAllNotificationsAsRead();
  await updateNotificationBadge();
  await loadNotifications();
}

/**
 * Update notification badge count
 */
export async function updateNotificationBadge() {
  if (!notificationBadge) return;
  
  const result = await getUnreadNotificationCount();
  const count = result.count || 0;
  
  if (count > 0) {
    notificationBadge.textContent = count > 99 ? '99+' : count;
    notificationBadge.style.display = 'flex';
  } else {
    notificationBadge.style.display = 'none';
  }
}

/**
 * Set up real-time subscription for notifications
 */
function setupRealtimeSubscription() {
  supabase
    .channel('notifications')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'notifications' 
      }, 
      async (payload) => {
        console.log('Notification change detected:', payload);
        await updateNotificationBadge();
        if (isPanelOpen) {
          await loadNotifications();
        }
      }
    )
    .subscribe();
}

/**
 * Format time ago
 */
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

