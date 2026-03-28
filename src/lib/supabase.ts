import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Supabase is an OPTIONAL backup layer in the hybrid architecture
const isConfigured = supabaseUrl && supabaseAnonKey && 
    supabaseUrl !== 'your-project-url.supabase.co' && 
    supabaseAnonKey !== 'your-anon-key';

export const supabase = isConfigured
    ? createClient(supabaseUrl!, supabaseAnonKey!)
    : null;

export const isCloudBackupActive = () => !!supabase;
