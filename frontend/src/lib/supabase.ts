import { createClient } from '@supabase/supabase-js';

// Usar el prefijo NEXT_PUBLIC_ es obligatorio para el frontend [cite: 102]
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Error: Las variables de entorno NEXT_PUBLIC_SUPABASE no están definidas.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);