import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Create storage adapter for different platforms
const createStorageAdapter = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => {
        if (typeof localStorage === 'undefined') {
          return null;
        }
        return localStorage.getItem(key);
      },
      setItem: (key: string, value: string) => {
        if (typeof localStorage === 'undefined') {
          return;
        }
        localStorage.setItem(key, value);
      },
      removeItem: (key: string) => {
        if (typeof localStorage === 'undefined') {
          return;
        }
        localStorage.removeItem(key);
      },
    };
  } else {
    return AsyncStorage;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      scenarios: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          starting_amount: number;
          monthly_amount: number;
          years: number;
          current_age: number | null;
          btc_hurdle_rate: number;
          asset: string;
          cagr: number;
          pause_after_years: number | null;
          boost_after_years: number | null;
          boost_amount: number | null;
          future_value: number;
          btc_hurdle_value: number;
          outperformance: number;
          target_year: number;
          future_age: number | null;
          use_realistic_cagr: boolean;
          use_declining_rates: boolean;
          phase1_rate: number | null;
          phase2_rate: number | null;
          phase3_rate: number | null;
          inflation_rate: number | null;
          use_inflation_adjustment: boolean;
          is_public: boolean;
          shared_with: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          starting_amount: number;
          monthly_amount: number;
          years: number;
          current_age?: number | null;
          btc_hurdle_rate: number;
          asset: string;
          cagr: number;
          pause_after_years?: number | null;
          boost_after_years?: number | null;
          boost_amount?: number | null;
          future_value: number;
          btc_hurdle_value: number;
          outperformance: number;
          target_year: number;
          future_age?: number | null;
          use_realistic_cagr?: boolean;
          use_declining_rates?: boolean;
          phase1_rate?: number | null;
          phase2_rate?: number | null;
          phase3_rate?: number | null;
          inflation_rate?: number | null;
          use_inflation_adjustment?: boolean;
          is_public?: boolean;
          shared_with?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          starting_amount?: number;
          monthly_amount?: number;
          years?: number;
          current_age?: number | null;
          btc_hurdle_rate?: number;
          asset?: string;
          cagr?: number;
          pause_after_years?: number | null;
          boost_after_years?: number | null;
          boost_amount?: number | null;
          future_value?: number;
          btc_hurdle_value?: number;
          outperformance?: number;
          target_year?: number;
          future_age?: number | null;
          use_realistic_cagr?: boolean;
          use_declining_rates?: boolean;
          phase1_rate?: number | null;
          phase2_rate?: number | null;
          phase3_rate?: number | null;
          inflation_rate?: number | null;
          use_inflation_adjustment?: boolean;
          is_public?: boolean;
          shared_with?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          default_starting_amount: number;
          default_monthly_amount: number;
          default_years: number;
          default_current_age: number | null;
          default_btc_hurdle_rate: number;
          default_asset: string;
          default_cagr: number;
          theme_preference: string;
          notification_settings: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          default_starting_amount?: number;
          default_monthly_amount?: number;
          default_years?: number;
          default_current_age?: number | null;
          default_btc_hurdle_rate?: number;
          default_asset?: string;
          default_cagr?: number;
          theme_preference?: string;
          notification_settings?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          default_starting_amount?: number;
          default_monthly_amount?: number;
          default_years?: number;
          default_current_age?: number | null;
          default_btc_hurdle_rate?: number;
          default_asset?: string;
          default_cagr?: number;
          theme_preference?: string;
          notification_settings?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_type: string;
          event_data: any;
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_type: string;
          event_data?: any;
          session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          event_type?: string;
          event_data?: any;
          session_id?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}