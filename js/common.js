// Common functionality for all pages
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', async function () {
    // Update UI based on authentication state
    await updateUIBasedOnAuth();

    // Set up logout functionality if logout button exists
    setupLogout();

    // Set up navigation based on auth state
    setupNavigation();
});

// Function to update UI based on authentication state
async function updateUIBasedOnAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error('Error getting session:', error);
            return;
        }

        const authLink = document.getElementById('auth-link');
        const userMenu = document.getElementById('user-menu');
        const userName = document.getElementById('user-name');
        const authText = document.getElementById('auth-text');

        // AUTH LINK (Sign In when logged out, Logout when logged in)
        if (authLink) {
            if (session) {
                // Logged in → show Logout
                authLink.href = '#';
                if (authText) {
                    authText.textContent = 'Logout';
                }
                authLink.style.display = 'flex';
            } else {
                // Logged out → show Sign In
                authLink.href = 'Login.html';
                if (authText) {
                    authText.textContent = 'Sign In';
                }
                authLink.style.display = 'flex';
            }
        }

        // USER MENU (username + logout)
        if (userMenu) {
            userMenu.style.display = session ? 'flex' : 'none';
        }

        // USER NAME
        if (userName && session) {
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('name, email')
                .eq('id', session.user.id)
                .single();

            if (!userError && user) {
                userName.textContent = user.name || user.email;
            }
        }
    } catch (error) {
        console.error('Error updating UI based on auth:', error);
    }
}

// Function to set up logout functionality
function setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    const authLink = document.getElementById('auth-link');
    
    // Set up logout functionality for the separate logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function (e) {
            e.preventDefault();

            try {
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error('Error signing out:', error);
                }

                await updateUIBasedOnAuth();
                window.location.href = 'Home.html';
            } catch (error) {
                console.error('Error during logout:', error);
                window.location.href = 'Home.html';
            }
        });
    }
    
    // Set up logout functionality for the auth link when it shows 'Logout'
    if (authLink) {
        authLink.addEventListener('click', async function (e) {
            // Check if the link shows 'Logout' text
            const authText = document.getElementById('auth-text');
            if (authText && authText.textContent === 'Logout') {
                e.preventDefault();
                
                try {
                    const { error } = await supabase.auth.signOut();
                    if (error) {
                        console.error('Error signing out:', error);
                    }
                    
                    await updateUIBasedOnAuth();
                    window.location.href = 'Home.html';
                } catch (error) {
                    console.error('Error during logout:', error);
                    window.location.href = 'Home.html';
                }
            }
        });
    }
}

// Function to set up navigation based on auth state
async function setupNavigation() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session || !session.user) return;

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('type')
            .eq('id', session.user.id)
            .single();

        // Admin-specific navigation can be added here if needed
        if (!userError && user && user.type === 'admin') {
            // No admin links added per requirement
        }
    } catch (error) {
        console.error('Error setting up navigation:', error);
    }
}

// Export functions for use in other modules
export { updateUIBasedOnAuth, setupLogout };
