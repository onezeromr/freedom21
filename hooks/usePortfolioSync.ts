import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface PortfolioState {
  startingAmount: number;
  monthlyAmount: number;
  years: number;
  currentAge: number | null;
  btcHurdleRate: number;
  selectedAsset: string;
  customCAGR: number;
  pauseAfterYears: number | null;
  boostAfterYears: number | null;
  boostAmount: number;
  useRealisticCAGR: boolean;
  useDecliningRates: boolean;
  phase1Rate: number;
  phase2Rate: number;
  phase3Rate: number;
  inflationRate: number;
  useInflationAdjustment: boolean;
  futureValue: number;
  btcHurdleValue: number;
  outperformance: number;
  targetYear: number;
  futureAge: number | null;
  lastUpdated: string;
}

export interface PortfolioEntry {
  id: string;
  amount: number;
  variance: number;
  variance_percentage: number;
  target: number;
  created_at: string;
}

// Check if localStorage is available (not in incognito mode)
const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

// Safe localStorage wrapper
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isLocalStorageAvailable()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (!isLocalStorageAvailable()) return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Silently fail in incognito mode
    }
  },
  removeItem: (key: string): void => {
    if (!isLocalStorageAvailable()) return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail in incognito mode
    }
  }
};

// Default portfolio state for when no data is available
const getDefaultPortfolioState = (): PortfolioState => {
  const currentYear = new Date().getFullYear();
  const years = 20;
  
  return {
    startingAmount: 0,
    monthlyAmount: 500,
    years,
    currentAge: null,
    btcHurdleRate: 30,
    selectedAsset: 'BTC',
    customCAGR: 30,
    pauseAfterYears: null,
    boostAfterYears: null,
    boostAmount: 1000,
    useRealisticCAGR: false,
    useDecliningRates: false,
    phase1Rate: 30,
    phase2Rate: 20,
    phase3Rate: 15,
    inflationRate: 3,
    useInflationAdjustment: false,
    futureValue: 0,
    btcHurdleValue: 0,
    outperformance: 0,
    targetYear: currentYear + years,
    futureAge: null,
    lastUpdated: new Date().toISOString(),
  };
};

