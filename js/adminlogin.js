// Admin login functionality using Supabase
import { supabase } from './supabaseClient.js';

// Handle admin login form submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('adminLoginForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('adminEmail').value;
            const password = document.getElementById('adminPassword').value;
            const adminLoginButton = document.getElementById('adminLoginButton');
            
            // Clear previous messages
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';
            
            // Set loading state
            if (adminLoginButton) {
                adminLoginButton.classList.add('loading');
                adminLoginButton.disabled = true;
            }
            
            try {
                // First, attempt to sign in with Supabase
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });
                
                if (error) {
                    console.error('Login error:', error);
                    
                    // Remove loading state
                    if (adminLoginButton) {
                        adminLoginButton.classList.remove('loading');
                        adminLoginButton.disabled = false;
                    }
                    
                    errorMessage.textContent = 'Invalid credentials. Please try again.';
                    errorMessage.style.display = 'block';
                    return;
                }
                
                // Check if email is verified (admin accounts must be verified)
                if (!data.user.email_confirmed_at && !data.user.confirmed_at) {
                    // Remove loading state
                    if (adminLoginButton) {
                        adminLoginButton.classList.remove('loading');
                        adminLoginButton.disabled = false;
                    }
                    
                    // Sign out the user
                    await supabase.auth.signOut();
                    
                    errorMessage.textContent = 'Admin account must be verified. Please contact support.';
                    errorMessage.style.display = 'block';
                    return;
                }
                
                // Check if the user is an admin by checking the users table
                const { data: user, error: userError } = await supabase
                    .from('users')
                    .select('type, name, email')
                    .eq('id', data.user.id)
                    .single();
                
                if (userError || !user) {
                    console.error('User lookup error:', userError);
                    
                    // Remove loading state
                    if (adminLoginButton) {
                        adminLoginButton.classList.remove('loading');
                        adminLoginButton.disabled = false;
                    }
                    
                    errorMessage.textContent = 'User not found.';
                    errorMessage.style.display = 'block';
                    
                    // Sign out the user since they're not in our system
                    await supabase.auth.signOut();
                    return;
                }
                
                if (user.type !== 'admin') {
                    console.error('User is not an admin');
                    
                    // Remove loading state
                    if (adminLoginButton) {
                        adminLoginButton.classList.remove('loading');
                        adminLoginButton.disabled = false;
                    }
                    
                    errorMessage.textContent = 'Access denied. Admin credentials required.';
                    errorMessage.style.display = 'block';
                    
                    // Sign out the user since they're not an admin
                    await supabase.auth.signOut();
                    return;
                }
                
                // Admin login successful
                successMessage.textContent = 'Admin login successful! Redirecting...';
                successMessage.style.display = 'block';
                
                // Redirect to admin dashboard after a short delay
                setTimeout(() => {
                    window.location.href = 'Admin.html';
                }, 1000);
                
            } catch (error) {
                console.error('Unexpected error during admin login:', error);
                
                // Remove loading state
                if (adminLoginButton) {
                    adminLoginButton.classList.remove('loading');
                    adminLoginButton.disabled = false;
                }
                
                errorMessage.textContent = 'An unexpected error occurred. Please try again.';
                errorMessage.style.display = 'block';
            }
        });
    }
    
    // Check if user is already logged in as admin, if so redirect to admin dashboard
    checkCurrentSession();
});

// Function to check current session
async function checkCurrentSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error getting session:', error);
            return;
        }
        
        if (session && session.user) {
            // Check if the logged-in user is an admin
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('type')
                .eq('id', session.user.id)
                .single();
                
            if (!userError && user && user.type === 'admin') {
                // User is already logged in as admin, redirect to dashboard
                window.location.href = 'Admin.html';
            }
        }
    } catch (error) {
        console.error('Error checking session:', error);
    }
}