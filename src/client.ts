import { createClient } from '@supabase/supabase-js';
export const demo = import.meta.env.VITE_DEMO_MODE === 'true';
// Public browser connection settings for this shared board, not secret credentials.
// Environment variables override these when deploying to a different project.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://fgmkyggjrmtalktkerno.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_b6UMUXhpSIaZro-Q9ry96g_Qx1WXk5e';
export const db = !demo && url && key ? createClient(url, key, {
  auth: { detectSessionInUrl: false, persistSession: false, autoRefreshToken: false },
}) : null;
