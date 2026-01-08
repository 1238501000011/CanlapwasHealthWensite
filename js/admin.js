// Admin functionality
import { supabase } from './supabaseClient.js';
import { getMedicines, addMedicine, updateMedicine, deleteMedicine } from './medicinesService.js';
import { getSchedules, addSchedule, updateSchedule, deleteSchedule } from './schedulesService.js';

// Function to update dashboard stats
export async function updateDashboardStats() {
    try {
        // Get medicines count
        const medicines = await getMedicines();
        const totalMedicines = medicines.length;
        const lowStockMedicines = medicines.filter(med => med.quantity <= 15).length;
        
        // Get schedules count
        const schedules = await getSchedules();
        const totalSchedules = schedules.length;
        
        // Update the stats cards in the dashboard
        const scheduleStatElement = document.querySelector('.stat-card.blue .stat-title');
        const medicineStatElement = document.querySelector('.stat-card.green .stat-title');
        const stockStatElement = document.querySelector('.stat-card.amber .stat-title');
        
        if (scheduleStatElement) scheduleStatElement.textContent = totalSchedules;
        if (medicineStatElement) medicineStatElement.textContent = totalMedicines;
        if (stockStatElement) stockStatElement.textContent = lowStockMedicines;
        
        // Update the recent activities if we have any
        updateRecentActivities();
        
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

// Function to update recent activities
export async function updateRecentActivities() {
    try {
        // Get recent activities (last 3 items added/updated)
        const medicines = await getMedicines();
        const schedules = await getSchedules();
        
        // Sort by created_at or updated_at if available, or by some other criteria
        // For now, we'll just take the last 3 items from each
        const recentMedicines = medicines.slice(-3).reverse();
        const recentSchedules = schedules.slice(-3).reverse();
        
        // Combine and sort by some timestamp if available
        // Since our schema doesn't have timestamps yet, we'll just show recent items
        const recentActivities = [
            ...recentMedicines.map(item => ({ type: 'Medicine', name: item.name, time: 'Just now' })),
            ...recentSchedules.map(item => ({ type: 'Schedule', name: item.title, time: 'Just now' }))
        ].slice(0, 3);
        
        // Update the recent activities list
        const activityList = document.querySelector('.activity-list');
        if (activityList) {
            activityList.innerHTML = recentActivities.map(activity => {
                let indicatorClass = 'indicator-blue';
                if (activity.type === 'Medicine') indicatorClass = 'indicator-green';
                if (activity.type === 'Schedule') indicatorClass = 'indicator-blue';
                
                return `
                    <div class="activity-card">
                        <div class="activity-info">
                            <strong>${activity.type} Update</strong>
                            <span>${activity.name} · ${activity.time}</span>
                        </div>
                        <div class="activity-indicator ${indicatorClass}"></div>
                    </div>
                `;
            }).join('');
        }
        
    } catch (error) {
        console.error('Error updating recent activities:', error);
    }
}

// Function to handle admin dashboard initialization
export async function initAdminDashboard() {
    try {
        // Check if admin is logged in using Supabase auth
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session || !session.user) {
            // Not logged in - redirect to admin login
            window.location.href = 'AdminLogin.html';
            return;
        }
        
        // Check if user is admin by checking user type in our users table
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('type') 
            .eq('id', session.user.id)
            .single();
            
        if (userError || !user || user.type !== 'admin') {
            // Not an admin - redirect to home
            window.location.href = 'Home.html';
            return;
        }
        
        // Update dashboard stats
        await updateDashboardStats();
        
        // Set up event listeners for quick action buttons
        setupQuickActionButtons();
        
        // Set up logout functionality
        setupLogout();
        
        // Set up user info display
        setupUserInfo();
        
    } catch (error) {
        console.error('Error initializing admin dashboard:', error);
        // Redirect to admin login on any error
        window.location.href = 'AdminLogin.html';
    }
}

// Function to set up quick action buttons
function setupQuickActionButtons() {
    const quickActionButtons = document.querySelectorAll('.action-button');
    quickActionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            
            switch(action) {
                case 'update-schedule':
                    window.location.href = 'ManageSchedules.html';
                    break;
                case 'add-medicine':
                    window.location.href = 'ManageMedicines.html';
                    break;
                case 'view-reports':
                    // Placeholder for reports functionality
                    alert('Reports functionality coming soon!');
                    break;
                default:
                    break;
            }
        });
    });
}

// Function to set up logout functionality
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                // Sign out from Supabase
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error('Error signing out:', error);
                }
                
                // Redirect to login page
                window.location.href = 'Login.html';
            } catch (error) {
                console.error('Error during logout:', error);
                // Redirect to login page even if there's an error
                window.location.href = 'Login.html';
            }
        });
    }
}

// Function to set up user info display
async function setupUserInfo() {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session || !session.user) {
            console.error('No active session found');
            return;
        }
        
        // Get user details from our users table
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', session.user.id)
            .single();
            
        if (userError || !user) {
            console.error('Error fetching user info:', userError);
            return;
        }
        
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = user.name || user.email;
        }
    } catch (error) {
        console.error('Error setting up user info:', error);
    }
}

// Function to initialize admin dashboard when the page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Check if we're on the admin dashboard page
    if (window.location.pathname.includes('Admin.html')) {
        await initAdminDashboard();
    }
});

// Export functions for use in other modules
export { initAdminDashboard, updateDashboardStats, updateRecentActivities };