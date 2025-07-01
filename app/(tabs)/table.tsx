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
import { Table, Calendar, DollarSign, TrendingUp, Plus, Trash2 } from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import GlassCard from '@/components/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const { width: screenWidth } = Dimensions.get('window');

interface CalculatorState {
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
}

interface YearlyData {
  year: number;
  age: number | null;
  contributions: number;
  assetValue: number;
  btcHurdleValue: number;
  assetGains: number;
  outperformance: number;
}

interface PortfolioEntry {
  id: string;
  amount: number;
  variance: number;
  variance_percentage: number;
  target: number;
  created_at: string;
}

export default function TableScreen() {
  const { user } = useAuth();
  const [calculatorState, setCalculatorState] = useState<CalculatorState>({
    startingAmount: 0,
    monthlyAmount: 500,
    years: 20,
    currentAge: null,
    btcHurdleRate: 30.0,
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
  });
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  const [portfolioEntries, setPortfolioEntries] = useState<PortfolioEntry[]>([]);
  const [currentPortfolioValue, setCurrentPortfolioValue] = useState('');
  const [loading, setLoading] = useState(false);

  const isMobile = screenWidth < 768;

  useEffect(() => {
    // Load calculator state from localStorage and listen for changes
    const loadCalculatorState = () => {
      const savedState = localStorage.getItem('freedom21_calculator_state');
      if (savedState) {
        setCalculatorState(JSON.parse(savedState));
      }
    };

    // Load initial state
    loadCalculatorState();

    // Listen for storage changes (when calculator state updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'freedom21_calculator_state' && e.newValue) {
        setCalculatorState(JSON.parse(e.newValue));
      }
    };

    // Listen for custom events (for same-tab updates)
    const handleCalculatorUpdate = (event: CustomEvent) => {
      setCalculatorState(event.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('calculatorStateUpdate', handleCalculatorUpdate as EventListener);

    // Also check for changes periodically (fallback)
    const interval = setInterval(loadCalculatorState, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('calculatorStateUpdate', handleCalculatorUpdate as EventListener);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    generateYearlyData();
  }, [calculatorState]);

  useEffect(() => {
    loadPortfolioEntries();
    generateSampleEntries();
  }, [user]);

  // Get the effective growth rate for a given year
  const getEffectiveGrowthRate = (year: number, baseRate: number): number => {
    let rate = baseRate;
    
    // Apply realistic CAGR reduction if enabled
    if (calculatorState.useRealisticCAGR) {
      rate = rate * 0.6; // 60% of optimistic rate
    }
    
    // Apply declining rates if enabled
    if (calculatorState.useDecliningRates) {
      if (year <= 10) {
        rate = calculatorState.phase1Rate;
      } else if (year <= 20) {
        rate = calculatorState.phase2Rate;
      } else {
        rate = calculatorState.phase3Rate;
      }
      
      // Still apply realistic reduction if both are enabled
      if (calculatorState.useRealisticCAGR) {
        rate = rate * 0.6;
      }
    }
    
    // Apply inflation adjustment if enabled
    if (calculatorState.useInflationAdjustment) {
      rate = rate - calculatorState.inflationRate;
    }
    
    return Math.max(0, rate); // Ensure rate doesn't go negative
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
    let totalValue = startingAmount; // Start with initial amount
    let totalContributions = startingAmount; // Include starting amount in total invested

    for (let year = 1; year <= targetYear; year++) {
      // Get effective growth rate for this year
      const rate = getEffectiveGrowthRate(year, baseGrowthRate) / 100;
      
      // Determine monthly contribution for this year
      let monthlyContrib = monthlyAmount;
      
      if (pauseAfterYears && year > pauseAfterYears) {
        monthlyContrib = 0; // No contributions after pause
      } else if (boostAfterYears && year > boostAfterYears) {
        monthlyContrib = boostAmount; // Boosted amount
      }

      // Add this year's contributions to total invested
      const yearlyContrib = monthlyContrib * 12;
      totalContributions += yearlyContrib;

      // Grow previous value and add new contributions
      totalValue = totalValue * (1 + rate) + yearlyContrib;
    }

    return {
      value: Math.max(0, Math.round(totalValue)),
      contributions: Math.round(totalContributions)
    };
  };

  // Calculate pro-rated value for current year based on today's date
  const calculateProRatedCurrentYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);
    const daysPassed = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const totalDaysInYear = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const yearProgress = daysPassed / totalDaysInYear;

    // Calculate what the portfolio should be worth at this point in the year
    const monthsPassed = (now.getMonth() + 1) + (now.getDate() / 30); // Approximate months passed
    const rate = getEffectiveGrowthRate(1, calculatorState.customCAGR) / 100;
    const monthlyRate = rate / 12;

    // Pro-rated calculation for current year
    let currentYearValue = calculatorState.startingAmount;
    let currentYearContributions = calculatorState.startingAmount;

    // Add contributions and growth for months passed
    for (let month = 1; month <= Math.floor(monthsPassed); month++) {
      currentYearValue = currentYearValue * (1 + monthlyRate) + calculatorState.monthlyAmount;
      currentYearContributions += calculatorState.monthlyAmount;
    }

    // Add partial month if needed
    const partialMonth = monthsPassed - Math.floor(monthsPassed);
    if (partialMonth > 0) {
      const partialContribution = calculatorState.monthlyAmount * partialMonth;
      currentYearValue = currentYearValue * (1 + monthlyRate * partialMonth) + partialContribution;
      currentYearContributions += partialContribution;
    }

    return {
      value: Math.round(currentYearValue),
      contributions: Math.round(currentYearContributions),
      yearProgress
    };
  };

  const generateYearlyData = () => {
    const { startingAmount, monthlyAmount, years, currentAge, customCAGR, btcHurdleRate, pauseAfterYears, boostAfterYears, boostAmount } = calculatorState;
    const currentYear = new Date().getFullYear();
    
    const data: YearlyData[] = [];

    // Add current year (pro-rated based on today's date)
    const currentYearData = calculateProRatedCurrentYear();
    const currentYearBtcResult = calculateYearByYearProgression(
      startingAmount,
      monthlyAmount,
      btcHurdleRate,
      1, // First year
      pauseAfterYears,
      boostAfterYears,
      boostAmount
    );
    
    // Pro-rate the Bitcoin benchmark for current year too
    const currentYearBtcValue = Math.round(currentYearBtcResult.value * currentYearData.yearProgress);
    
    data.push({
      year: currentYear,
      age: currentAge,
      contributions: currentYearData.contributions,
      assetValue: currentYearData.value,
      btcHurdleValue: currentYearBtcValue,
      assetGains: currentYearData.value - currentYearData.contributions,
      outperformance: currentYearData.value - currentYearBtcValue,
    });

    // Add future years (starting from next year)
    for (let year = 1; year <= years; year++) {
      const targetYear = currentYear + year;
      
      // Calculate asset value with user's strategy and selected asset CAGR
      const assetResult = calculateYearByYearProgression(
        startingAmount,
        monthlyAmount,
        customCAGR,
        year + 1, // +1 because we're starting from next year
        pauseAfterYears,
        boostAfterYears,
        boostAmount
      );

      // Calculate Bitcoin benchmark with SAME strategy but Bitcoin CAGR
      const btcResult = calculateYearByYearProgression(
        startingAmount,
        monthlyAmount,
        btcHurdleRate,
        year + 1, // +1 because we're starting from next year
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

  const loadPortfolioEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('portfolio_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPortfolioEntries(data || []);
    } catch (error) {
      console.error('Error loading portfolio entries:', error);
    }
  };

  const generateSampleEntries = () => {
    if (user || portfolioEntries.length > 0) return; // Don't show samples if user is logged in or has entries

    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Get Year 1 target (current year target)
    const year1Target = yearlyData.find(d => d.year === currentYear)?.assetValue || 6000;
    
    // Create sample entries for current month and last month
    const currentMonth = now.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const sampleEntries: PortfolioEntry[] = [
      {
        id: 'sample-1',
        amount: Math.round(calculatorState.monthlyAmount * 1.1), // 10% above monthly amount
        variance: Math.round(calculatorState.monthlyAmount * 0.1),
        variance_percentage: 10,
        target: year1Target,
        created_at: new Date(currentYear, currentMonth, 15).toISOString(),
      },
      {
        id: 'sample-2',
        amount: Math.round(calculatorState.monthlyAmount * 0.95), // 5% below monthly amount
        variance: Math.round(calculatorState.monthlyAmount * -0.05),
        variance_percentage: -5,
        target: year1Target,
        created_at: new Date(lastMonthYear, lastMonth, 15).toISOString(),
      }
    ];

    setPortfolioEntries(sampleEntries);
  };

  const savePortfolioEntry = async () => {
    if (!currentPortfolioValue.trim()) {
      Alert.alert('Error', 'Please enter a portfolio value');
      return;
    }

    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to save your portfolio entries to the cloud and sync across devices');
      return;
    }

    const amount = parseFloat(currentPortfolioValue.replace(/[^0-9.-]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid portfolio amount');
      return;
    }

    setLoading(true);

    try {
      // Calculate target based on current year
      const currentYear = new Date().getFullYear();
      const yearData = yearlyData.find(d => d.year === currentYear);
      const target = yearData?.assetValue || 0;
      
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

      if (error) throw error;

      setPortfolioEntries(prev => [data, ...prev]);
      setCurrentPortfolioValue('');
      Alert.alert('Success', 'Portfolio entry saved successfully!');
    } catch (error) {
      console.error('Error saving portfolio entry:', error);
      Alert.alert('Error', 'Failed to save portfolio entry');
    } finally {
      setLoading(false);
    }
  };

  const deletePortfolioEntry = async (id: string) => {
    if (id.startsWith('sample-')) {
      // Remove sample entry from local state
      setPortfolioEntries(prev => prev.filter(entry => entry.id !== id));
      return;
    }

    if (!user) return;

    try {
      const { error } = await supabase
        .from('portfolio_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setPortfolioEntries(prev => prev.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error deleting portfolio entry:', error);
      Alert.alert('Error', 'Failed to delete portfolio entry');
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
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStrategyText = () => {
    const strategies = [];
    
    if (calculatorState.useRealisticCAGR) {
      strategies.push('Conservative CAGR');
    }
    
    if (calculatorState.useDecliningRates) {
      strategies.push(`Declining Rates (${calculatorState.phase1Rate}%→${calculatorState.phase2Rate}%→${calculatorState.phase3Rate}%)`);
    }
    
    if (calculatorState.useInflationAdjustment) {
      strategies.push(`Inflation Adjusted (-${calculatorState.inflationRate}%)`);
    }
    
    if (calculatorState.pauseAfterYears) {
      strategies.push(`Pause after ${calculatorState.pauseAfterYears}Y`);
    } else if (calculatorState.boostAfterYears) {
      strategies.push(`Boost after ${calculatorState.boostAfterYears}Y to ${formatCurrency(calculatorState.boostAmount)}`);
    }
    
    return strategies.length > 0 ? strategies.join(' • ') : 'Standard DCA';
  };

  const getEffectiveCAGR = () => {
    if (calculatorState.useDecliningRates) {
      return `${calculatorState.phase1Rate}%→${calculatorState.phase2Rate}%→${calculatorState.phase3Rate}%`;
    }
    
    let rate = calculatorState.customCAGR;
    if (calculatorState.useRealisticCAGR) {
      rate = rate * 0.6;
    }
    if (calculatorState.useInflationAdjustment) {
      rate = rate - calculatorState.inflationRate;
    }
    
    return `${rate.toFixed(1)}%`;
  };

  // Bitcoin Icon Component
  const BitcoinIcon = ({ size = 16, color = "#F59E0B" }: { size?: number; color?: string }) => (
    <View style={[styles.bitcoinIcon, { width: size, height: size }]}>
      <Text style={[styles.bitcoinText, { fontSize: size * 0.7, color }]}>₿</Text>
    </View>
  );

  // Mobile Card View Component for Portfolio Entries
  const MobilePortfolioCard = ({ entry, index }: { entry: PortfolioEntry; index: number }) => {
    const entryDate = new Date(entry.created_at);
    const entryYear = entryDate.getFullYear();
    
    return (
      <View style={[styles.mobilePortfolioCard, index % 2 === 0 && styles.mobileCardEven]}>
        <View style={styles.mobileCardHeader}>
          <View style={styles.mobileDateInfo}>
            <Text style={styles.mobileDate}>{formatDate(entry.created_at)}</Text>
            <Text style={styles.mobileTarget}>Target (Year {entryYear}): {formatCompactCurrency(entry.target)}</Text>
          </View>
          <TouchableOpacity
            style={styles.mobileDeleteButton}
            onPress={() => deletePortfolioEntry(entry.id)}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.mobilePortfolioAmount}>
          <Text style={styles.mobilePortfolioLabel}>📈 Portfolio Value</Text>
          <Text style={styles.mobilePortfolioValue}>{formatCompactCurrency(entry.amount)}</Text>
        </View>

        <View style={styles.mobileVariance}>
          <Text style={styles.mobileVarianceLabel}>📊 vs Target</Text>
          <Text style={[
            styles.mobileVarianceValue,
            { color: entry.variance >= 0 ? '#00D4AA' : '#EF4444' }
          ]}>
            {entry.variance >= 0 ? '+' : ''}{formatCompactCurrency(entry.variance)} ({entry.variance_percentage.toFixed(1)}%)
          </Text>
        </View>
      </View>
    );
  };

  // Mobile Card View Component for Yearly Data
  const MobileYearCard = ({ data, index }: { data: YearlyData; index: number }) => (
    <View style={[styles.mobileCard, index % 2 === 0 && styles.mobileCardEven]}>
      <View style={styles.mobileCardHeader}>
        <View style={styles.mobileYearInfo}>
          <Text style={styles.mobileYear}>{data.year}</Text>
          {calculatorState.currentAge && (
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
            <BitcoinIcon size={12} />
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
  );

  // Desktop Table Components
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.yearColumn]}>Year</Text>
      {calculatorState.currentAge && (
        <Text style={[styles.headerCell, styles.ageColumn]}>Age</Text>
      )}
      <Text style={[styles.headerCell, styles.valueColumn]}>💰 Invested</Text>
      <Text style={[styles.headerCell, styles.valueColumn, styles.portfolioHeader]}>📈 Portfolio Value</Text>
      <View style={[styles.headerCell, styles.valueColumn, styles.benchmarkHeader]}>
        <BitcoinIcon size={16} />
        <Text style={styles.benchmarkHeaderText}>Benchmark</Text>
      </View>
      <Text style={[styles.headerCell, styles.valueColumn]}>📊 Difference</Text>
    </View>
  );

  const TableRow = ({ data, index }: { data: YearlyData; index: number }) => (
    <View style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
      <Text style={[styles.cell, styles.yearColumn, styles.yearText]}>{data.year}</Text>
      {calculatorState.currentAge && (
        <Text style={[styles.cell, styles.ageColumn, styles.ageText]}>{data.age}</Text>
      )}
      <Text style={[styles.cell, styles.valueColumn, styles.contributionsText]}>
        {formatCompactCurrency(data.contributions)}
      </Text>
      <Text style={[styles.cell, styles.valueColumn, styles.portfolioValueText]}>
        {formatCompactCurrency(data.assetValue)}
      </Text>
      <Text style={[styles.cell, styles.valueColumn, styles.btcValueText]}>
        {formatCompactCurrency(data.btcHurdleValue)}
      </Text>
      <Text style={[
        styles.cell, 
        styles.valueColumn, 
        data.outperformance >= 0 ? styles.positiveText : styles.negativeText
      ]}>
        {data.outperformance >= 0 ? '+' : ''}{formatCompactCurrency(data.outperformance)}
      </Text>
    </View>
  );

  const currentYear = new Date().getFullYear();
  const year1Target = yearlyData.find(d => d.year === currentYear)?.assetValue || 0;

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
                {calculatorState.selectedAsset} vs Benchmark
              </Text>
              <Text style={styles.configText}>
                {calculatorState.startingAmount > 0 && `${formatCurrency(calculatorState.startingAmount)} start + `}
                ${calculatorState.monthlyAmount}/mo • {getEffectiveCAGR()} CAGR • {getStrategyText()}
              </Text>
              <Text style={styles.methodNote}>
                📊 Benchmark uses same strategy with {calculatorState.btcHurdleRate}% CAGR
              </Text>
            </View>
          </AnimatedCard>

          {/* Portfolio Tracking */}
          <AnimatedCard delay={100}>
            <GlassCard style={styles.portfolioTrackingCard}>
              <View style={styles.portfolioTrackingHeader}>
                <View style={styles.portfolioTrackingIcon}>
                  <TrendingUp size={20} color="#00D4AA" />
                </View>
                <View style={styles.portfolioTrackingInfo}>
                  <Text style={styles.portfolioTrackingTitle}>📊 Portfolio Tracking</Text>
                  <Text style={styles.portfolioTrackingSubtitle}>
                    Track your actual portfolio value monthly and see how you're performing against your Year 1 target projection of {formatCurrency(year1Target)}. Regular monthly updates help you stay on track with your investment goals.
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
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={savePortfolioEntry}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.monthlyTrackingNote}>
                <Calendar size={16} color="#00D4AA" />
                <Text style={styles.monthlyTrackingText}>
                  💡 Track monthly to build a habit and see your progress over time
                </Text>
              </View>

              {/* Portfolio Entries */}
              {portfolioEntries.length > 0 && (
                <View style={styles.portfolioEntriesSection}>
                  {isMobile ? (
                    <View style={styles.mobilePortfolioContainer}>
                      {portfolioEntries.map((entry, index) => (
                        <MobilePortfolioCard key={entry.id} entry={entry} index={index} />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.portfolioTable}>
                      <View style={styles.portfolioTableHeader}>
                        <Text style={[styles.portfolioHeaderCell, styles.dateColumn]}>Date</Text>
                        <Text style={[styles.portfolioHeaderCell, styles.amountColumn]}>Portfolio Amount</Text>
                        <Text style={[styles.portfolioHeaderCell, styles.varianceColumn]}>Variance vs Target</Text>
                        <Text style={[styles.portfolioHeaderCell, styles.actionColumn]}>Action</Text>
                      </View>
                      {portfolioEntries.map((entry, index) => {
                        const entryDate = new Date(entry.created_at);
                        const entryYear = entryDate.getFullYear();
                        
                        return (
                          <View key={entry.id} style={[styles.portfolioTableRow, index % 2 === 0 && styles.portfolioTableRowEven]}>
                            <Text style={[styles.portfolioCell, styles.dateColumn, styles.dateText]}>
                              {formatDate(entry.created_at)}
                            </Text>
                            <Text style={[styles.portfolioCell, styles.amountColumn, styles.amountText]}>
                              {formatCurrency(entry.amount)}
                            </Text>
                            <View style={[styles.portfolioCell, styles.varianceColumn]}>
                              <Text style={[
                                styles.varianceText,
                                { color: entry.variance >= 0 ? '#00D4AA' : '#EF4444' }
                              ]}>
                                {entry.variance >= 0 ? '+' : ''}{formatCurrency(entry.variance)}
                              </Text>
                              <Text style={[
                                styles.variancePercentage,
                                { color: entry.variance >= 0 ? '#00D4AA' : '#EF4444' }
                              ]}>
                                ({entry.variance_percentage.toFixed(1)}%)
                              </Text>
                              <Text style={styles.targetText}>
                                Target (Year {entryYear}): {formatCurrency(entry.target)}
                              </Text>
                            </View>
                            <View style={[styles.portfolioCell, styles.actionColumn]}>
                              <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => deletePortfolioEntry(entry.id)}
                                activeOpacity={0.7}
                              >
                                <Trash2 size={16} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {!user && (
                <View style={styles.signInPrompt}>
                  <Text style={styles.signInPromptText}>
                    🔐 Sign in to save your portfolio entries to the cloud and sync across devices
                  </Text>
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
                  Year {yearlyData[yearlyData.length - 1]?.year || new Date().getFullYear() + calculatorState.years}
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <View style={styles.summaryIconWithBitcoin}>
                  <BitcoinIcon size={24} />
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

          {/* Table/Cards Container */}
          <AnimatedCard delay={300}>
            <View style={styles.tableContainer}>
              <Text style={styles.tableTitle}>Year-by-Year Portfolio Growth</Text>
              <Text style={styles.tableDescription}>
                📈 Track your portfolio value growth each year (starting with {currentYear} pro-rated to today's date)
                {calculatorState.startingAmount > 0 && ` (starting with ${formatCurrency(calculatorState.startingAmount)})`}
              </Text>
              
              {isMobile ? (
                // Mobile Card View
                <View style={styles.mobileContainer}>
                  {yearlyData.map((data, index) => (
                    <MobileYearCard key={data.year} data={data} index={index} />
                  ))}
                </View>
              ) : (
                // Desktop Table View - Full Width Responsive
                <View style={styles.tableScrollView}>
                  <View style={styles.table}>
                    <TableHeader />
                    {yearlyData.map((data, index) => (
                      <TableRow key={data.year} data={data} index={index} />
                    ))}
                  </View>
                </View>
              )}
            </View>
          </AnimatedCard>

          {/* Growth Analysis */}
          <AnimatedCard delay={400}>
            <View style={styles.analysisContainer}>
              <Text style={styles.analysisTitle}>Understanding Your Portfolio Growth</Text>
              
              <View style={styles.phaseCard}>
                <Text style={styles.phaseTitle}>📅 Current Year Pro-Rating</Text>
                <Text style={styles.phaseText}>
                  The {currentYear} portfolio value is calculated based on today's date, showing what your portfolio should be worth right now based on your investment timeline. This helps you track real-time progress against your projections.
                </Text>
              </View>
              
              {calculatorState.startingAmount > 0 && (
                <View style={styles.phaseCard}>
                  <Text style={styles.phaseTitle}>💰 Starting Amount Advantage</Text>
                  <Text style={styles.phaseText}>
                    Your {formatCurrency(calculatorState.startingAmount)} starting amount gets the full {calculatorState.years} years to compound and grow. This head start can make a massive difference in your final wealth!
                  </Text>
                </View>
              )}
              
              <View style={styles.phaseCard}>
                <Text style={styles.phaseTitle}>💰 Invested vs 📈 Portfolio Value</Text>
                <Text style={styles.phaseText}>
                  • <Text style={styles.boldText}>Invested</Text>: Total money you've put in{calculatorState.startingAmount > 0 ? ' (including starting amount)' : ''}{'\n'}
                  • <Text style={styles.boldText}>Portfolio Value</Text>: What your investment is worth (includes growth){'\n'}
                  • <Text style={styles.boldText}>Final Year Portfolio</Text>: {formatCurrency(yearlyData[yearlyData.length - 1]?.assetValue || 0)} ✨
                </Text>
              </View>

              <View style={styles.phaseCard}>
                <Text style={styles.phaseTitle}>📊 How It Grows Each Year</Text>
                <Text style={styles.phaseText}>
                  {calculatorState.pauseAfterYears ? 'Your portfolio grows through compound interest even after you stop contributing. Watch how it accelerates!' : calculatorState.boostAfterYears ? 'Your portfolio grows faster after the boost kicks in. Higher contributions = exponential growth!' : 'Each year: Previous portfolio value grows by your CAGR rate, then new contributions are added.'}
                </Text>
              </View>

              {calculatorState.useRealisticCAGR && (
                <View style={styles.phaseCard}>
                  <Text style={styles.phaseTitle}>🎯 Conservative CAGR Strategy</Text>
                  <Text style={styles.phaseText}>
                    Using 60% of optimistic growth rates provides more realistic projections for financial planning. This conservative approach helps avoid over-optimistic expectations.
                  </Text>
                </View>
              )}

              {calculatorState.useDecliningRates && (
                <View style={styles.phaseCard}>
                  <Text style={styles.phaseTitle}>📉 Declining Growth Rates</Text>
                  <Text style={styles.phaseText}>
                    Phase 1 (Years 1-10): {calculatorState.phase1Rate}% growth - High growth period{'\n'}
                    Phase 2 (Years 11-20): {calculatorState.phase2Rate}% growth - Maturing asset{'\n'}
                    Phase 3 (Years 21+): {calculatorState.phase3Rate}% growth - Stable returns{'\n'}
                    This reflects how high-growth assets typically mature over time.
                  </Text>
                </View>
              )}

              {calculatorState.useInflationAdjustment && (
                <View style={styles.phaseCard}>
                  <Text style={styles.phaseTitle}>💸 Inflation Adjustment</Text>
                  <Text style={styles.phaseText}>
                    Subtracting {calculatorState.inflationRate}% inflation shows real purchasing power growth, not just nominal returns. This gives you a clearer picture of actual wealth building.
                  </Text>
                </View>
              )}

              <View style={styles.phaseCard}>
                <Text style={styles.phaseTitle}>⚖️ Fair Benchmark Comparison</Text>
                <Text style={styles.phaseText}>
                  Benchmark uses your exact same strategy ({getStrategyText()}) {calculatorState.startingAmount > 0 ? `and starting amount (${formatCurrency(calculatorState.startingAmount)}) ` : ''}but with {calculatorState.btcHurdleRate}% growth rate instead of your asset's rate. This ensures a fair comparison!
                </Text>
              </View>
            </View>
          </AnimatedCard>

          {/* Formula Explanation */}
          <AnimatedCard delay={500}>
            <View style={styles.formulaContainer}>
              <Text style={styles.formulaTitle}>How We Calculate Portfolio Value</Text>
              <Text style={styles.formulaText}>
                Each year's portfolio value is calculated step by step:
              </Text>
              <View style={styles.formulaBox}>
                <Text style={styles.formulaEquation}>
                  Portfolio Value = (Previous Year × Growth Rate) + New Contributions
                </Text>
                {calculatorState.startingAmount > 0 && (
                  <Text style={styles.formulaNote}>
                    Starting amount gets full growth period advantage
                  </Text>
                )}
                {(calculatorState.useRealisticCAGR || calculatorState.useDecliningRates || calculatorState.useInflationAdjustment) && (
                  <Text style={styles.formulaNote}>
                    Growth rate adjusted for: {getStrategyText()}
                  </Text>
                )}
              </View>
              <Text style={styles.formulaDescription}>
                This gives you the exact portfolio value progression year by year, showing how compound growth accelerates over time.
              </Text>
              <Text style={styles.benchmarkExplanation}>
                🎯 Final Portfolio Value: {formatCurrency(yearlyData[yearlyData.length - 1]?.assetValue || 0)} (matches Calculator tab!)
              </Text>
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
  bitcoinIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  bitcoinText: {
    fontFamily: 'Inter-Bold',
    fontWeight: 'bold',
  },

  // Portfolio Tracking Styles
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
    width: 40,
    height: 40,
    borderRadius: 12,
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
    fontFamily: 'Inter-SemiBold',
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
    marginBottom: 16,
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
    alignItems: 'center',
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  monthlyTrackingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  monthlyTrackingText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#00D4AA',
    flex: 1,
  },
  portfolioEntriesSection: {
    marginTop: 8,
  },
  signInPrompt: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    marginTop: 16,
  },
  signInPromptText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
    textAlign: 'center',
  },

  // Mobile Portfolio Cards
  mobilePortfolioContainer: {
    gap: 12,
  },
  mobilePortfolioCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mobileDateInfo: {
    flex: 1,
  },
  mobileDate: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#00D4AA',
    marginBottom: 4,
  },
  mobileTarget: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  mobileDeleteButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  mobilePortfolioAmount: {
    alignItems: 'center',
    marginVertical: 16,
  },
  mobilePortfolioLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
    marginBottom: 8,
  },
  mobilePortfolioValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#00D4AA',
  },
  mobileVariance: {
    alignItems: 'center',
  },
  mobileVarianceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 8,
  },
  mobileVarianceValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },

  // Desktop Portfolio Table
  portfolioTable: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  portfolioTableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  portfolioTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  portfolioTableRowEven: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  portfolioHeaderCell: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  portfolioCell: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#E2E8F0',
    textAlign: 'center',
  },
  dateColumn: {
    flex: 1,
    minWidth: 100,
  },
  amountColumn: {
    flex: 1.5,
    minWidth: 120,
  },
  varianceColumn: {
    flex: 2,
    minWidth: 200,
  },
  actionColumn: {
    flex: 0.5,
    minWidth: 60,
  },
  dateText: {
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
  },
  amountText: {
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  varianceText: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
  },
  variancePercentage: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    marginTop: 2,
  },
  targetText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
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

  // Mobile Card Styles - Improved width and alignment
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

  // Desktop Table Styles - Full Width Responsive with Clean Background
  tableScrollView: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    width: '100%',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tableRowEven: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  headerCell: {
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
  cell: {
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
  analysisContainer: {
    paddingVertical: 24,
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  analysisTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  phaseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00D4AA',
  },
  phaseTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
    marginBottom: 8,
  },
  phaseText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    lineHeight: 20,
  },
  boldText: {
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  formulaContainer: {
    paddingVertical: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  formulaTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
    marginBottom: 12,
    textAlign: 'center',
  },
  formulaText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 16,
    textAlign: 'center',
  },
  formulaBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  formulaEquation: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
    textAlign: 'center',
  },
  formulaNote: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  formulaDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  benchmarkExplanation: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.2)',
  },
});