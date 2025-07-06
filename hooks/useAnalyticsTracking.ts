import { useEffect, useRef } from 'react';
import { usePathname } from 'expo-router';
import { analyticsService } from '@/lib/analytics';

// Hook for automatic page view tracking
export function useAnalyticsTracking() {
  const pathname = usePathname();
  const previousPathname = useRef<string>();

  useEffect(() => {
    // Initialize analytics on first load
    analyticsService.initialize();
    
    // Track app open on first load
    analyticsService.trackAppOpen();
  }, []);

  useEffect(() => {
    if (pathname !== previousPathname.current) {
      // Track page view
      const screenName = getScreenNameFromPath(pathname);
      analyticsService.trackScreenView(screenName);
      previousPathname.current = pathname;
    }
  }, [pathname]);
}

// Convert pathname to readable screen name
function getScreenNameFromPath(pathname: string): string {
  const pathMap: Record<string, string> = {
    '/': 'Calculator',
    '/(tabs)': 'Calculator',
    '/(tabs)/charts': 'Charts',
    '/(tabs)/table': 'Table',
    '/(tabs)/retirement': 'Retirement',
    '/(tabs)/scenarios': 'Scenarios',
    '/(tabs)/settings': 'Settings',
    '/admin': 'Admin Dashboard',
  };

  return pathMap[pathname] || pathname.replace(/^\//, '').replace(/\//g, '_') || 'Unknown';
}

// Hook for tracking user engagement time
export function useEngagementTracking() {
  const startTime = useRef<number>();
  const isActive = useRef(true);

  useEffect(() => {
    startTime.current = Date.now();

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined') {
        if (document.hidden) {
          // Track engagement when user leaves
          if (startTime.current && isActive.current) {
            const engagementTime = Date.now() - startTime.current;
            analyticsService.trackEngagement(engagementTime);
          }
          isActive.current = false;
        } else {
          // Reset timer when user returns
          startTime.current = Date.now();
          isActive.current = true;
        }
      }
    };

    const handleBeforeUnload = () => {
      if (startTime.current && isActive.current) {
        const engagementTime = Date.now() - startTime.current;
        analyticsService.trackEngagement(engagementTime);
      }
    };

    // Only add event listeners in web environment
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      // Track final engagement time
      if (startTime.current && isActive.current) {
        const engagementTime = Date.now() - startTime.current;
        analyticsService.trackEngagement(engagementTime);
      }

      // Clean up event listeners
      if (typeof document !== 'undefined' && typeof window !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, []);
}