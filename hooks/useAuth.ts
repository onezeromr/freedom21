import { useEffect, useState } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { analyticsService } from '@/lib/analytics';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          setAuthState({
            user: session?.user ?? null,
            session,
            loading: false,
            error,
          });
        }
      } catch (error) {
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            error: error as AuthError,
          });
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (mounted) {
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        });
      }

      // Handle successful sign in - profile creation is handled by database trigger
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in successfully:', session.user.email);
      }

      // Handle sign out
      if (event === 'SIGNED_OUT') {
        console.log('User signed out successfully');
        // Clear any local storage if needed
        try {
          localStorage.removeItem('supabase.auth.token');
        } catch (error) {
          console.log('No localStorage to clear');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error }));
        return { data, error };
      }

      // For email confirmation flow, user won't be immediately signed in
      if (data.user && !data.session) {
        console.log('User created, email confirmation required');
        // Track sign up attempt
        await analyticsService.trackSignUp('email');
      }

      setAuthState(prev => ({ ...prev, loading: false }));
      return { data, error: null };
    } catch (err) {
      const error = err as AuthError;
      setAuthState(prev => ({ ...prev, loading: false, error }));
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false, error }));
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
        // Track successful sign in
        await analyticsService.trackSignIn('email');
        
        // Set user ID for analytics
        if (data.user) {
          await analyticsService.setUserId(data.user.id);
        }
      }

      return { data, error };
    } catch (err) {
      const error = err as AuthError;
      setAuthState(prev => ({ ...prev, loading: false, error }));
      return { data: null, error };
    }
  };

  const signOut = async () => {
    console.log('Starting sign out process...');
    
    try {
      // First, clear analytics user ID
      await analyticsService.setUserId('');
      
      // Clear the session from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
        // Even if there's an error, force clear the local state
        console.log('Forcing local sign out despite error');
      }

      // Force clear the auth state regardless of API response
      setAuthState({
        user: null,
        session: null,
        loading: false,
        error: null,
      });

      // Clear local storage (with better error handling)
      try {
        if (typeof localStorage !== 'undefined') {
          // Get all localStorage keys first to avoid modification during iteration
          const keys = Object.keys(localStorage);
          const authKeys = keys.filter(key => 
            key.includes('supabase') || 
            key.includes('sb-') || 
            key.startsWith('supabase.') ||
            key.includes('auth')
          );
          
          // Remove auth-related keys
          authKeys.forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (e) {
              console.log('Could not remove key:', key);
            }
          });
        }
      } catch (storageError) {
        console.log('Storage clear error (non-critical):', storageError);
      }

      console.log('Sign out successful');
      return { error: null };
    } catch (err) {
      console.error('Unexpected sign out error:', err);
      
      // Force clear state even on unexpected errors
      setAuthState({
        user: null,
        session: null,
        loading: false,
        error: null,
      });
      
      console.log('Forced sign out due to error');
      return { error: err as AuthError };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { data, error };
    } catch (err) {
      const error = err as AuthError;
      return { data: null, error };
    }
  };

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };
}