// Supabase client for Vercel serverless
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to create Supabase client from request
export function getSupabase(req) {
  return supabase;
}

export default supabase;
