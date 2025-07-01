import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface CloudScenario {
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
}

export function useScenarios() {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<CloudScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load scenarios when user changes
  useEffect(() => {
    if (user) {
      loadScenarios();
    } else {
      setScenarios([]);
    }
  }, [user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('scenarios_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scenarios',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Scenario change received:', payload);
          loadScenarios(); // Reload scenarios on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadScenarios = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setScenarios(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  };

  const saveScenario = async (scenario: Omit<CloudScenario, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) throw new Error('User not authenticated');

    setError(null);

    try {
      const { data, error } = await supabase
        .from('scenarios')
        .insert({
          ...scenario,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save scenario';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateScenario = async (id: string, updates: Partial<CloudScenario>) => {
    if (!user) throw new Error('User not authenticated');

    setError(null);

    try {
      const { data, error } = await supabase
        .from('scenarios')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update scenario';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteScenario = async (id: string) => {
    if (!user) throw new Error('User not authenticated');

    setError(null);

    try {
      const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete scenario';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const shareScenario = async (id: string, emails: string[], isPublic: boolean = false) => {
    if (!user) throw new Error('User not authenticated');

    setError(null);

    try {
      const { data, error } = await supabase
        .from('scenarios')
        .update({
          shared_with: emails,
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share scenario';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getSharedScenarios = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select(`
          *,
          profiles!scenarios_user_id_fkey(full_name, email)
        `)
        .or(`shared_with.cs.{${user.email}},is_public.eq.true`)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Error loading shared scenarios:', err);
      return [];
    }
  };

  return {
    scenarios,
    loading,
    error,
    loadScenarios,
    saveScenario,
    updateScenario,
    deleteScenario,
    shareScenario,
    getSharedScenarios,
  };
}