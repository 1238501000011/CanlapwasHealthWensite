// User login functionality using Supabase
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const registerModal = document.getElementById('registerModal');
    const registerLink = document.getElementById('registerLink');
    const closeRegisterModal = document.getElementById('closeRegisterModal');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const registerErrorMessage = document.getElementById('registerErrorMessage');
    const registerSuccessMessage = document.getElementById('registerSuccessMessage');

    // Handle user login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginButton = document.getElementById('loginButton');
            
            // Clear previous messages
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';
            
            // Set loading state
            if (loginButton) {
                loginButton.classList.add('loading');
                loginButton.disabled = true;
            }
            
            try {
                // Attempt to sign in with Supabase
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });
                
                if (error) {
                    console.error('Login error:', error);
                    
                    // Remove loading state
                    if (loginButton) {
                        loginButton.classList.remove('loading');
                        loginButton.disabled = false;
                    }
                    
                    // Check if error is due to unverified email
                    if (error.message && error.message.includes('email') && error.message.includes('confirm')) {
                        errorMessage.textContent = 'Please verify your email before logging in.';
                    } else {
                        errorMessage.textContent = 'Invalid credentials. Please try again.';
                    }
                    errorMessage.style.display = 'block';
                    return;
                }
                
                // Check if email is verified
                if (!data.user.email_confirmed_at && !data.user.confirmed_at) {
                    // Remove loading state
                    if (loginButton) {
                        loginButton.classList.remove('loading');
                        loginButton.disabled = false;
                    }
                    
                    // Sign out the user
                    await supabase.auth.signOut();
                    
                    errorMessage.textContent = 'Please verify your email before logging in.';
                    errorMessage.style.display = 'block';
                    return;
                }
                
                // Check if the user is a regular user (not an admin)
                const { data: user, error: userError } = await supabase
                    .from('users')
                    .select('type, name, email')
                    .eq('id', data.user.id)
                    .single();
                
                if (userError || !user) {
                    console.error('User lookup error:', userError);
                    
                    // Remove loading state
                    if (loginButton) {
                        loginButton.classList.remove('loading');
                        loginButton.disabled = false;
                    }
                    
                    errorMessage.textContent = 'User not found.';
                    errorMessage.style.display = 'block';
                    
                    // Sign out the user since they're not in our system
                    await supabase.auth.signOut();
                    return;
                }
                
                if (user.type === 'admin') {
                    console.error('Admin user trying to access user login');
                    
                    // Remove loading state
                    if (loginButton) {
                        loginButton.classList.remove('loading');
                        loginButton.disabled = false;
                    }
                    
                    errorMessage.textContent = 'Admin users must use the admin login page.';
                    errorMessage.style.display = 'block';
                    
                    // Sign out the user
                    await supabase.auth.signOut();
                    return;
                }
                
                // User login successful
                successMessage.textContent = 'Login successful! Redirecting...';
                successMessage.style.display = 'block';
                
                // Redirect to home page after a short delay
                setTimeout(() => {
                    window.location.href = 'Home.html';
                }, 1000);
                
            } catch (error) {
                console.error('Unexpected error during login:', error);
                
                // Remove loading state
                if (loginButton) {
                    loginButton.classList.remove('loading');
                    loginButton.disabled = false;
                }
                
                errorMessage.textContent = 'An unexpected error occurred. Please try again.';
                errorMessage.style.display = 'block';
            }
        });
    }

    // Real-time email validation and duplicate check
    const registerEmailInput = document.getElementById('registerEmail');
    let emailCheckTimeout = null;
    
    if (registerEmailInput) {
        // Check email on blur (when user leaves the field)
        registerEmailInput.addEventListener('blur', async function() {
            const email = this.value.trim().toLowerCase();
            
            // Clear any existing timeout
            if (emailCheckTimeout) {
                clearTimeout(emailCheckTimeout);
            }
            
            // Only check if email is not empty and has valid format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                return;
            }
            
            // Debounce the check
            emailCheckTimeout = setTimeout(async () => {
                try {
                    const { data: existingUser, error: checkError } = await supabase
                        .from('users')
                        .select('email')
                        .eq('email', email)
                        .maybeSingle();
                    
                    if (existingUser && existingUser.email) {
                        // Email already exists - show warning
                        registerErrorMessage.textContent = 'This email is already registered. Please log in or use a different email.';
                        registerErrorMessage.style.display = 'block';
                        registerEmailInput.style.borderColor = '#ef4444';
                    } else {
                        // Email is available - clear any previous error
                        if (registerErrorMessage.textContent.includes('already registered')) {
                            registerErrorMessage.style.display = 'none';
                        }
                        registerEmailInput.style.borderColor = '#e5e7eb';
                    }
                } catch (error) {
                    // Silently fail - we'll check again on submit
                    console.error('Error checking email:', error);
                }
            }, 500); // 500ms debounce
        });
        
        // Clear error styling on input
        registerEmailInput.addEventListener('input', function() {
            if (this.style.borderColor === '#ef4444') {
                this.style.borderColor = '#e5e7eb';
            }
            // Hide error if user starts typing
            if (registerErrorMessage.textContent.includes('already registered')) {
                registerErrorMessage.style.display = 'none';
            }
        });
    }

    // Handle registration form submission
    if (registerForm) {
        let isSubmitting = false; // Prevent multiple submissions
        
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Prevent multiple submissions
            if (isSubmitting) {
                return;
            }
            
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            
            // Clear previous messages
            registerErrorMessage.style.display = 'none';
            registerSuccessMessage.style.display = 'none';
            
            // Basic validation
            if (!name || !email || !password || !confirmPassword) {
                registerErrorMessage.textContent = 'Please fill in all fields';
                registerErrorMessage.style.display = 'block';
                return;
            }
            
            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                registerErrorMessage.textContent = 'Please enter a valid email address';
                registerErrorMessage.style.display = 'block';
                return;
            }
            
            if (password !== confirmPassword) {
                registerErrorMessage.textContent = 'Passwords do not match';
                registerErrorMessage.style.display = 'block';
                return;
            }
            
            if (password.length < 6) {
                registerErrorMessage.textContent = 'Password must be at least 6 characters long';
                registerErrorMessage.style.display = 'block';
                return;
            }
            
            const registerButton = document.getElementById('registerButton');
            
            // Set submitting flag and loading state
            isSubmitting = true;
            if (registerButton) {
                registerButton.classList.add('loading');
                registerButton.disabled = true;
            }
            
            try {
                const normalizedEmail = email.toLowerCase().trim();
                
                // Method 1: Check if email exists in users table (for confirmed users)
                const { data: existingUser, error: checkError } = await supabase
                    .from('users')
                    .select('email')
                    .eq('email', normalizedEmail)
                    .maybeSingle();
                
                if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                    console.error('Error checking email:', checkError);
                }
                
                if (existingUser && existingUser.email) {
                    // Email already exists in database (confirmed user)
                    isSubmitting = false;
                    if (registerButton) {
                        registerButton.classList.remove('loading');
                        registerButton.disabled = false;
                    }
                    
                    registerErrorMessage.textContent = 'This email is already registered. Please log in or use a different email.';
                    registerErrorMessage.style.display = 'block';
                    return;
                }
                
                // Method 2: Check auth.users via database function (checks both confirmed and unconfirmed)
                try {
                    const { data: emailExists, error: rpcError } = await supabase
                        .rpc('check_email_exists', { email_to_check: normalizedEmail });
                    
                    if (!rpcError && emailExists === true) {
                        // Email exists in auth.users (even if unconfirmed)
                        isSubmitting = false;
                        if (registerButton) {
                            registerButton.classList.remove('loading');
                            registerButton.disabled = false;
                        }
                        
                        registerErrorMessage.textContent = 'This email is already registered. Please log in or use a different email.';
                        registerErrorMessage.style.display = 'block';
                        return;
                    }
                } catch (rpcErr) {
                    // RPC function might not exist yet - continue with signup attempt
                    console.warn('RPC function check failed, continuing with signup:', rpcErr);
                }
                
                // Method 3: Attempt to sign up - Supabase will return error if email exists
                const { data, error } = await supabase.auth.signUp({
                    email: normalizedEmail,
                    password: password,
                    options: {
                        data: {
                            full_name: name
                        },
                        emailRedirectTo: `${window.location.origin}/EmailConfirm.html`
                    }
                });
                
                // Remove loading state
                isSubmitting = false;
                if (registerButton) {
                    registerButton.classList.remove('loading');
                    registerButton.disabled = false;
                }
                
                if (error) {
                    console.error('Registration error:', error);
                    console.error('Error details:', { message: error.message, status: error.status, code: error.code });
                    
                    // Handle specific duplicate email errors from Supabase
                    const errorMsg = error.message ? error.message.toLowerCase() : '';
                    const isDuplicateError = 
                        errorMsg.includes('already registered') ||
                        errorMsg.includes('already exists') ||
                        errorMsg.includes('user already registered') ||
                        errorMsg.includes('email address is already registered') ||
                        errorMsg.includes('user with this email address has already been registered') ||
                        errorMsg.includes('email already registered') ||
                        errorMsg.includes('email already exists') ||
                        error.status === 422 ||
                        error.code === 'signup_disabled' ||
                        (error.status >= 400 && error.status < 500);
                    
                    if (isDuplicateError) {
                        registerErrorMessage.textContent = 'This email is already registered. Please log in or use a different email.';
                    } else if (errorMsg.includes('invalid email')) {
                        registerErrorMessage.textContent = 'Please enter a valid email address.';
                    } else {
                        registerErrorMessage.textContent = error.message || 'Registration failed. Please try again.';
                    }
                    
                    registerErrorMessage.style.display = 'block';
                    return;
                }
                
                // Critical check: Supabase signUp might succeed but return null user if email already exists
                // This happens when email confirmation is enabled and email exists but unconfirmed
                if (!data || !data.user) {
                    console.warn('SignUp returned no user data - checking if email exists');
                    
                    // Wait a moment for trigger to potentially create user record
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Check users table again
                    const { data: doubleCheck, error: doubleCheckError } = await supabase
                        .from('users')
                        .select('email')
                        .eq('email', normalizedEmail)
                        .maybeSingle();
                    
                    if (doubleCheck && doubleCheck.email) {
                        registerErrorMessage.textContent = 'This email is already registered. Please log in or use a different email.';
                        registerErrorMessage.style.display = 'block';
                        isSubmitting = false;
                        if (registerButton) {
                            registerButton.classList.remove('loading');
                            registerButton.disabled = false;
                        }
                        return;
                    }
                    
                    // If still no user and no error, it might be a legitimate new registration
                    // But Supabase with email confirmation enabled should return user even if unconfirmed
                    // If we get here with no user, something is wrong - treat as potential duplicate
                    console.warn('SignUp succeeded but no user returned - treating as potential duplicate');
                    
                    registerErrorMessage.textContent = 'This email may already be registered. Please check your email for a confirmation link, or try logging in.';
                    registerErrorMessage.style.display = 'block';
                    isSubmitting = false;
                    if (registerButton) {
                        registerButton.classList.remove('loading');
                        registerButton.disabled = false;
                    }
                    return;
                }
                
                // The trigger will automatically create the user profile in the users table
                // No need to manually insert here
                
                // Registration successful - show email confirmation message
                registerSuccessMessage.textContent = 'Registration successful! Please check your email to confirm your account.';
                registerSuccessMessage.style.display = 'block';
                
                // Clear form
                registerForm.reset();
                
                // Reset submitting flag after successful registration
                isSubmitting = false;
                
                // Close modal after a delay
                setTimeout(() => {
                    registerModal.style.display = 'none';
                    registerSuccessMessage.style.display = 'none';
                    
                    // Show success message on main login form
                    successMessage.textContent = 'Registration successful! Please check your email to confirm your account before logging in.';
                    successMessage.style.display = 'block';
                }, 3000);
                
            } catch (error) {
                console.error('Unexpected error during registration:', error);
                
                // Remove loading state and reset submitting flag
                isSubmitting = false;
                if (registerButton) {
                    registerButton.classList.remove('loading');
                    registerButton.disabled = false;
                }
                
                // Handle network errors
                if (error.message && (
                    error.message.toLowerCase().includes('network') ||
                    error.message.toLowerCase().includes('fetch') ||
                    error.message.toLowerCase().includes('connection')
                )) {
                    registerErrorMessage.textContent = 'Network error. Please check your internet connection and try again.';
                } else if (error.message && error.message.toLowerCase().includes('already')) {
                    registerErrorMessage.textContent = 'This email is already registered. Please log in or use a different email.';
                } else {
                    registerErrorMessage.textContent = 'An unexpected error occurred. Please try again.';
                }
                
                registerErrorMessage.style.display = 'block';
            }
        });
    }

    // Open registration modal
    if (registerLink) {
        registerLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (registerModal) {
                registerModal.style.display = 'flex';
            }
        });
    }

    // Close registration modal
    if (closeRegisterModal) {
        closeRegisterModal.addEventListener('click', function() {
            if (registerModal) {
                registerModal.style.display = 'none';
                registerErrorMessage.style.display = 'none';
                registerSuccessMessage.style.display = 'none';
                
                // Clear form
                if (registerForm) {
                    registerForm.reset();
                }
            }
        });
    }

    // Close modal when clicking outside of it
    if (registerModal) {
        registerModal.addEventListener('click', function(e) {
            if (e.target === registerModal) {
                registerModal.style.display = 'none';
                registerErrorMessage.style.display = 'none';
                registerSuccessMessage.style.display = 'none';
                
                // Clear form
                if (registerForm) {
                    registerForm.reset();
                }
            }
        });
    }
});