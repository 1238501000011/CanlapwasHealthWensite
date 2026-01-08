// Admin login functionality using Supabase
import { supabase } from './supabaseClient.js';

// Handle admin login form submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('adminLoginForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const adminLoginButton = document.getElementById('adminLoginButton');
    let isSubmitting = false; // Prevent multiple submissions

    // Function to handle login
    async function handleLogin() {
        // Prevent multiple submissions
        if (isSubmitting) {
            return;
        }

        const emailInput = document.getElementById('adminEmail');
        const passwordInput = document.getElementById('adminPassword');
        
        if (!emailInput || !passwordInput) {
            console.error('Form inputs not found');
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // Basic validation
        if (!email || !password) {
            errorMessage.textContent = 'Please fill in all fields';
            errorMessage.style.display = 'block';
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorMessage.textContent = 'Please enter a valid email address';
            errorMessage.style.display = 'block';
            return;
        }
        
        // Clear previous messages
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        
        // Set submitting flag and loading state
        isSubmitting = true;
        if (adminLoginButton) {
            adminLoginButton.classList.add('loading');
            adminLoginButton.disabled = true;
        }
            
        try {
            // First, attempt to sign in with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.toLowerCase().trim(),
                password: password,
            });
            
            if (error) {
                console.error('Login error:', error);
                
                // Remove loading state
                isSubmitting = false;
                if (adminLoginButton) {
                    adminLoginButton.classList.remove('loading');
                    adminLoginButton.disabled = false;
                }
                
                // Better error messages
                if (error.message && error.message.toLowerCase().includes('invalid')) {
                    errorMessage.textContent = 'Invalid email or password. Please try again.';
                } else if (error.message && error.message.toLowerCase().includes('email')) {
                    errorMessage.textContent = 'Please verify your email before logging in.';
                } else {
                    errorMessage.textContent = error.message || 'Invalid credentials. Please try again.';
                }
                errorMessage.style.display = 'block';
                return;
            }
            
            // Check if email is verified (admin accounts must be verified)
            if (!data.user.email_confirmed_at && !data.user.confirmed_at) {
                // Remove loading state
                isSubmitting = false;
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
                isSubmitting = false;
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
                isSubmitting = false;
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
            isSubmitting = false;
            if (adminLoginButton) {
                adminLoginButton.classList.remove('loading');
                adminLoginButton.disabled = false;
            }
            
            errorMessage.textContent = 'An unexpected error occurred. Please try again.';
            errorMessage.style.display = 'block';
        }
    }

    if (loginForm) {
        // Handle form submission
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            await handleLogin();
        });

        // Also handle button click for mobile compatibility (fallback)
        if (adminLoginButton) {
            adminLoginButton.addEventListener('click', async function(e) {
                // Only prevent default if form hasn't already submitted
                if (!isSubmitting) {
                    e.preventDefault();
                    e.stopPropagation();
                    await handleLogin();
                }
            });
        }

        // Handle Enter key press in password field (mobile keyboard)
        const passwordInput = document.getElementById('adminPassword');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', async function(e) {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    await handleLogin();
                }
            });
        }
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