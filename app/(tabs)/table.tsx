import React, { useState, useEffect } from 'react';
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
import { Table, Calendar, DollarSign, TrendingUp, Plus, Trash2, User, LogIn } from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import GlassCard from '@/components/GlassCard';
import { usePortfolioSync } from '@/hooks/usePortfolioSync';
import { useAuth } from '@/hooks/useAuth';

const { width: screenWidth } = Dimensions.get('window');

interface YearlyData {
  year: number;
  age: number | null;
  contributions: number;
  assetValue: number;
  btcHurdleValue: number;
  assetGains: number;
  outperformance: number;
}

export default function TableScreen() {
  const { user } = useAuth();
  const { 
    portfolioState, 
    portfolioEntries, 
    savePortfolioEntry, 
    deletePortfolioEntry 
  } = usePortfolioSync();
  
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  const [currentPortfolioValue, setCurrentPortfolioValue] = useState('');

  const isMobile = screenWidth < 768;

  useEffect(() => {
    if (portfolioState) {
      generateYearlyData();
    }
  }, [portfolioState]);

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
  ): { value: number; contributions: number } => {
    let totalValue = startingAmount;
    let totalContributions = startingAmount;

    for (let year = 1; year <= targetYear; year++) {
      const rate = getEffectiveGrowthRate(year, baseGrowthRate) / 100;
      
      let monthlyContrib = monthlyAmount;
      
      if (pauseAfterYears && year > pauseAfterYears) {
        monthlyContrib = 0;
      } else if (boostAfterYears && year > boostAfterYears) {
        monthlyContrib = boostAmount;
      }

      const yearlyContrib = monthlyContrib * 12;
      totalContributions += yearlyContrib;
      totalValue = totalValue * (1 + rate) + yearlyContrib;
    }

    return {
      value: Math.max(0, Math.round(totalValue)),
      contributions: Math.round(totalContributions)
    };
  };

  const generateYearlyData = () => {
    if (!portfolioState) return;
    
    const { startingAmount, monthlyAmount, years, currentAge, customCAGR, btcHurdleRate, pauseAfterYears, boostAfterYears, boostAmount } = portfolioState;
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    const dayOfYear = Math.floor((currentDate.getTime() - new Date(currentYear, 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const progressThroughYear = dayOfYear / 365;
    
    const data: YearlyData[] = [];

    for (let year = 0; year <= years; year++) {
      const targetYear = currentYear + year;
      let yearProgress = 1; // Full year by default
      
      // For current year (year 0), pro-rate based on current date
      if (year === 0) {
        yearProgress = progressThroughYear;
      }

      // Calculate asset value with user's strategy and selected asset CAGR
      const assetResult = calculateYearByYearProgression(
        startingAmount,
        monthlyAmount,
        customCAGR,
        year === 0 ? progressThroughYear : year,
        pauseAfterYears,
        boostAfterYears,
        boostAmount
      );

      // Calculate Bitcoin benchmark with SAME strategy but Bitcoin CAGR
      const btcResult = calculateYearByYearProgression(
        startingAmount,
        monthlyAmount,
        btcHurdleRate,
        year === 0 ? progressThroughYear : year,
        pauseAfterYears,
        boostAfterYears,
        boostAmount
      );
      
      const assetGains = assetResult.value - assetResult.contributions;
      const outperformance = assetResult.value - btcResult.value;

      data.push({
        year: targetYear,
        age: currentAge ? currentAge + year : null,
        contributions: assetResult.contributions,
        assetValue: assetResult.value,
        btcHurdleValue: btcResult.value,
        assetGains: Math.round(assetGains),
        outperformance: Math.round(outperformance),
      });
    }

    setYearlyData(data);
  };

  const handleSaveEntry = async () => {
    if (!currentPortfolioValue.trim()) {
      Alert.alert('Error', 'Please enter a portfolio value');
      return;
    }

    const amount = parseFloat(currentPortfolioValue.replace(/[^0-9.]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid portfolio value');
      return;
    }

    // Get current year target from yearly data
    const currentYear = new Date().getFullYear();
    const currentYearData = yearlyData.find(d => d.year === currentYear);
    const target = currentYearData ? currentYearData.assetValue : 0;

    const result = await savePortfolioEntry(amount, target);
    if (result) {
      setCurrentPortfolioValue('');
      Alert.alert('Success', 'Portfolio entry saved successfully!');
    } else {
      Alert.alert('Error', 'Failed to save portfolio entry. Please try again.');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this portfolio entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePortfolioEntry(id),
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

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return formatCurrency(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short',
      day: 'numeric'
    });
  };

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

  const getCurrentYearTarget = () => {
    const currentYear = new Date().getFullYear();
    const currentYearData = yearlyData.find(d => d.year === currentYear);
    return currentYearData ? currentYearData.assetValue : 0;
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
                <Table size={32} color="#00D4AA" strokeWidth={2} />
              </View>
              <Text style={styles.title}>Annual Breakdown</Text>
              <Text style={styles.subtitle}>
                {portfolioState.selectedAsset} vs Benchmark
              </Text>
              <Text style={styles.configText}>
                {portfolioState.startingAmount > 0 && `${formatCurrency(portfolioState.startingAmount)} start + `}
                ${portfolioState.monthlyAmount}/mo • {getEffectiveCAGR()} CAGR • {getStrategyText()}
              </Text>
              <Text style={styles.methodNote}>
                📊 Benchmark uses same strategy with {portfolioState.btcHurdleRate}% CAGR
              </Text>
            </View>
          </AnimatedCard>

          {/* Portfolio Tracking Section */}
          <AnimatedCard delay={100}>
            <GlassCard style={styles.portfolioTrackingCard}>
              <View style={styles.portfolioTrackingHeader}>
                <View style={styles.portfolioTrackingIcon}>
                  <DollarSign size={24} color="#00D4AA" />
                </View>
                <View style={styles.portfolioTrackingInfo}>
                  <Text style={styles.portfolioTrackingTitle}>📊 Portfolio Tracking</Text>
                  <Text style={styles.portfolioTrackingSubtitle}>
                    Track your actual portfolio value monthly and see how you're performing against your Year 1 target projection of {formatCompactCurrency(getCurrentYearTarget())}. Regular monthly updates help you stay on track with your investment goals.
                  </Text>
                </View>
              </View>

              <View style={styles.portfolioInputSection}>
                <Text style={styles.portfolioInputLabel}>Actual Portfolio Amount</Text>
                <View style={styles.portfolioInputContainer}>
                  <TextInput
                    style={styles.portfolioInput}
                    value={currentPortfolioValue}
                    onChangeText={setCurrentPortfolioValue}
                    placeholder="Enter current portfolio value"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveEntry}
                    activeOpacity={0.8}
                  >
                    <Plus size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.trackingHint}>
                  <Calendar size={16} color="#00D4AA" />
                  <Text style={styles.trackingHintText}>
                    💡 Track monthly to build a habit and see your progress over time
                  </Text>
                </View>
              </View>

              {/* Portfolio Entries Table */}
              {user ? (
                portfolioEntries.length > 0 ? (
                  <View style={styles.entriesTable}>
                    <View style={styles.tableHeader}>
                      <Text style={styles.tableHeaderCell}>Date</Text>
                      <Text style={styles.tableHeaderCell}>Portfolio Amount</Text>
                      <Text style={styles.tableHeaderCell}>Variance vs Target</Text>
                      <Text style={styles.tableHeaderCell}>Action</Text>
                    </View>
                    
                    {portfolioEntries.map((entry) => (
                      <View key={entry.id} style={styles.tableRow}>
                        <Text style={styles.tableCell}>{formatDate(entry.created_at)}</Text>
                        <Text style={styles.tableCellAmount}>{formatCurrency(entry.amount)}</Text>
                        <View style={styles.varianceCell}>
                          <Text style={[
                            styles.varianceText,
                            { color: entry.variance >= 0 ? '#00D4AA' : '#EF4444' }
                          ]}>
                            {entry.variance >= 0 ? '+' : ''}{formatCurrency(entry.variance)}
                          </Text>
                          <Text style={styles.variancePercentage}>
                            ({entry.variance_percentage >= 0 ? '+' : ''}{entry.variance_percentage.toFixed(1)}%)
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteEntry(entry.id)}
                          activeOpacity={0.7}
                        >
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noEntriesState}>
                    <Text style={styles.noEntriesText}>No portfolio entries yet</Text>
                    <Text style={styles.noEntriesSubtext}>Add your first entry above to start tracking</Text>
                  </View>
                )
              ) : (
                <View style={styles.signInPrompt}>
                  <User size={24} color="#F59E0B" />
                  <Text style={styles.signInText}>Sign in to save your portfolio entries to the cloud and sync across devices</Text>
                </View>
              )}
            </GlassCard>
          </AnimatedCard>

          {/* Summary Cards */}
          <AnimatedCard delay={200}>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <TrendingUp size={24} color="#00D4AA" style={styles.summaryIcon} />
                <Text style={styles.summaryTitle}>Final Portfolio Value</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(yearlyData[yearlyData.length - 1]?.assetValue || 0)}
                </Text>
                <Text style={styles.summarySubtext}>
                  Year {yearlyData[yearlyData.length - 1]?.year || new Date().getFullYear() + portfolioState.years}
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.summaryIconWithBitcoin}>
                  <Text style={styles.bitcoinIcon}>₿</Text>
                </View>
                <Text style={styles.summaryTitle}>vs Benchmark</Text>
                <Text style={[
                  styles.summaryValue,
                  {
                    color: (yearlyData[yearlyData.length - 1]?.outperformance || 0) >= 0 ? '#00D4AA' : '#EF4444'
                  }
                ]}>
                  {(yearlyData[yearlyData.length - 1]?.outperformance || 0) >= 0 ? '+' : ''}
                  {formatCurrency(yearlyData[yearlyData.length - 1]?.outperformance || 0)}
                </Text>
                <Text style={styles.summarySubtext}>
                  {(yearlyData[yearlyData.length - 1]?.outperformance || 0) >= 0 ? 'Outperformance' : 'Underperformance'}
                </Text>
              </View>
            </View>
          </AnimatedCard>

          {/* Year-by-Year Table */}
          <AnimatedCard delay={300}>
            <View style={styles.tableContainer}>
              <Text style={styles.tableTitle}>Year-by-Year Portfolio Growth</Text>
              <Text style={styles.tableDescription}>
                📈 Track your portfolio value growth each year (starting with {new Date().getFullYear()} pro-rated to today's date)
                {portfolioState.startingAmount > 0 && ` (starting with ${formatCurrency(portfolioState.startingAmount)})`}
              </Text>
              
              {isMobile ? (
                // Mobile Card View
                <View style={styles.mobileContainer}>
                  {yearlyData.map((data, index) => (
                    <View key={data.year} style={[styles.mobileCard, index % 2 === 0 && styles.mobileCardEven]}>
                      <View style={styles.mobileCardHeader}>
                        <View style={styles.mobileYearInfo}>
                          <Text style={styles.mobileYear}>{data.year}</Text>
                          {portfolioState.currentAge && (
                            <Text style={styles.mobileAge}>Age {data.age}</Text>
                          )}
                        </View>
                        <View style={styles.mobilePortfolioValue}>
                          <Text style={styles.mobilePortfolioLabel}>📈 Portfolio</Text>
                          <Text style={styles.mobilePortfolioAmount}>{formatCompactCurrency(data.assetValue)}</Text>
                        </View>
                      </View>

                      <View style={styles.mobileMetrics}>
                        <View style={styles.mobileMetric}>
                          <Text style={styles.mobileMetricLabel}>💰 Invested</Text>
                          <Text style={styles.mobileMetricValue}>{formatCompactCurrency(data.contributions)}</Text>
                        </View>
                        <View style={styles.mobileMetric}>
                          <View style={styles.mobileMetricLabelWithIcon}>
                            <Text style={styles.bitcoinIconSmall}>₿</Text>
                            <Text style={styles.mobileMetricLabel}>Benchmark</Text>
                          </View>
                          <Text style={styles.mobileMetricValueBtc}>{formatCompactCurrency(data.btcHurdleValue)}</Text>
                        </View>
                        <View style={styles.mobileMetric}>
                          <Text style={styles.mobileMetricLabel}>📊 Difference</Text>
                          <Text style={[
                            styles.mobileMetricValue,
                            { color: data.outperformance >= 0 ? '#00D4AA' : '#EF4444' }
                          ]}>
                            {data.outperformance >= 0 ? '+' : ''}{formatCompactCurrency(data.outperformance)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                // Desktop Table View
                <View style={styles.desktopTableContainer}>
                  <View style={styles.desktopTableHeader}>
                    <Text style={[styles.desktopHeaderCell, styles.yearColumn]}>Year</Text>
                    {portfolioState.currentAge && (
                      <Text style={[styles.desktopHeaderCell, styles.ageColumn]}>Age</Text>
                    )}
                    <Text style={[styles.desktopHeaderCell, styles.valueColumn]}>💰 Invested</Text>
                    <Text style={[styles.desktopHeaderCell, styles.valueColumn, styles.portfolioHeader]}>📈 Portfolio Value</Text>
                    <View style={[styles.desktopHeaderCell, styles.valueColumn, styles.benchmarkHeader]}>
                      <Text style={styles.bitcoinIcon}>₿</Text>
                      <Text style={styles.benchmarkHeaderText}>Benchmark</Text>
                    </View>
                    <Text style={[styles.desktopHeaderCell, styles.valueColumn]}>📊 Difference</Text>
                  </View>

                  {yearlyData.map((data, index) => (
                    <View key={data.year} style={[styles.desktopTableRow, index % 2 === 0 && styles.desktopTableRowEven]}>
                      <Text style={[styles.desktopCell, styles.yearColumn, styles.yearText]}>{data.year}</Text>
                      {portfolioState.currentAge && (
                        <Text style={[styles.desktopCell, styles.ageColumn, styles.ageText]}>{data.age}</Text>
                      )}
                      <Text style={[styles.desktopCell, styles.valueColumn, styles.contributionsText]}>
                        {formatCompactCurrency(data.contributions)}
                      </Text>
                      <Text style={[styles.desktopCell, styles.valueColumn, styles.portfolioValueText]}>
                        {formatCompactCurrency(data.assetValue)}
                      </Text>
                      <Text style={[styles.desktopCell, styles.valueColumn, styles.btcValueText]}>
                        {formatCompactCurrency(data.btcHurdleValue)}
                      </Text>
                      <Text style={[
                        styles.desktopCell, 
                        styles.valueColumn, 
                        data.outperformance >= 0 ? styles.positiveText : styles.negativeText
                      ]}>
                        {data.outperformance >= 0 ? '+' : ''}{formatCompactCurrency(data.outperformance)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
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
  methodNote: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  portfolioTrackingCard: {
    marginBottom: 24,
    paddingVertical: 24,
  },
  portfolioTrackingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  portfolioTrackingIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  portfolioTrackingInfo: {
    flex: 1,
  },
  portfolioTrackingTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  portfolioTrackingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    lineHeight: 20,
  },
  portfolioInputSection: {
    marginBottom: 20,
  },
  portfolioInputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  portfolioInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  portfolioInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D4AA',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  trackingHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  trackingHintText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#00D4AA',
    flex: 1,
    lineHeight: 18,
  },
  entriesTable: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#E2E8F0',
    textAlign: 'center',
  },
  tableCellAmount: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  varianceCell: {
    flex: 1,
    alignItems: 'center',
  },
  varianceText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  variancePercentage: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
  },
  noEntriesState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noEntriesText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
    marginBottom: 4,
  },
  noEntriesSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  signInPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  signInText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
    lineHeight: 20,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryIcon: {
    marginBottom: 8,
  },
  summaryIconWithBitcoin: {
    marginBottom: 8,
  },
  bitcoinIcon: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
  },
  bitcoinIconSmall: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  tableContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tableTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  tableDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#00D4AA',
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.2)',
  },
  // Mobile Card Styles
  mobileContainer: {
    gap: 12,
  },
  mobileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mobileCardEven: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  mobileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mobileYearInfo: {
    alignItems: 'flex-start',
  },
  mobileYear: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#00D4AA',
    marginBottom: 4,
  },
  mobileAge: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  mobilePortfolioValue: {
    alignItems: 'flex-end',
  },
  mobilePortfolioLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
    marginBottom: 4,
  },
  mobilePortfolioAmount: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#00D4AA',
  },
  mobileMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  mobileMetric: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    minHeight: 80,
    justifyContent: 'center',
  },
  mobileMetricLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  mobileMetricLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  mobileMetricValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 18,
  },
  mobileMetricValueBtc: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Desktop Table Styles
  desktopTableContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  desktopTableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  desktopTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  desktopTableRowEven: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  desktopHeaderCell: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  portfolioHeader: {
    color: '#00D4AA',
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  benchmarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  benchmarkHeaderText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
  },
  desktopCell: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#E2E8F0',
    textAlign: 'center',
  },
  yearColumn: {
    flex: 1,
    minWidth: 80,
  },
  ageColumn: {
    flex: 1,
    minWidth: 60,
  },
  valueColumn: {
    flex: 1.5,
    minWidth: 120,
  },
  yearText: {
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
  },
  ageText: {
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
  },
  contributionsText: {
    color: '#94A3B8',
  },
  portfolioValueText: {
    fontFamily: 'Inter-Bold',
    color: '#00D4AA',
    fontSize: 15,
  },
  btcValueText: {
    color: '#F59E0B',
  },
  positiveText: {
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
  },
  negativeText: {
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
});