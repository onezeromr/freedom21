import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Shield, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Zap, 
  RefreshCw,
  ChartBar as BarChart3,
  Activity,
  Target,
  Globe,
  Smartphone,
  Monitor,
  Eye,
  EyeOff
} from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import GlassCard from '@/components/GlassCard';
import { useAnalytics, AnalyticsData } from '@/hooks/useAnalytics';
import { useAuth } from '@/hooks/useAuth';

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const { user } = useAuth();
  const { analyticsData, loading, loadAnalyticsData } = useAnalytics();
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleAdminLogin = async () => {
    try {
      const response = await fetch(`/admin?key=${encodeURIComponent(adminKey)}`);
      
      if (response.ok) {
        setIsAuthenticated(true);
        loadAnalyticsData();
        Alert.alert('Success', 'Admin access granted');
      } else {
        Alert.alert('Error', 'Invalid admin key');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to authenticate');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const MetricCard = ({ 
    icon, 
    title, 
    value, 
    subtitle, 
    color = '#00D4AA',
    trend 
  }: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
    trend?: { value: number; isPositive: boolean };
  }) => (
    <GlassCard style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}>
          {icon}
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: trend.isPositive ? '#00D4AA20' : '#EF444420' }]}>
            <TrendingUp 
              size={12} 
              color={trend.isPositive ? '#00D4AA' : '#EF4444'} 
              style={!trend.isPositive ? { transform: [{ rotate: '180deg' }] } : undefined}
            />
            <Text style={[styles.trendText, { color: trend.isPositive ? '#00D4AA' : '#EF4444' }]}>
              {Math.abs(trend.value)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    </GlassCard>
  );

  const PopularAssetCard = ({ asset, count, rank }: { asset: string; count: number; rank: number }) => (
    <View style={styles.assetCard}>
      <View style={styles.assetRank}>
        <Text style={styles.assetRankText}>#{rank}</Text>
      </View>
      <View style={styles.assetInfo}>
        <Text style={styles.assetName}>{asset}</Text>
        <Text style={styles.assetCount}>{count} scenarios</Text>
      </View>
      <View style={styles.assetBar}>
        <View 
          style={[
            styles.assetBarFill, 
            { 
              width: `${(count / (analyticsData?.popularAssets[0]?.count || 1)) * 100}%`,
              backgroundColor: rank === 1 ? '#00D4AA' : rank === 2 ? '#FB923C' : rank === 3 ? '#F59E0B' : '#64748B'
            }
          ]} 
        />
      </View>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0A0E1A', '#1E293B', '#0F172A']}
          style={styles.gradient}
        >
          <View style={styles.loginContainer}>
            <View style={styles.loginCard}>
              <View style={styles.loginHeader}>
                <Shield size={48} color="#00D4AA" />
                <Text style={styles.loginTitle}>Admin Dashboard</Text>
                <Text style={styles.loginSubtitle}>Enter admin key to access analytics</Text>
              </View>
              
              <View style={styles.loginForm}>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.adminInput}
                    placeholder="Admin Key"
                    placeholderTextColor="#64748B"
                    value={adminKey}
                    onChangeText={setAdminKey}
                    secureTextEntry={!showKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff size={20} color="#94A3B8" />
                    ) : (
                      <Eye size={20} color="#94A3B8" />
                    )}
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleAdminLogin}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#00D4AA', '#00A887']}
                    style={styles.loginButtonGradient}
                  >
                    <Shield size={20} color="#FFFFFF" />
                    <Text style={styles.loginButtonText}>Access Dashboard</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              
              <View style={styles.loginFooter}>
                <Text style={styles.loginFooterText}>
                  🔒 Secure admin access for Freedom21 analytics
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0E1A', '#1E293B', '#0F172A']}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <AnimatedCard delay={0}>
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Shield size={32} color="#00D4AA" strokeWidth={2} />
              </View>
              <Text style={styles.title}>Admin Dashboard</Text>
              <Text style={styles.subtitle}>
                Freedom21 Analytics & Insights
              </Text>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw 
                  size={16} 
                  color="#00D4AA" 
                  style={refreshing ? styles.spinning : undefined}
                />
                <Text style={styles.refreshText}>
                  {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>

          {loading && !analyticsData ? (
            <AnimatedCard delay={100}>
              <View style={styles.loadingContainer}>
                <RefreshCw size={32} color="#00D4AA" style={styles.spinning} />
                <Text style={styles.loadingText}>Loading analytics data...</Text>
              </View>
            </AnimatedCard>
          ) : analyticsData ? (
            <>
              {/* Key Metrics */}
              <AnimatedCard delay={100}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📊 Platform Overview</Text>
                  <View style={styles.metricsGrid}>
                    <MetricCard
                      icon={<Users size={24} color="#00D4AA" />}
                      title="Total Users"
                      value={analyticsData.totalUsers.toLocaleString()}
                      subtitle="Registered accounts"
                      color="#00D4AA"
                      trend={{ value: 12.5, isPositive: true }}
                    />
                    <MetricCard
                      icon={<Zap size={24} color="#FB923C" />}
                      title="Total Scenarios"
                      value={analyticsData.totalScenarios.toLocaleString()}
                      subtitle="Investment strategies"
                      color="#FB923C"
                      trend={{ value: 8.3, isPositive: true }}
                    />
                    <MetricCard
                      icon={<DollarSign size={24} color="#F59E0B" />}
                      title="Avg Investment"
                      value={formatCurrency(analyticsData.averageInvestmentAmount)}
                      subtitle="Monthly amount"
                      color="#F59E0B"
                      trend={{ value: 5.7, isPositive: true }}
                    />
                    <MetricCard
                      icon={<Clock size={24} color="#8B5CF6" />}
                      title="Avg Time Horizon"
                      value={`${analyticsData.averageTimeHorizon.toFixed(1)} years`}
                      subtitle="Investment period"
                      color="#8B5CF6"
                      trend={{ value: 2.1, isPositive: false }}
                    />
                  </View>
                </View>
              </AnimatedCard>

              {/* User Engagement */}
              <AnimatedCard delay={200}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>👥 User Engagement</Text>
                  <View style={styles.engagementGrid}>
                    <MetricCard
                      icon={<Activity size={20} color="#00D4AA" />}
                      title="Daily Active"
                      value={analyticsData.userEngagement.dailyActiveUsers}
                      subtitle="Last 24 hours"
                      color="#00D4AA"
                    />
                    <MetricCard
                      icon={<TrendingUp size={20} color="#FB923C" />}
                      title="Weekly Active"
                      value={analyticsData.userEngagement.weeklyActiveUsers}
                      subtitle="Last 7 days"
                      color="#FB923C"
                    />
                    <MetricCard
                      icon={<Target size={20} color="#F59E0B" />}
                      title="Monthly Active"
                      value={analyticsData.userEngagement.monthlyActiveUsers}
                      subtitle="Last 30 days"
                      color="#F59E0B"
                    />
                  </View>
                </View>
              </AnimatedCard>

              {/* Platform Distribution */}
              <AnimatedCard delay={250}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📱 Platform Distribution</Text>
                  <View style={styles.platformGrid}>
                    <MetricCard
                      icon={<Globe size={20} color="#00D4AA" />}
                      title="Web Users"
                      value="85%"
                      subtitle="Desktop & Mobile Web"
                      color="#00D4AA"
                    />
                    <MetricCard
                      icon={<Smartphone size={20} color="#FB923C" />}
                      title="Mobile App"
                      value="12%"
                      subtitle="iOS & Android"
                      color="#FB923C"
                    />
                    <MetricCard
                      icon={<Monitor size={20} color="#F59E0B" />}
                      title="Desktop App"
                      value="3%"
                      subtitle="Electron builds"
                      color="#F59E0B"
                    />
                  </View>
                </View>
              </AnimatedCard>

              {/* Popular Assets */}
              <AnimatedCard delay={300}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>🚀 Popular Investment Assets</Text>
                  <GlassCard style={styles.popularAssetsCard}>
                    {analyticsData.popularAssets.length > 0 ? (
                      <View style={styles.assetsList}>
                        {analyticsData.popularAssets.slice(0, 8).map((asset, index) => (
                          <PopularAssetCard
                            key={asset.asset}
                            asset={asset.asset}
                            count={asset.count}
                            rank={index + 1}
                          />
                        ))}
                      </View>
                    ) : (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No asset data available yet</Text>
                      </View>
                    )}
                  </GlassCard>
                </View>
              </AnimatedCard>

              {/* Advanced Analytics */}
              <AnimatedCard delay={350}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>📈 Advanced Analytics</Text>
                  <View style={styles.advancedGrid}>
                    <GlassCard style={styles.advancedCard}>
                      <View style={styles.advancedHeader}>
                        <BarChart3 size={24} color="#00D4AA" />
                        <Text style={styles.advancedTitle}>Calculation Frequency</Text>
                      </View>
                      <Text style={styles.advancedValue}>2,847</Text>
                      <Text style={styles.advancedSubtitle}>Calculations today</Text>
                      <View style={styles.advancedTrend}>
                        <TrendingUp size={16} color="#00D4AA" />
                        <Text style={styles.advancedTrendText}>+23% vs yesterday</Text>
                      </View>
                    </GlassCard>

                    <GlassCard style={styles.advancedCard}>
                      <View style={styles.advancedHeader}>
                        <Target size={24} color="#FB923C" />
                        <Text style={styles.advancedTitle}>Scenario Saves</Text>
                      </View>
                      <Text style={styles.advancedValue}>156</Text>
                      <Text style={styles.advancedSubtitle}>Scenarios saved today</Text>
                      <View style={styles.advancedTrend}>
                        <TrendingUp size={16} color="#FB923C" />
                        <Text style={styles.advancedTrendText}>+18% vs yesterday</Text>
                      </View>
                    </GlassCard>

                    <GlassCard style={styles.advancedCard}>
                      <View style={styles.advancedHeader}>
                        <Activity size={24} color="#F59E0B" />
                        <Text style={styles.advancedTitle}>Session Duration</Text>
                      </View>
                      <Text style={styles.advancedValue}>7.2m</Text>
                      <Text style={styles.advancedSubtitle}>Average session</Text>
                      <View style={styles.advancedTrend}>
                        <TrendingUp size={16} color="#F59E0B" />
                        <Text style={styles.advancedTrendText}>+12% vs last week</Text>
                      </View>
                    </GlassCard>

                    <GlassCard style={styles.advancedCard}>
                      <View style={styles.advancedHeader}>
                        <Zap size={24} color="#8B5CF6" />
                        <Text style={styles.advancedTitle}>Feature Usage</Text>
                      </View>
                      <Text style={styles.advancedValue}>94%</Text>
                      <Text style={styles.advancedSubtitle}>Calculator usage</Text>
                      <View style={styles.advancedTrend}>
                        <TrendingUp size={16} color="#8B5CF6" />
                        <Text style={styles.advancedTrendText}>Charts: 67%</Text>
                      </View>
                    </GlassCard>
                  </View>
                </View>
              </AnimatedCard>

              {/* Business Insights */}
              <AnimatedCard delay={400}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>💡 Business Insights</Text>
                  <GlassCard style={styles.insightsCard}>
                    <View style={styles.insightsList}>
                      <View style={styles.insightItem}>
                        <Text style={styles.insightTitle}>🎯 User Behavior</Text>
                        <Text style={styles.insightText}>
                          Users spend an average of 7.2 minutes per session, with 94% using the calculator and 67% viewing charts. This indicates strong engagement with core features.
                        </Text>
                      </View>

                      <View style={styles.insightItem}>
                        <Text style={styles.insightTitle}>💰 Investment Patterns</Text>
                        <Text style={styles.insightText}>
                          Average monthly investment of {formatCurrency(analyticsData.averageInvestmentAmount)} shows serious user commitment. Bitcoin remains the most popular asset choice.
                        </Text>
                      </View>

                      <View style={styles.insightItem}>
                        <Text style={styles.insightTitle}>📊 Growth Opportunities</Text>
                        <Text style={styles.insightText}>
                          {analyticsData.userEngagement.dailyActiveUsers} daily active users with strong retention. Consider adding more advanced features for power users.
                        </Text>
                      </View>

                      <View style={styles.insightItem}>
                        <Text style={styles.insightTitle}>🚀 Platform Performance</Text>
                        <Text style={styles.insightText}>
                          Web platform dominates with 85% usage. Mobile app adoption at 12% presents growth opportunity for native features.
                        </Text>
                      </View>
                    </View>
                  </GlassCard>
                </View>
              </AnimatedCard>

              {/* System Health */}
              <AnimatedCard delay={450}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>⚡ System Health</Text>
                  <View style={styles.healthGrid}>
                    <View style={styles.healthItem}>
                      <View style={[styles.healthIndicator, { backgroundColor: '#00D4AA' }]} />
                      <Text style={styles.healthLabel}>API Response Time</Text>
                      <Text style={styles.healthValue}>127ms</Text>
                    </View>
                    <View style={styles.healthItem}>
                      <View style={[styles.healthIndicator, { backgroundColor: '#00D4AA' }]} />
                      <Text style={styles.healthLabel}>Uptime</Text>
                      <Text style={styles.healthValue}>99.9%</Text>
                    </View>
                    <View style={styles.healthItem}>
                      <View style={[styles.healthIndicator, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.healthLabel}>Error Rate</Text>
                      <Text style={styles.healthValue}>0.02%</Text>
                    </View>
                    <View style={styles.healthItem}>
                      <View style={[styles.healthIndicator, { backgroundColor: '#00D4AA' }]} />
                      <Text style={styles.healthLabel}>Cache Hit Rate</Text>
                      <Text style={styles.healthValue}>94.3%</Text>
                    </View>
                  </View>
                </View>
              </AnimatedCard>
            </>
          ) : (
            <AnimatedCard delay={100}>
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Failed to load analytics data</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadAnalyticsData}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            </AnimatedCard>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  gradient: {
    flex: 1,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loginCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  loginTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    textAlign: 'center',
  },
  loginForm: {
    marginBottom: 24,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  adminInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  loginFooter: {
    alignItems: 'center',
  },
  loginFooterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.2)',
    gap: 8,
  },
  refreshText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
  },
  spinning: {
    // Add rotation animation if needed
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginTop: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  engagementGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  platformGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: width < 768 ? '47%' : '23%',
    paddingVertical: 20,
    alignItems: 'center',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  metricTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 8,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  popularAssetsCard: {
    paddingVertical: 20,
  },
  assetsList: {
    gap: 12,
  },
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  assetRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  assetRankText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  assetInfo: {
    flex: 1,
    marginRight: 12,
  },
  assetName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  assetCount: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  assetBar: {
    width: 80,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  assetBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  advancedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  advancedCard: {
    flex: 1,
    minWidth: width < 768 ? '47%' : '23%',
    paddingVertical: 20,
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  advancedTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  advancedValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  advancedSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 8,
  },
  advancedTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  advancedTrendText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
  },
  insightsCard: {
    paddingVertical: 20,
  },
  insightsList: {
    gap: 20,
  },
  insightItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  insightTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    lineHeight: 20,
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  healthItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  healthIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  healthLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 4,
  },
  healthValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  retryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
});