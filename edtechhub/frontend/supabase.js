import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Prefer environment variables (EXPO_PUBLIC_*) but fall back to expo config extras
let supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || (Constants?.manifest?.extra && Constants.manifest.extra.EXPO_PUBLIC_SUPABASE_URL) || (Constants?.expoConfig?.extra && Constants.expoConfig.extra.EXPO_PUBLIC_SUPABASE_URL);
let supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || (Constants?.manifest?.extra && Constants.manifest.extra.EXPO_PUBLIC_SUPABASE_ANON_KEY) || (Constants?.expoConfig?.extra && Constants.expoConfig.extra.EXPO_PUBLIC_SUPABASE_ANON_KEY);

// Fallback to values provided explicitly by the user (hardcoded) when config isn't available at runtime
if (!supabaseUrl) {
  supabaseUrl = 'https://wotztqshiivvkhlgpidj.supabase.co';
}
if (!supabaseAnonKey) {
  supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvdHp0cXNoaWl2dmtobGdwaWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNjczNDMsImV4cCI6MjA5Nzk0MzM0M30.fh-wborS1G-tIaq5QX758w8Po_ZfB5dd0dVVF4HuwAE';
}

console.log('[supabase] using URL:', supabaseUrl ? supabaseUrl.slice(0,40) + '...' : '(none)');
console.log('[supabase] anon key present:', !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});