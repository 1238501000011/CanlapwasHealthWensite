// Supabase Client Configuration
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

// Initialize Supabase client
const supabaseUrl = 'https://lupsrifanvbhqugnhixq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1cHNyaWZhbnZiaHF1Z25oaXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MjMyOTYsImV4cCI6MjA4MzA5OTI5Nn0.ihVVR8wAkNE5wYxOUwcH8iBYx79tGAGFdETPTgS1iVg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);