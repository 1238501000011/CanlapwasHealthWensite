-- Create the users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a function that automatically creates a user profile when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.users (id, name, email, type, created_at)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        'user', -- Default type for new users
        NOW()
    );
    RETURN NEW;
END;
$$;

-- Create a trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to check if email exists in auth.users (for duplicate email checking)
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.users 
        WHERE email = email_to_check
    );
END;
$$;

-- Create the medicines table
CREATE TABLE IF NOT EXISTS medicines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the schedules table
CREATE TABLE IF NOT EXISTS schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    doctor TEXT NOT NULL,
    days TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- Create RLS policies for medicines table
CREATE POLICY "All users can view medicines" ON medicines
    FOR SELECT USING (true);

CREATE POLICY "Admins can view all medicines" ON medicines
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.type = 'admin'
        )
    );

CREATE POLICY "Admins can insert medicines" ON medicines
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.type = 'admin'
        )
    );

CREATE POLICY "Admins can update medicines" ON medicines
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.type = 'admin'
        )
    );

CREATE POLICY "Admins can delete medicines" ON medicines
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.type = 'admin'
        )
    );

-- Create RLS policies for schedules table
CREATE POLICY "All users can view schedules" ON schedules
    FOR SELECT USING (true);

CREATE POLICY "Admins can view all schedules" ON schedules
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.type = 'admin'
        )
    );

CREATE POLICY "Admins can insert schedules" ON schedules
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.type = 'admin'
        )
    );

CREATE POLICY "Admins can update schedules" ON schedules
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.type = 'admin'
        )
    );

CREATE POLICY "Admins can delete schedules" ON schedules
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.type = 'admin'
        )
    );

-- Create RLS policies for notifications table
-- Users can view their own notifications or broadcast notifications (user_id IS NULL)
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR user_id IS NULL
    );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid() OR user_id IS NULL
    )
    WITH CHECK (
        user_id = auth.uid() OR user_id IS NULL
    );

-- Admins can insert notifications (send to all users or specific user)
CREATE POLICY "Admins can insert notifications" ON notifications
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.type = 'admin'
        )
    );

-- Admins can delete notifications
CREATE POLICY "Admins can delete notifications" ON notifications
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() AND users.type = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);
CREATE INDEX IF NOT EXISTS idx_medicines_quantity ON medicines(quantity);
CREATE INDEX IF NOT EXISTS idx_schedules_title ON schedules(title);
CREATE INDEX IF NOT EXISTS idx_schedules_doctor ON schedules(doctor);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Create trigger to update 'updated_at' timestamp for medicines
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_medicines_updated_at 
    BEFORE UPDATE ON medicines 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at 
    BEFORE UPDATE ON schedules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert demo admin user (use this for initial setup)
-- Note: You'll need to create the user in auth first, then insert here
-- INSERT INTO users (id, name, email, type, created_at) 
-- VALUES (
--     '00000000-0000-0000-0000-000000000000', -- Replace with actual auth user ID
--     'Admin User',
--     'admin@healthhub.com',
--     'admin',
--     NOW()
-- );