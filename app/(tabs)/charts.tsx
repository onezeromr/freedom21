import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import GlassCard from '@/components/GlassCard';
import ModernChart from '@/components/ModernChart';
import CompoundInterestChart from '@/components/CompoundInterestChart';
import { usePortfolioSync } from '@/hooks/usePortfolioSync';

const { width } = Dimensions.get('window');

export default function ChartsScreen() {
  const { portfolioState } = usePortfolioSync();
  const [selectedTimeframe, setSelectedTimeframe] = useState('20Y');
  const [chartData, setChartData] = useState<any[]>([]);
  const mounted = useRef(true);

  const timeframes = ['10Y', '20Y', '30Y', '40Y'];

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (portfolioState) {
      setSelectedTimeframe(`${portfolioState.years}Y`);
    }
  }, [portfolioState]);

  useEffect(() => {
    if (mounted.current && portfolioState) {
      generateChartData();
    }
  }, [selectedTimeframe, portfolioState]);

  // Get the effective growth rate for a given year
  const getEffectiveGrowthRate = (year: number, baseRate: number): number => {
    if (!portfolioState) return baseRate;
    
    let rate = baseRate;
    
    if (portfolioState.useRealisticCAGR) {
      rate = rate * 0.6;
    }
    
    if (portfolioState.useDecliningRates) {
      if (year <= 10) {
        rate = portfolioState.phase1Rate;
      } else if (year <= 20) {
        rate = portfolioState.phase2Rate;
      } else {
        rate = portfolioState.phase3Rate;
      }
      
      if (portfolioState.useRealisticCAGR) {
        rate = rate * 0.6;
      }
    }
    
    if (portfolioState.useInflationAdjustment) {
      rate = rate - portfolioState.inflationRate;
    }
    
    return Math.max(0, rate);
  };

  // Calculate year-by-year progression for complex strategies with starting amount
  const calculateYearByYearProgression = (
    startingAmount: number,
    monthlyAmount: number,
    baseGrowthRate: number,
    targetYear: number,
    pauseAfterYears: number | null,
    boostAfterYears: number | null,
    boostAmount: number
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

  const generateChartData = () => {
    if (!mounted.current || !portfolioState) return;
    
    const years = parseInt(selectedTimeframe);
    const { startingAmount, monthlyAmount, customCAGR, btcHurdleRate, pauseAfterYears, boostAfterYears, boostAmount } = portfolioState;
    
    const data = [];
    const dataPoints = Math.min(10, Math.max(5, Math.floor(years / 2)));
    const stepSize = Math.max(1, Math.floor(years / dataPoints));

    // Always start with year 0 showing starting amount
    data.push({
      year: '0',
      asset: startingAmount,
      bitcoin: startingAmount,
    });

    for (let year = stepSize; year <= years; year += stepSize) {
      // Calculate asset value with user's strategy and selected asset CAGR
      const assetValue = calculateYearByYearProgression(
        startingAmount,
        monthlyAmount,
        customCAGR,
        year,
        pauseAfterYears,
        boostAfterYears,
        boostAmount
      );

      // Calculate Bitcoin benchmark with SAME strategy but Bitcoin CAGR
      const bitcoinValue = calculateYearByYearProgression(
        startingAmount,
        monthlyAmount,
        btcHurdleRate,
        year,
        pauseAfterYears,
        boostAfterYears,
        boostAmount
      );

      data.push({
        year: year.toString(),
        asset: assetValue,
        bitcoin: bitcoinValue,
      });
    }

    // Ensure final year is included if not already
    if (data[data.length - 1].year !== years.toString()) {
      const assetValue = calculateYearByYearProgression(
        startingAmount,
        monthlyAmount,
        customCAGR,
        years,
        pauseAfterYears,
        boostAfterYears,
        boostAmount
      );

      const bitcoinValue = calculateYearByYearProgression(
        startingAmount,
        monthlyAmount,
        btcHurdleRate,
        years,
        pauseAfterYears,
        boostAfterYears,
        boostAmount
      );

      data.push({
        year: years.toString(),
        asset: assetValue,
        bitcoin: bitcoinValue,
      });
    }

    if (mounted.current) {
      setChartData(data);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const TimeframeButton = ({ timeframe, isSelected, onPress }: any) => (
    <TouchableOpacity
      style={[
        styles.timeframeButton,
        isSelected && styles.timeframeButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.timeframeText,
          isSelected && styles.timeframeTextActive,
        ]}
      >
        {timeframe}
      </Text>
    </TouchableOpacity>
  );

  const getStrategyText = () => {
    if (!portfolioState) return 'Standard DCA';
    
    const strategies = [];
    
    if (portfolioState.useRealisticCAGR) {
      strategies.push('Conservative CAGR');
    }
    
    if (portfolioState.useDecliningRates) {
      strategies.push(`Declining Rates (${portfolioState.phase1Rate}%→${portfolioState.phase2Rate}%→${portfolioState.phase3Rate}%)`);
    }
    
    if (portfolioState.useInflationAdjustment) {
      strategies.push(`Inflation Adjusted (-${portfolioState.inflationRate}%)`);
    }
    
    if (portfolioState.pauseAfterYears) {
      strategies.push(`Pause after ${portfolioState.pauseAfterYears}Y`);
    } else if (portfolioState.boostAfterYears) {
      strategies.push(`Boost after ${portfolioState.boostAfterYears}Y to ${formatCurrency(portfolioState.boostAmount)}`);
    }
    
    return strategies.length > 0 ? strategies.join(' • ') : 'Standard DCA';
  };

  const getEffectiveCAGR = () => {
    if (!portfolioState) return '30%';
    
    if (portfolioState.useDecliningRates) {
      return `${portfolioState.phase1Rate}%→${portfolioState.phase2Rate}%→${portfolioState.phase3Rate}%`;
    }
    
    let rate = portfolioState.customCAGR;
    if (portfolioState.useRealisticCAGR) {
      rate = rate * 0.6;
    }
    if (portfolioState.useInflationAdjustment) {
      rate = rate - portfolioState.inflationRate;
    }
    
    return `${rate.toFixed(1)}%`;
  };

  if (!portfolioState) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0A0E1A', '#1E293B', '#0F172A']}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading portfolio data...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const finalAssetValue = chartData[chartData.length - 1]?.asset || 0;
  const finalBitcoinValue = chartData[chartData.length - 1]?.bitcoin || 0;
  const outperformance = finalAssetValue - finalBitcoinValue;

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
                <TrendingUp size={32} color="#00D4AA" strokeWidth={2} />
              </View>
              <Text style={styles.title}>Investment Growth</Text>
              <Text style={styles.subtitle}>
                {portfolioState.selectedAsset} vs Bitcoin Hurdle Rate Benchmark
              </Text>
              <Text style={styles.configText}>
                {portfolioState.startingAmount > 0 && `${formatCurrency(portfolioState.startingAmount)} start + `}
                ${portfolioState.monthlyAmount}/mo • {getEffectiveCAGR()} growth • {getStrategyText()}
              </Text>
              <Text style={styles.benchmarkNote}>
                📊 Bitcoin benchmark uses same strategy with {portfolioState.btcHurdleRate}% CAGR
              </Text>
            </View>
          </AnimatedCard>

          {/* Compound Interest Chart */}
          <AnimatedCard delay={100}>
            <CompoundInterestChart
              startingAmount={portfolioState.startingAmount}
              monthlyAmount={portfolioState.monthlyAmount}
              annualRate={portfolioState.useDecliningRates ? portfolioState.phase1Rate : portfolioState.customCAGR}
              years={parseInt(selectedTimeframe)}
              assetName={portfolioState.selectedAsset}
              pauseAfterYears={portfolioState.pauseAfterYears}
              boostAfterYears={portfolioState.boostAfterYears}
              boostAmount={portfolioState.boostAmount}
            />
          </AnimatedCard>

          {/* Timeframe Selector */}
          <AnimatedCard delay={200}>
            <View style={styles.timeframeContainer}>
              <View style={styles.timeframeSelector}>
                {timeframes.map((timeframe) => (
                  <TimeframeButton
                    key={timeframe}
                    timeframe={timeframe}
                    isSelected={selectedTimeframe === timeframe}
                    onPress={() => mounted.current && setSelectedTimeframe(timeframe)}
                  />
                ))}
              </View>
            </View>
          </AnimatedCard>

          {/* Portfolio Comparison Chart */}
          <AnimatedCard delay={300}>
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Portfolio Value Comparison</Text>
              <ModernChart
                data={chartData}
                assetName={portfolioState.selectedAsset}
                assetColor="#00D4AA"
                bitcoinColor="#F59E0B"
              />
            </View>
          </AnimatedCard>

          {/* Performance Metrics */}
          <AnimatedCard delay={400}>
            <View style={styles.metricsContainer}>
              <Text style={styles.metricsTitle}>Performance Summary</Text>
              
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <View style={[styles.metricIndicator, { backgroundColor: '#00D4AA' }]} />
                    <Text style={styles.metricLabel}>{portfolioState.selectedAsset}</Text>
                  </View>
                  <Text style={styles.metricValue}>
                    {formatCurrency(finalAssetValue)}
                  </Text>
                  <Text style={styles.metricSubtext}>Final Value</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={styles.metricHeader}>
                    <View style={[styles.metricIndicator, { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.metricLabel}>Bitcoin</Text>
                  </View>
                  <Text style={styles.metricValue}>
                    {formatCurrency(finalBitcoinValue)}
                  </Text>
                  <Text style={styles.metricSubtext}>Benchmark</Text>
                </View>
              </View>

              <View style={styles.outperformanceCard}>
                <View style={styles.outperformanceHeader}>
                  <DollarSign size={20} color={outperformance >= 0 ? '#00D4AA' : '#EF4444'} />
                  <Text style={styles.outperformanceLabel}>Outperformance</Text>
                </View>
                <Text style={[
                  styles.outperformanceValue,
                  { color: outperformance >= 0 ? '#00D4AA' : '#EF4444' }
                ]}>
                  {outperformance >= 0 ? '+' : ''}{formatCurrency(outperformance)}
                </Text>
                <Text style={styles.outperformanceSubtext}>
                  {outperformance >= 0 ? 'Above' : 'Below'} Bitcoin Hurdle Rate Benchmark
                </Text>
              </View>
            </View>
          </AnimatedCard>

          {/* Consolidated Insights */}
          <AnimatedCard delay={500}>
            <View style={styles.insightsContainer}>
              <Text style={styles.insightsTitle}>💡 Compound Interest Insights</Text>
              <View style={styles.insightsList}>
                {portfolioState.startingAmount > 0 && (
                  <Text style={styles.insightText}>
                    💰 Starting with {formatCurrency(portfolioState.startingAmount)} gives your money more time to compound and grow
                  </Text>
                )}
                <Text style={styles.insightText}>
                  📊 Simple Interest (orange layer) = steady, predictable growth where you earn the same amount each year
                </Text>
                <Text style={styles.insightText}>
                  🚀 Compound Interest (green layer) = exponential growth where your gains earn gains - this is the magic!
                </Text>
                <Text style={styles.insightText}>
                  💡 {portfolioState.pauseAfterYears ? 'Pausing contributions allows compound growth to work its magic' : portfolioState.boostAfterYears ? 'Boosting contributions later accelerates wealth building significantly' : 'Monthly dollar-cost averaging helps smooth market volatility'}
                </Text>
                {portfolioState.useRealisticCAGR && (
                  <Text style={styles.insightText}>
                    🎯 Conservative CAGR (60% of optimistic) provides more realistic projections for planning
                  </Text>
                )}
                {portfolioState.useDecliningRates && (
                  <Text style={styles.insightText}>
                    📉 Declining growth rates reflect how high-growth assets typically mature over time
                  </Text>
                )}
                {portfolioState.useInflationAdjustment && (
                  <Text style={styles.insightText}>
                    💸 Inflation adjustment shows real purchasing power growth, not just nominal returns
                  </Text>
                )}
                <Text style={styles.insightText}>
                  📈 Compounding effects accelerate significantly over time - notice how the curve gets steeper
                </Text>
                <Text style={styles.insightText}>
                  ⏰ Time in the market beats timing the market - the compound interest layer shows this beautifully
                </Text>
                <Text style={styles.insightText}>
                  🎯 In later years, your gains dwarf your contributions - that's the magic!
                </Text>
                <Text style={styles.insightText}>
                  🎯 Small differences in growth rates create massive wealth gaps over decades
                </Text>
                <Text style={styles.insightText}>
                  ⚖️ Bitcoin hurdle rate benchmark uses your exact same strategy for fair comparison
                </Text>
              </View>
            </View>
          </AnimatedCard>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
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
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
    marginBottom: 4,
    textAlign: 'center',
  },
  configText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 4,
  },
  benchmarkNote: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  timeframeContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeframeButtonActive: {
    backgroundColor: '#00D4AA',
  },
  timeframeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
  },
  timeframeTextActive: {
    color: '#FFFFFF',
  },
  chartContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chartTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  metricsContainer: {
    marginBottom: 24,
  },
  metricsTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  metricLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  metricValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  outperformanceCard: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  outperformanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  outperformanceLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  outperformanceValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  outperformanceSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  insightsContainer: {
    paddingVertical: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  insightsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  insightsList: {
    gap: 12,
  },
  insightText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    lineHeight: 22,
  },
});