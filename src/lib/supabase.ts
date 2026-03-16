import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase is an OPTIONAL backup layer in the hybrid architecture
const isConfigured = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your-project-url.supabase.co';

export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isCloudBackupActive = () => !!supabase;
