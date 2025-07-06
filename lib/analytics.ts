import { Platform } from 'react-native';
import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { initializeFirebaseWeb, analytics as webAnalytics } from './firebaseWeb';

// Import React Native Firebase for mobile
let mobileAnalytics: any = null;
if (Platform.OS !== 'web') {
  try {
    mobileAnalytics = require('@react-native-firebase/analytics').default;
  } catch (error) {
    console.log('React Native Firebase not available');
  }
}

class AnalyticsService {
  private isInitialized = false;
  private webAnalytics: any = null;

  async initialize() {
    if (this.isInitialized) return;

    if (Platform.OS === 'web') {
      // Initialize Firebase Web Analytics
      const firebaseWeb = initializeFirebaseWeb();
      if (firebaseWeb?.analytics) {
        this.webAnalytics = firebaseWeb.analytics;
        console.log('Firebase Web Analytics initialized');
      }
    } else {
      // Initialize React Native Firebase Analytics
      if (mobileAnalytics) {
        await mobileAnalytics().setAnalyticsCollectionEnabled(true);
        console.log('React Native Firebase Analytics initialized');
      }
    }

    this.isInitialized = true;
  }

  // Track page views / screen views
  async trackScreenView(screenName: string, screenClass?: string) {
    if (!this.isInitialized) await this.initialize();

    try {
      if (Platform.OS === 'web' && this.webAnalytics) {
        logEvent(this.webAnalytics, 'page_view', {
          page_title: screenName,
          page_location: window.location.href,
          page_path: window.location.pathname,
        });
      } else if (mobileAnalytics) {
        await mobileAnalytics().logScreenView({
          screen_name: screenName,
          screen_class: screenClass || screenName,
        });
      }
    } catch (error) {
      console.error('Error tracking screen view:', error);
    }
  }

  // Track custom events
  async trackEvent(eventName: string, parameters?: Record<string, any>) {
    if (!this.isInitialized) await this.initialize();

    try {
      if (Platform.OS === 'web' && this.webAnalytics) {
        logEvent(this.webAnalytics, eventName, parameters);
      } else if (mobileAnalytics) {
        await mobileAnalytics().logEvent(eventName, parameters);
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  // Track user engagement
  async trackEngagement(engagementTimeMs: number) {
    await this.trackEvent('user_engagement', {
      engagement_time_msec: engagementTimeMs,
    });
  }

  // Track calculator usage
  async trackCalculatorUsage(parameters: {
    asset: string;
    monthly_amount: number;
    years: number;
    starting_amount?: number;
    strategy_type?: string;
  }) {
    await this.trackEvent('calculator_usage', {
      asset_type: parameters.asset,
      monthly_investment: parameters.monthly_amount,
      time_horizon: parameters.years,
      starting_amount: parameters.starting_amount || 0,
      strategy: parameters.strategy_type || 'standard',
    });
  }

  // Track scenario saves
  async trackScenarioSave(parameters: {
    asset: string;
    future_value: number;
    outperformance: number;
  }) {
    await this.trackEvent('scenario_saved', {
      asset_type: parameters.asset,
      projected_value: parameters.future_value,
      btc_outperformance: parameters.outperformance,
    });
  }

  // Track user sign ups
  async trackSignUp(method: string = 'email') {
    await this.trackEvent('sign_up', {
      method: method,
    });
  }

  // Track user sign ins
  async trackSignIn(method: string = 'email') {
    await this.trackEvent('login', {
      method: method,
    });
  }

  // Track feature usage
  async trackFeatureUsage(feature: string, parameters?: Record<string, any>) {
    await this.trackEvent('feature_usage', {
      feature_name: feature,
      ...parameters,
    });
  }

  // Track chart interactions
  async trackChartInteraction(chartType: string, action: string) {
    await this.trackEvent('chart_interaction', {
      chart_type: chartType,
      action: action,
    });
  }

  // Track retirement planning usage
  async trackRetirementPlanning(parameters: {
    portfolio_value: number;
    etf_selected: string;
    strategy: string;
  }) {
    await this.trackEvent('retirement_planning', {
      portfolio_value: parameters.portfolio_value,
      etf_type: parameters.etf_selected,
      income_strategy: parameters.strategy,
    });
  }

  // Track conversion events
  async trackConversion(conversionType: string, value?: number) {
    await this.trackEvent('conversion', {
      conversion_type: conversionType,
      value: value,
    });
  }

  // Set user properties
  async setUserProperty(name: string, value: string) {
    if (!this.isInitialized) await this.initialize();

    try {
      if (Platform.OS === 'web' && this.webAnalytics) {
        setUserProperties(this.webAnalytics, { [name]: value });
      } else if (mobileAnalytics) {
        await mobileAnalytics().setUserProperty(name, value);
      }
    } catch (error) {
      console.error('Error setting user property:', error);
    }
  }

  // Set user ID for cross-platform tracking
  async setUserId(userId: string) {
    if (!this.isInitialized) await this.initialize();

    try {
      if (Platform.OS === 'web' && this.webAnalytics) {
        setUserId(this.webAnalytics, userId);
      } else if (mobileAnalytics) {
        await mobileAnalytics().setUserId(userId);
      }
    } catch (error) {
      console.error('Error setting user ID:', error);
    }
  }

  // Track app opens
  async trackAppOpen() {
    await this.trackEvent('app_open');
  }

  // Track search events
  async trackSearch(searchTerm: string) {
    await this.trackEvent('search', {
      search_term: searchTerm,
    });
  }

  // Track purchases (for future monetization)
  async trackPurchase(parameters: {
    transaction_id: string;
    value: number;
    currency: string;
    items?: any[];
  }) {
    await this.trackEvent('purchase', {
      transaction_id: parameters.transaction_id,
      value: parameters.value,
      currency: parameters.currency,
      items: parameters.items,
    });
  }
}

export const analyticsService = new AnalyticsService();