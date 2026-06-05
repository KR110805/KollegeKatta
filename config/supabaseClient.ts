/**
 * Kollege Katta — Supabase Client Initialization & TypeScript Interfaces
 *
 * Initializes the Supabase client with AsyncStorage for persistent sessions
 * and exports all shared database entity types.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// ---------------------------------------------------------------------------
// Environment Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[KollegeKatta] Missing Supabase credentials. ' +
    'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
  );
}

// ---------------------------------------------------------------------------
// Supabase Client
// ---------------------------------------------------------------------------

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ---------------------------------------------------------------------------
// TypeScript Interfaces — Direct Database Entity Mappings
// ---------------------------------------------------------------------------

export interface College {
  id: number;
  name: string;
  accent_color: string;
  created_at: string;
}

export interface KattaPass {
  id: number;
  pass_key: string;
  kollege_id: number;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  kollege_id: number;
  alias_name: string;
  kollege_year: string;
  relationship_status: string;
  created_at: string;
}

export interface Post {
  id: number;
  user_id: string;
  kollege_id: number;
  content: string;
  category: 'rants' | 'ideas' | 'gossips';
  created_at: string;
  users?: { alias_name: string };
}

export interface HotlistProfile {
  id: number;
  kollege_id: number;
  target_insta_id: string;
  anonymous_likes_count: number;
  created_at: string;
}

export interface BazaarListing {
  id: number;
  user_id: string;
  kollege_id: number;
  item_title: string;
  price: string;
  contact_link: string;
  is_active: boolean;
  created_at: string;
  users: { alias_name: string };
}

// ---------------------------------------------------------------------------
// AsyncStorage Key Constants
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  KOLLEGE_ID: 'stored_kollege_id',
  USER_ID: 'stored_user_id',
  ALIAS_NAME: 'stored_alias_name',
  KOLLEGE_NAME: 'stored_kollege_name',
} as const;
