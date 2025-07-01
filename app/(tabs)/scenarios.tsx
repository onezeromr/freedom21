import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, Share2, TrendingUp, TrendingDown, Calendar, User, Sparkles } from 'lucide-react-native';

interface Scenario {
  id: string;
  name: string;
  startingAmount: number;
  monthlyAmount: number;
  years: number;
  currentAge?: number | null;
  btcHurdleRate: number;
  asset: string;
  cagr: number;
  pauseAfterYears?: number | null;
  boostAfterYears?: number | null;
  boostAmount?: number;
  futureValue: number;
  btcHurdleValue: number;
  outperformance: number;
  targetYear: number;
  futureAge?: number | null;
  createdAt: string;
}

export default function ScenariosScreen() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = () => {
    if (Platform.OS === 'web') {
      const savedScenarios = localStorage.getItem('freedom21_scenarios');
      if (savedScenarios) {
        try {
          const parsedScenarios = JSON.parse(savedScenarios);
          setScenarios(parsedScenarios);
        } catch (error) {
          console.error('Error parsing scenarios:', error);
          setScenarios([]);
        }
      }
    }
  };

  const deleteScenario = (id: string) => {
    Alert.alert(
      'Delete Scenario',
      'Are you sure you want to delete this scenario?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedScenarios = scenarios.filter(scenario => scenario.id !== id);
            setScenarios(updatedScenarios);
            if (Platform.OS === 'web') {
              localStorage.setItem('freedom21_scenarios', JSON.stringify(updatedScenarios));
            }
          },
        },
      ]
    );
  };

  const shareScenario = async (scenario: Scenario) => {
    const ageText = scenario.futureAge ? ` (Age ${scenario.futureAge} in ${scenario.targetYear})` : ` (Year ${scenario.targetYear})`;
    const startingText = scenario.startingAmount > 0 ? `\n💰 Starting: $${scenario.startingAmount.toLocaleString()}` : '';
    const strategyText = scenario.pauseAfterYears 
      ? `\n🎯 Strategy: Pause after ${scenario.pauseAfterYears} years`
      : scenario.boostAfterYears 
      ? `\n🎯 Strategy: Boost to $${scenario.boostAmount?.toLocaleString()}/mo after ${scenario.boostAfterYears} years`
      : '\n🎯 Strategy: Standard DCA';
    
    const message = `Freedom21 Wealth Projection:\n\n📊 ${scenario.name}${startingText}\n💰 Monthly: $${scenario.monthlyAmount.toLocaleString()}\n📅 Duration: ${scenario.years} years\n📈 Asset: ${scenario.asset} (${scenario.cagr}% CAGR)\n₿ BTC Hurdle: ${scenario.btcHurdleRate}% CAGR${strategyText}\n\n🎯 Projected Value: $${scenario.futureValue.toLocaleString()}${ageText}\n₿ BTC Hurdle: $${scenario.btcHurdleValue.toLocaleString()}\n📊 Outperformance: ${scenario.outperformance >= 0 ? '+' : ''}$${scenario.outperformance.toLocaleString()}\n\n💡 Calculate your own wealth projections at: ${window.location.origin}\n\n*Historical performance doesn't guarantee future results`;

    if (Platform.OS === 'web') {
      try {
        if (navigator.share) {
          await navigator.share({
            title: `Freedom21 Investment Scenario: ${scenario.name}`,
            text: message,
            url: window.location.origin,
          });
        } else {
          // Fallback to clipboard
          await navigator.clipboard.writeText(message);
          Alert.alert('Success', 'Scenario details copied to clipboard!');
        }
      } catch (error) {
        // If share fails, try clipboard as fallback
        try {
          await navigator.clipboard.writeText(message);
          Alert.alert('Success', 'Scenario details copied to clipboard!');
        } catch (clipboardError) {
          Alert.alert('Error', 'Unable to share or copy scenario details');
        }
      }
    } else {
      Alert.alert('Share', 'Sharing feature not available on this platform');
    }
  };

  const clearAllScenarios = () => {
    Alert.alert(
      'Clear All Scenarios',
      'Are you sure you want to delete all saved scenarios?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setScenarios([]);
            if (Platform.OS === 'web') {
              localStorage.removeItem('freedom21_scenarios');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStrategyText = (scenario: Scenario) => {
    if (scenario.pauseAfterYears) {
      return `Pause after ${scenario.pauseAfterYears}Y`;
    } else if (scenario.boostAfterYears) {
      return `Boost after ${scenario.boostAfterYears}Y to ${formatCurrency(scenario.boostAmount || 0)}`;
    }
    return 'Standard DCA';
  };

  const renderScenario = (scenario: Scenario) => (
    <View key={scenario.id} style={styles.scenarioCard}>
      <View style={styles.scenarioHeader}>
        <View style={styles.scenarioInfo}>
          <Text style={styles.scenarioName}>{scenario.name}</Text>
          <Text style={styles.scenarioDetails}>
            {scenario.startingAmount > 0 && `${formatCurrency(scenario.startingAmount)} start + `}
            ${scenario.monthlyAmount}/mo • {scenario.years}Y • {scenario.asset} ({scenario.cagr}%)
          </Text>
          <Text style={styles.scenarioMeta}>
            {getStrategyText(scenario)} • BTC Hurdle: {scenario.btcHurdleRate}%
          </Text>
          {(scenario.targetYear || scenario.futureAge) && (
            <View style={styles.futureInfoContainer}>
              <View style={styles.futureInfoRow}>
                <Calendar size={14} color="#64748B" />
                <Text style={styles.futureInfoText}>Year {scenario.targetYear}</Text>
              </View>
              {scenario.futureAge && (
                <View style={styles.futureInfoRow}>
                  <User size={14} color="#64748B" />
                  <Text style={styles.futureInfoText}>Age {scenario.futureAge}</Text>
                </View>
              )}
            </View>
          )}
        </View>
        <View style={styles.scenarioActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => shareScenario(scenario)}
            activeOpacity={0.7}
          >
            <Share2 size={20} color="#00D4AA" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteScenario(scenario.id)}
            activeOpacity={0.7}
          >
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.scenarioMetrics}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Future Value</Text>
          <Text style={styles.metricValue}>{formatCurrency(scenario.futureValue)}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>BTC Hurdle ({scenario.btcHurdleRate}%)</Text>
          <Text style={styles.metricValueSecondary}>{formatCurrency(scenario.btcHurdleValue)}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Outperformance</Text>
          <View style={styles.performanceContainer}>
            {scenario.outperformance >= 0 ? (
              <TrendingUp size={16} color="#00D4AA" />
            ) : (
              <TrendingDown size={16} color="#EF4444" />
            )}
            <Text
              style={[
                styles.performanceValue,
                { color: scenario.outperformance >= 0 ? '#00D4AA' : '#EF4444' }
              ]}
            >
              {scenario.outperformance >= 0 ? '+' : ''}{formatCurrency(scenario.outperformance)}
            </Text>
          </View>
        </View>
      </View>

      {/* Performance Indicator */}
      <View style={styles.performanceBar}>
        <View
          style={[
            styles.performanceBarFill,
            {
              backgroundColor: scenario.outperformance >= 0 ? '#00D4AA' : '#EF4444',
              width: `${Math.min(100, Math.abs(scenario.outperformance / scenario.btcHurdleValue) * 100)}%`,
            },
          ]}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0A0E1A', '#1E293B', '#0F172A']}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Sparkles size={32} color="#8B5CF6" strokeWidth={2} />
            </View>
            <Text style={styles.title}>Saved Scenarios</Text>
            <Text style={styles.subtitle}>Compare your investment strategies</Text>
            <Text style={styles.methodNote}>All scenarios use Monthly Dollar Cost Averaging</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <View style={styles.instructionCard}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.1)', 'rgba(124, 58, 237, 0.05)']}
                style={styles.instructionGradient}
              >
                <Plus size={24} color="#8B5CF6" />
                <Text style={styles.instructionText}>Save scenarios from Calculator tab to compare strategies</Text>
              </LinearGradient>
            </View>

            {scenarios.length > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={clearAllScenarios} activeOpacity={0.7}>
                <Text style={styles.clearButtonText}>Clear All Scenarios</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Scenarios List */}
          <View style={styles.scenariosContainer}>
            {scenarios.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Sparkles size={48} color="#64748B" />
                </View>
                <Text style={styles.emptyStateTitle}>No scenarios saved yet</Text>
                <Text style={styles.emptyStateText}>
                  Create your first scenario from the Calculator tab to start comparing investment strategies and see which approach works best for your goals.
                </Text>
              </View>
            ) : (
              scenarios.map(renderScenario)
            )}
          </View>

          {/* Summary Stats */}
          {scenarios.length > 0 && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Portfolio Summary</Text>
              
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Scenarios</Text>
                  <Text style={styles.summaryValue}>{scenarios.length}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Best Performer</Text>
                  <Text style={styles.summaryValue}>
                    {scenarios.reduce((prev, current) => 
                      (prev.outperformance > current.outperformance) ? prev : current
                    ).asset}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Avg. Monthly Investment</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(scenarios.reduce((sum, s) => sum + s.monthlyAmount, 0) / scenarios.length)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Future Value</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(scenarios.reduce((sum, s) => sum + s.futureValue, 0))}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
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
    marginBottom: 4,
  },
  methodNote: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    fontStyle: 'italic',
  },
  actionButtonsContainer: {
    marginBottom: 24,
  },
  instructionCard: {
    marginBottom: 16,
  },
  instructionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  instructionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    marginLeft: 12,
    textAlign: 'center',
    flex: 1,
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  clearButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  scenariosContainer: {
    marginBottom: 32,
  },
  scenarioCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  scenarioInfo: {
    flex: 1,
  },
  scenarioName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  scenarioDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 4,
  },
  scenarioMeta: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    marginBottom: 12,
  },
  futureInfoContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  futureInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  futureInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginLeft: 4,
  },
  scenarioActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scenarioMetrics: {
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  metricValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  metricValueSecondary: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
  },
  performanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginLeft: 6,
  },
  performanceBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  performanceBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
  summaryContainer: {
    marginBottom: 32,
  },
  summaryTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});