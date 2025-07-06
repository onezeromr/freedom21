import { Platform } from 'react-native';
import analytics from '@react-native-firebase/analytics';

// Web-specific Google Analytics implementation
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

class AnalyticsService {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    if (Platform.OS === 'web') {
      // Initialize Google Analytics for web
      this.initializeWebAnalytics();
    } else {
      // Firebase Analytics is automatically initialized on mobile
      await analytics().setAnalyticsCollectionEnabled(true);
    }

    this.isInitialized = true;
  }

  private initializeWebAnalytics() {
    // Load Google Analytics script
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = 'https://www.googletagmanager.com/gtag/js?id=G-8N2LSBDFJ5';
    document.head.appendChild(script1);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', 'G-8N2LSBDFJ5', {
      page_title: document.title,
      page_location: window.location.href,
    });
  }

  // Track page views
  async trackScreenView(screenName: string, screenClass?: string) {
    if (!this.isInitialized) await this.initialize();

    if (Platform.OS === 'web') {
      window.gtag?.('config', 'G-8N2LSBDFJ5', {
        page_title: screenName,
        page_location: window.location.href,
      });
    } else {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    }
  }

  // Track custom events
  async trackEvent(eventName: string, parameters?: Record<string, any>) {
    if (!this.isInitialized) await this.initialize();

    if (Platform.OS === 'web') {
      window.gtag?.('event', eventName, parameters);
    } else {
      await analytics().logEvent(eventName, parameters);
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

    if (Platform.OS === 'web') {
      window.gtag?.('config', 'G-8N2LSBDFJ5', {
        custom_map: { [name]: value },
      });
    } else {
      await analytics().setUserProperty(name, value);
    }
  }

  // Set user ID for cross-platform tracking
  async setUserId(userId: string) {
    if (!this.isInitialized) await this.initialize();

    if (Platform.OS === 'web') {
      window.gtag?.('config', 'G-8N2LSBDFJ5', {
        user_id: userId,
      });
    } else {
      await analytics().setUserId(userId);
    }
  }
}

export const analyticsService = new AnalyticsService();