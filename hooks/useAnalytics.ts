import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface AnalyticsEvent {
  event_type: string;
  event_data?: any;
  session_id?: string;
}

export interface AnalyticsData {
  totalUsers: number;
  totalScenarios: number;
  popularAssets: Array<{ asset: string; count: number }>;
  averageInvestmentAmount: number;
  averageTimeHorizon: number;
  userEngagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
  scenarioTrends: Array<{
    date: string;
    scenarios_created: number;
    calculations_performed: number;
  }>;
}

let sessionId: string | null = null;

export function useAnalytics() {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  // Generate session ID on first use
  useEffect(() => {
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }, []);

  const trackEvent = async (event: AnalyticsEvent) => {
    try {
      await supabase.from('analytics_events').insert({
        user_id: user?.id || null,
        event_type: event.event_type,
        event_data: event.event_data || {},
        session_id: sessionId,
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  };

  const loadAnalyticsData = async () => {
    setLoading(true);
    
    try {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total scenarios
      const { count: totalScenarios } = await supabase
        .from('scenarios')
        .select('*', { count: 'exact', head: true });

      // Get popular assets
      const { data: assetData } = await supabase
        .from('scenarios')
        .select('asset')
        .not('asset', 'is', null);

      const assetCounts = assetData?.reduce((acc, { asset }) => {
        acc[asset] = (acc[asset] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const popularAssets = Object.entries(assetCounts)
        .map(([asset, count]) => ({ asset, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get average investment amounts
      const { data: investmentData } = await supabase
        .from('scenarios')
        .select('monthly_amount, years');

      const averageInvestmentAmount = investmentData?.length
        ? investmentData.reduce((sum, { monthly_amount }) => sum + monthly_amount, 0) / investmentData.length
        : 0;

      const averageTimeHorizon = investmentData?.length
        ? investmentData.reduce((sum, { years }) => sum + years, 0) / investmentData.length
        : 0;

      // Get user engagement (simplified - would need more complex queries in production)
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const { count: dailyActiveUsers } = await supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', dayAgo.toISOString())
        .not('user_id', 'is', null);

      const { count: weeklyActiveUsers } = await supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString())
        .not('user_id', 'is', null);

      const { count: monthlyActiveUsers } = await supabase
        .from('analytics_events')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', monthAgo.toISOString())
        .not('user_id', 'is', null);

      setAnalyticsData({
        totalUsers: totalUsers || 0,
        totalScenarios: totalScenarios || 0,
        popularAssets,
        averageInvestmentAmount,
        averageTimeHorizon,
        userEngagement: {
          dailyActiveUsers: dailyActiveUsers || 0,
          weeklyActiveUsers: weeklyActiveUsers || 0,
          monthlyActiveUsers: monthlyActiveUsers || 0,
        },
        scenarioTrends: [], // Would implement with more complex date aggregation
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Track common events
  const trackCalculation = (calculatorState: any) => {
    trackEvent({
      event_type: 'calculation_performed',
      event_data: {
        asset: calculatorState.selectedAsset,
        monthly_amount: calculatorState.monthlyAmount,
        years: calculatorState.years,
        cagr: calculatorState.customCAGR,
        has_starting_amount: calculatorState.startingAmount > 0,
        has_advanced_strategy: calculatorState.pauseAfterYears || calculatorState.boostAfterYears,
      },
    });
  };

  const trackScenarioSave = (scenario: any) => {
    trackEvent({
      event_type: 'scenario_saved',
      event_data: {
        asset: scenario.asset,
        future_value: scenario.futureValue,
        outperformance: scenario.outperformance,
      },
    });
  };

  const trackPageView = (page: string) => {
    trackEvent({
      event_type: 'page_view',
      event_data: { page },
    });
  };

  const trackFeatureUsage = (feature: string, data?: any) => {
    trackEvent({
      event_type: 'feature_usage',
      event_data: { feature, ...data },
    });
  };

  return {
    analyticsData,
    loading,
    loadAnalyticsData,
    trackEvent,
    trackCalculation,
    trackScenarioSave,
    trackPageView,
    trackFeatureUsage,
  };
}