export function usePortfolioSync() {
  const { user } = useAuth();
  const [portfolioState, setPortfolioState] = useState<PortfolioState | null>(null);
  const [portfolioEntries, setPortfolioEntries] = useState<PortfolioEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedStateRef = useRef<string>('');
  const isInitialLoadRef = useRef(true);

  // Helper function to create a comparable state hash (excluding calculated values)
  const createStateHash = useCallback((state: PortfolioState) => {
    const inputState = {
      startingAmount: state.startingAmount,
      monthlyAmount: state.monthlyAmount,
      years: state.years,
      currentAge: state.currentAge,
      btcHurdleRate: state.btcHurdleRate,
      selectedAsset: state.selectedAsset,
      customCAGR: state.customCAGR,
      pauseAfterYears: state.pauseAfterYears,
      boostAfterYears: state.boostAfterYears,
      boostAmount: state.boostAmount,
      useRealisticCAGR: state.useRealisticCAGR,
      useDecliningRates: state.useDecliningRates,
      phase1Rate: state.phase1Rate,
      phase2Rate: state.phase2Rate,
      phase3Rate: state.phase3Rate,
      inflationRate: state.inflationRate,
      useInflationAdjustment: state.useInflationAdjustment,
    };
    return JSON.stringify(inputState);
  }, []);

  // Load portfolio state from cloud or localStorage
  const loadPortfolioState = useCallback(async () => {
    setLoading(true);
    
    try {
      if (user) {
        // Load from cloud (user preferences)
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // Not found error
          console.error('Error loading portfolio state from cloud:', error);
        }

        if (data) {
          // Convert cloud data to portfolio state
          const cloudState: PortfolioState = {
            startingAmount: data.default_starting_amount || 0,
            monthlyAmount: data.default_monthly_amount || 500,
            years: data.default_years || 20,
            currentAge: data.default_current_age,
            btcHurdleRate: data.default_btc_hurdle_rate || 30,
            selectedAsset: data.default_asset || 'BTC',
            customCAGR: data.default_cagr || 30,
            pauseAfterYears: null,
            boostAfterYears: null,
            boostAmount: 1000,
            useRealisticCAGR: false,
            useDecliningRates: false,
            phase1Rate: 30,
            phase2Rate: 20,
            phase3Rate: 15,
            inflationRate: 3,
            useInflationAdjustment: false,
            futureValue: 0,
            btcHurdleValue: 0,
            outperformance: 0,
            targetYear: new Date().getFullYear() + (data.default_years || 20),
            futureAge: data.default_current_age ? data.default_current_age + (data.default_years || 20) : null,
            lastUpdated: data.updated_at,
          };
          
          // Calculate values for the loaded state
          const calculatedValues = calculatePortfolioValues(cloudState);
          const completeState = { ...cloudState, ...calculatedValues };
          
          setPortfolioState(completeState);
          
          // Also save to localStorage for offline access (if available)
          safeLocalStorage.setItem('freedom21_calculator_state', JSON.stringify(completeState));
          
          // Update last synced state reference
          lastSyncedStateRef.current = createStateHash(completeState);
          isInitialLoadRef.current = false;
          return;
        }
      }

      // Fallback to localStorage (if available)
      const savedState = safeLocalStorage.getItem('freedom21_calculator_state');
      if (savedState) {
        try {
          const localState = JSON.parse(savedState);
          
          // Ensure calculated values are present
          const calculatedValues = calculatePortfolioValues(localState);
          const completeState = { ...localState, ...calculatedValues };
          
          setPortfolioState(completeState);
          lastSyncedStateRef.current = createStateHash(completeState);
          isInitialLoadRef.current = false;
          return;
        } catch (parseError) {
          console.error('Error parsing saved state:', parseError);
        }
      }

      // Final fallback: use default state
      console.log('Using default portfolio state (incognito mode or no saved data)');
      const defaultState = getDefaultPortfolioState();
      const calculatedValues = calculatePortfolioValues(defaultState);
      const completeState = { ...defaultState, ...calculatedValues };
      
      setPortfolioState(completeState);
      lastSyncedStateRef.current = createStateHash(completeState);
      isInitialLoadRef.current = false;
      
    } catch (error) {
      console.error('Error loading portfolio state:', error);
      
      // Emergency fallback
      const defaultState = getDefaultPortfolioState();
      const calculatedValues = calculatePortfolioValues(defaultState);
      const completeState = { ...defaultState, ...calculatedValues };
      
      setPortfolioState(completeState);
      lastSyncedStateRef.current = createStateHash(completeState);
      isInitialLoadRef.current = false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Save portfolio state to cloud and localStorage
  const savePortfolioState = useCallback(async (state: Partial<PortfolioState>) => {
    if (!portfolioState) return;
    
    try {
      const updatedState = { ...portfolioState, ...state, lastUpdated: new Date().toISOString() };
      const newStateHash = createStateHash(updatedState);
      
      // Check if the input state actually changed (ignore calculated values)
      if (newStateHash === lastSyncedStateRef.current && !isInitialLoadRef.current) {
        return; // No meaningful changes, don't sync
      }
      
      // Save to localStorage immediately (if available)
      safeLocalStorage.setItem('freedom21_calculator_state', JSON.stringify(updatedState));
      setPortfolioState(updatedState);
      
      // Dispatch event for cross-tab sync (if localStorage is available)
      if (isLocalStorageAvailable()) {
        try {
          window.dispatchEvent(new CustomEvent('calculatorStateUpdate', { detail: updatedState }));
        } catch {
          // Silently fail if events are not supported
        }
      }

      // Only sync to cloud if user is authenticated and state actually changed
      if (user && newStateHash !== lastSyncedStateRef.current) {
        setSyncing(true);
        
        // Clear any existing timeout
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        
        // Debounce cloud sync
        syncTimeoutRef.current = setTimeout(async () => {
          try {
            const { error } = await supabase
              .from('user_preferences')
              .upsert({
                user_id: user.id,
                default_starting_amount: updatedState.startingAmount,
                default_monthly_amount: updatedState.monthlyAmount,
                default_years: updatedState.years,
                default_current_age: updatedState.currentAge,
                default_btc_hurdle_rate: updatedState.btcHurdleRate,
                default_asset: updatedState.selectedAsset,
                default_cagr: updatedState.customCAGR,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'user_id'
              });

            if (error) {
              console.error('Error saving portfolio state to cloud:', error);
            } else {
              // Update last synced state reference only on successful sync
              lastSyncedStateRef.current = newStateHash;
            }
          } catch (error) {
            console.error('Error saving portfolio state to cloud:', error);
          } finally {
            setSyncing(false);
          }
        }, 2000); // 2 second debounce to reduce frequent syncing
      }
      
      // Update the reference for non-cloud saves too
      lastSyncedStateRef.current = newStateHash;
      isInitialLoadRef.current = false;
    } catch (error) {
      console.error('Error saving portfolio state:', error);
    }
  }, [user, portfolioState, createStateHash]);

  // Load portfolio entries
  const loadPortfolioEntries = useCallback(async () => {
    if (!user) {
      // Add sample entries for non-authenticated users
      const sampleEntries: PortfolioEntry[] = [
        {
          id: 'sample-1',
          amount: 6500,
          variance: 500,
          variance_percentage: 8.33,
          target: 6000,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        },
        {
          id: 'sample-2',
          amount: 12800,
          variance: 800,
          variance_percentage: 6.67,
          target: 12000,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        }
      ];
      setPortfolioEntries(sampleEntries);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('portfolio_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading portfolio entries:', error);
        return;
      }

      setPortfolioEntries(data || []);
    } catch (error) {
      console.error('Error loading portfolio entries:', error);
    }
  }, [user]);

  // Save portfolio entry
  const savePortfolioEntry = useCallback(async (amount: number, target: number) => {
    if (!user) {
      alert('Please sign in to save portfolio entries');
      return null;
    }

    try {
      const variance = amount - target;
      const variance_percentage = target > 0 ? (variance / target) * 100 : 0;

      const { data, error } = await supabase
        .from('portfolio_entries')
        .insert({
          user_id: user.id,
          amount,
          variance,
          variance_percentage,
          target,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving portfolio entry:', error);
        return null;
      }

      // Reload entries
      await loadPortfolioEntries();
      return data;
    } catch (error) {
      console.error('Error saving portfolio entry:', error);
      return null;
    }
  }, [user, loadPortfolioEntries]);

  // Update portfolio entry
  const updatePortfolioEntry = useCallback(async (id: string, amount: number, target: number) => {
  }
  )
  const updatePortfolioEntry = useCallback(async (id: string, amount: number, target: number, date?: string) => {
    if (!user) {
      alert('Please sign in to update portfolio entries');
      return null;
    }

    try {
      const variance = amount - target;
      const variance_percentage = target > 0 ? (variance / target) * 100 : 0;

      const updateData: any = {
        amount,
        variance,
        variance_percentage,
        target,
      };

      // If date is provided, update the created_at timestamp
      if (date) {
        updateData.created_at = new Date(date).toISOString();
      }

      const { data, error } = await supabase
        .from('portfolio_entries')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating portfolio entry:', error);
        return null;
      }

      // Reload entries
      await loadPortfolioEntries();
      return data;
    } catch (error) {
      console.error('Error updating portfolio entry:', error);
      return null;
    }
  }, [user, loadPortfolioEntries]);

  // Delete portfolio entry - Fixed implementation
  const deletePortfolioEntry = useCallback(async (id: string) => {
    if (!user) {
      console.log('No user authenticated');
      return false;
    }

    // Don't allow deletion of sample entries
    if (id.startsWith('sample-')) {
      console.log('Cannot delete sample entries');
      return false;
    }

    try {
      console.log(`Attempting to delete portfolio entry: ${id} for user: ${user.id}`);
      
      const { error } = await supabase
        .from('portfolio_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting portfolio entry:', error);
        throw error;
      }

      console.log('Portfolio entry deleted successfully');
      
      // Reload entries to reflect the change
      await loadPortfolioEntries();
      return true;
    } catch (error) {
      console.error('Error deleting portfolio entry:', error);
      throw error;
    }
  }, [user, loadPortfolioEntries]);

  // Calculate portfolio values based on current state
  const calculatePortfolioValues = useCallback((state: PortfolioState) => {
    // Get the effective growth rate for a given year
    const getEffectiveGrowthRate = (year: number, baseRate: number): number => {
      let rate = baseRate;
      
      if (state.useRealisticCAGR) {
        rate = rate * 0.6;
      }
      
      if (state.useDecliningRates) {
        if (year <= 10) {
          rate = state.phase1Rate;
        } else if (year <= 20) {
          rate = state.phase2Rate;
        } else {
          rate = state.phase3Rate;
        }
        
        if (state.useRealisticCAGR) {
          rate = rate * 0.6;
        }
      }
      
      if (state.useInflationAdjustment) {
        rate = rate - state.inflationRate;
      }
      
      return Math.max(0, rate);
    };

    // Calculate year-by-year progression
    const calculateYearByYearProgression = (
      startingAmount: number,
      monthlyAmount: number,
      baseGrowthRate: number,
      targetYear: number,
      pauseAfterYears: number | null = null,
      boostAfterYears: number | null = null,
      boostAmount: number = 0
    ): number => {
      let totalValue = startingAmount;

      for (let year = 1; year <= targetYear; year++) {
        const rate = getEffectiveGrowthRate(year, baseGrowthRate) / 100;
        
        let monthlyContrib = monthlyAmount;
        
        if (pauseAfterYears && year > pauseAfterYears) {
          monthlyContrib = 0;
        } else if (boostAfterYears && year > boostAfterYears) {
          monthlyContrib = boostAmount;
        }

        const yearlyContrib = monthlyContrib * 12;
        totalValue = totalValue * (1 + rate) + yearlyContrib;
      }

      return Math.max(0, Math.round(totalValue));
    };

    const futureValue = calculateYearByYearProgression(
      state.startingAmount,
      state.monthlyAmount,
      state.customCAGR,
      state.years,
      state.pauseAfterYears,
      state.boostAfterYears,
      state.boostAmount
    );

    const btcHurdleValue = calculateYearByYearProgression(
      state.startingAmount,
      state.monthlyAmount,
      state.btcHurdleRate,
      state.years,
      state.pauseAfterYears,
      state.boostAfterYears,
      state.boostAmount
    );

    const outperformance = futureValue - btcHurdleValue;
    const currentYear = new Date().getFullYear();
    const targetYear = currentYear + state.years;
    const futureAge = state.currentAge ? state.currentAge + state.years : null;

    return {
      futureValue,
      btcHurdleValue,
      outperformance,
      targetYear,
      futureAge,
    };
  }, []);

  // Update portfolio state with calculated values
  const updatePortfolioState = useCallback(async (updates: Partial<PortfolioState>) => {
    if (!portfolioState) return;

    const newState = { ...portfolioState, ...updates };
    const calculatedValues = calculatePortfolioValues(newState);
    
    await savePortfolioState({
      ...newState,
      ...calculatedValues,
    });
  }, [portfolioState, calculatePortfolioValues, savePortfolioState]);

  // Initialize on mount
  useEffect(() => {
    loadPortfolioState();
  }, [loadPortfolioState]);

  // Load portfolio entries when user changes
  useEffect(() => {
    loadPortfolioEntries();
  }, [user, loadPortfolioEntries]);

  // Listen for storage events (cross-tab sync) - only if localStorage is available
  useEffect(() => {
    if (!isLocalStorageAvailable()) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'freedom21_calculator_state' && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue);
          setPortfolioState(newState);
          lastSyncedStateRef.current = createStateHash(newState);
        } catch {
          // Ignore invalid JSON
        }
      }
    };

    const handleCalculatorUpdate = (event: CustomEvent) => {
      setPortfolioState(event.detail);
      lastSyncedStateRef.current = createStateHash(event.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('calculatorStateUpdate', handleCalculatorUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('calculatorStateUpdate', handleCalculatorUpdate as EventListener);
    };
  }, [createStateHash]);

  // Set up real-time subscription for portfolio entries
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('portfolio_entries_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio_entries',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadPortfolioEntries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadPortfolioEntries]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    portfolioState,
    portfolioEntries,
    loading,
    syncing,
    updatePortfolioState,
    savePortfolioEntry,
    updatePortfolioEntry,
    deletePortfolioEntry,
    loadPortfolioState,
    loadPortfolioEntries,
  };
}