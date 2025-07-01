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
import { Table, Calendar, DollarSign, TrendingUp, Plus, Trash2, User, ChartBar as BarChart3 } from 'lucide-react-native';
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
  date: string;
  amount: number;
  variance: number;
  variancePercentage: number;
  target: number;
  user_id?: string;
  created_at?: string;
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
  const [currentAmount, setCurrentAmount] = useState('');
  const [error, setError] = useState('');
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
  }, [user]);

  // Load portfolio entries from Supabase or localStorage
  const loadPortfolioEntries = async () => {
    if (user) {
      // Load from Supabase for authenticated users
      try {
        const { data, error } = await supabase
          .from('portfolio_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const entries = data?.map(entry => ({
          id: entry.id,
          date: new Date(entry.created_at).toLocaleDateString(),
          amount: entry.amount,
          variance: entry.variance,
          variancePercentage: entry.variance_percentage,
          target: entry.target,
          user_id: entry.user_id,
          created_at: entry.created_at,
        })) || [];

        setPortfolioEntries(entries);
      } catch (error) {
        console.error('Error loading portfolio entries:', error);
        // Fallback to localStorage
        loadFromLocalStorage();
      }
    } else {
      // Load from localStorage for non-authenticated users
      loadFromLocalStorage();
    }
  };

  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem('portfolio_entries');
    if (saved) {
      try {
        const entries = JSON.parse(saved);
        setPortfolioEntries(entries);
      } catch (error) {
        console.error('Error parsing portfolio entries:', error);
        setPortfolioEntries([]);
      }
    } else {
      // Add sample entries for demonstration
      const sampleEntries = [
        {
          id: 'sample-1',
          date: '7/1/2025',
          amount: 26000,
          variance: 19400,
          variancePercentage: 294.0,
          target: 6600,
        },
        {
          id: 'sample-2',
          date: '6/1/2025',
          amount: 25500,
          variance: 18900,
          variancePercentage: 286.4,
          target: 6600,
        },
        {
          id: 'sample-3',
          date: '5/2/2025',
          amount: 22000,
          variance: 15400,
          variancePercentage: 233.3,
          target: 6600,
        },
      ];
      setPortfolioEntries(sampleEntries);
    }
  };

  // Save portfolio entry to Supabase or localStorage
  const savePortfolioEntry = async (entry: Omit<PortfolioEntry, 'id'>) => {
    if (user) {
      // Save to Supabase for authenticated users
      try {
        const { data, error } = await supabase
          .from('portfolio_entries')
          .insert({
            user_id: user.id,
            amount: entry.amount,
            variance: entry.variance,
            variance_percentage: entry.variancePercentage,
            target: entry.target,
          })
          .select()
          .single();

        if (error) throw error;

        const newEntry: PortfolioEntry = {
          id: data.id,
          date: new Date(data.created_at).toLocaleDateString(),
          amount: data.amount,
          variance: data.variance,
          variancePercentage: data.variance_percentage,
          target: data.target,
          user_id: data.user_id,
          created_at: data.created_at,
        };

        setPortfolioEntries(prev => [newEntry, ...prev]);
        return true;
      } catch (error) {
        console.error('Error saving to Supabase:', error);
        Alert.alert('Error', 'Failed to save portfolio entry. Please try again.');
        return false;
      }
    } else {
      // Save to localStorage for non-authenticated users
      const newEntry: PortfolioEntry = {
        ...entry,
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(),
      };

      const updatedEntries = [newEntry, ...portfolioEntries];
      setPortfolioEntries(updatedEntries);
      localStorage.setItem('portfolio_entries', JSON.stringify(updatedEntries));
      return true;
    }
  };

  // Delete portfolio entry
  const deletePortfolioEntry = async (id: string) => {
    if (user && !id.startsWith('sample-')) {
      // Delete from Supabase for authenticated users
      try {
        const { error } = await supabase
          .from('portfolio_entries')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        setPortfolioEntries(prev => prev.filter(entry => entry.id !== id));
      } catch (error) {
        console.error('Error deleting from Supabase:', error);
        Alert.alert('Error', 'Failed to delete portfolio entry. Please try again.');
      }
    } else {
      // Delete from localStorage
      const updatedEntries = portfolioEntries.filter(entry => entry.id !== id);
      setPortfolioEntries(updatedEntries);
      localStorage.setItem('portfolio_entries', JSON.stringify(updatedEntries));
    }
  };

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

  const generateYearlyData = () => {
    const { startingAmount, monthlyAmount, years, currentAge, customCAGR, btcHurdleRate, pauseAfterYears, boostAfterYears, boostAmount } = calculatorState;
    const currentYear = new Date().getFullYear();
    
    const data: YearlyData[] = [];

    // Add year 0 if there's a starting amount
    if (startingAmount > 0) {
      data.push({
        year: currentYear,
        age: currentAge,
        contributions: startingAmount,
        assetValue: startingAmount,
        btcHurdleValue: startingAmount,
        assetGains: 0,
        outperformance: 0,
      });
    }

    for (let year = 1; year <= years; year++) {
      // Calculate asset value with user's strategy and selected asset CAGR
      const assetResult = calculateYearByYearProgression(
        startingAmount,
        monthlyAmount,
        customCAGR,
        year,
        pauseAfterYears,
        boostAfterYears,
        boostAmount
      );

      // Calculate Bitcoin benchmark with SAME strategy but Bitcoin CAGR
      const btcResult = calculateYearByYearProgression(
        startingAmount,
        monthlyAmount,
        btcHurdleRate,
        year,
        pauseAfterYears,
        boostAfterYears,
        boostAmount
      );
      
      const assetGains = assetResult.value - assetResult.contributions;
      const outperformance = assetResult.value - btcResult.value;

      data.push({
        year: currentYear + year,
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

  // Get Year 1 target value
  const getTargetValue = (): number => {
    const { startingAmount, monthlyAmount, customCAGR, pauseAfterYears, boostAfterYears, boostAmount } = calculatorState;
    
    const result = calculateYearByYearProgression(
      startingAmount,
      monthlyAmount,
      customCAGR,
      1, // Year 1
      pauseAfterYears,
      boostAfterYears,
      boostAmount
    );
    
    return result.value;
  };

  const handleSaveEntry = async () => {
    setError('');
    
    // Validate input
    const amount = parseFloat(currentAmount.replace(/[^0-9.-]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to save portfolio entries to the cloud. You can still use the app without signing in, but your data will only be saved locally.',
        [
          { text: 'Continue Locally', style: 'cancel' },
          { text: 'Sign In', onPress: () => {/* Navigate to settings */} }
        ]
      );
    }

    setLoading(true);

    const target = getTargetValue();
    const variance = amount - target;
    const variancePercentage = target > 0 ? (variance / target) * 100 : 0;

    const success = await savePortfolioEntry({
      date: new Date().toLocaleDateString(),
      amount,
      variance,
      variancePercentage,
      target,
    });

    if (success) {
      setCurrentAmount('');
    }

    setLoading(false);
  };

  const handleDeleteEntry = (id: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this portfolio entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePortfolioEntry(id) }
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
  const MobilePortfolioCard = ({ entry, index }: { entry: PortfolioEntry; index: number }) => (
    <View style={[styles.mobilePortfolioCard, index % 2 === 0 && styles.mobileCardEven]}>
      <View style={styles.mobilePortfolioHeader}>
        <View style={styles.mobilePortfolioDate}>
          <Calendar size={16} color="#00D4AA" />
          <Text style={styles.mobilePortfolioDateText}>{entry.date}</Text>
        </View>
        <TouchableOpacity
          style={styles.mobileDeleteButton}
          onPress={() => handleDeleteEntry(entry.id)}
          activeOpacity={0.7}
        >
          <Trash2 size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.mobilePortfolioContent}>
        <View style={styles.mobilePortfolioAmount}>
          <Text style={styles.mobilePortfolioLabel}>Portfolio Value</Text>
          <Text style={styles.mobilePortfolioValue}>{formatCurrency(entry.amount)}</Text>
        </View>

        <View style={styles.mobilePortfolioVariance}>
          <Text style={styles.mobilePortfolioLabel}>vs Target</Text>
          <View style={styles.mobileVarianceContainer}>
            <TrendingUp 
              size={14} 
              color={entry.variance >= 0 ? '#00D4AA' : '#EF4444'} 
              style={entry.variance < 0 ? { transform: [{ rotate: '180deg' }] } : undefined}
            />
            <Text style={[
              styles.mobileVarianceText,
              { color: entry.variance >= 0 ? '#00D4AA' : '#EF4444' }
            ]}>
              {entry.variance >= 0 ? '+' : ''}{formatCompactCurrency(entry.variance)}
            </Text>
          </View>
          <Text style={styles.mobileVariancePercentage}>
            ({entry.variance >= 0 ? '+' : ''}{entry.variancePercentage.toFixed(1)}%)
          </Text>
        </View>
      </View>

      <View style={styles.mobilePortfolioTarget}>
        <Text style={styles.mobileTargetLabel}>Target (Year 1): {formatCurrency(entry.target)}</Text>
      </View>
    </View>
  );

  // Desktop Table Components
  const PortfolioTableHeader = () => (
    <View style={styles.portfolioTableHeader}>
      <Text style={[styles.portfolioHeaderCell, styles.dateColumn]}>Date</Text>
      <Text style={[styles.portfolioHeaderCell, styles.amountColumn]}>Portfolio Amount</Text>
      <Text style={[styles.portfolioHeaderCell, styles.varianceColumn]}>Variance vs Target</Text>
      <Text style={[styles.portfolioHeaderCell, styles.actionColumn]}>Action</Text>
    </View>
  );

  const PortfolioTableRow = ({ entry, index }: { entry: PortfolioEntry; index: number }) => (
    <View style={[styles.portfolioTableRow, index % 2 === 0 && styles.portfolioTableRowEven]}>
      <Text style={[styles.portfolioCell, styles.dateColumn, styles.portfolioDateText]}>{entry.date}</Text>
      <Text style={[styles.portfolioCell, styles.amountColumn, styles.portfolioAmountText]}>
        {formatCurrency(entry.amount)}
      </Text>
      <View style={[styles.portfolioCell, styles.varianceColumn, styles.portfolioVarianceCell]}>
        <View style={styles.varianceContainer}>
          <TrendingUp 
            size={16} 
            color={entry.variance >= 0 ? '#00D4AA' : '#EF4444'} 
            style={entry.variance < 0 ? { transform: [{ rotate: '180deg' }] } : undefined}
          />
          <Text style={[
            styles.varianceText,
            { color: entry.variance >= 0 ? '#00D4AA' : '#EF4444' }
          ]}>
            {entry.variance >= 0 ? '+' : ''}{formatCurrency(entry.variance)}
          </Text>
        </View>
        <Text style={styles.variancePercentage}>
          ({entry.variance >= 0 ? '+' : ''}{entry.variancePercentage.toFixed(1)}%)
        </Text>
      </View>
      <View style={[styles.portfolioCell, styles.actionColumn]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteEntry(entry.id)}
          activeOpacity={0.7}
        >
          <Trash2 size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const YearlyTableHeader = () => (
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

  const YearlyTableRow = ({ data, index }: { data: YearlyData; index: number }) => (
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

          {/* Portfolio Tracking Section */}
          <AnimatedCard delay={100}>
            <GlassCard style={styles.portfolioTrackingContainer}>
              <View style={styles.portfolioTrackingHeader}>
                <View style={styles.portfolioTrackingIcon}>
                  <BarChart3 size={24} color="#00D4AA" />
                </View>
                <View style={styles.portfolioTrackingTitleContainer}>
                  <Text style={styles.portfolioTrackingTitle}>📊 Portfolio Tracking</Text>
                  <Text style={styles.portfolioTrackingSubtitle}>
                    Track your actual portfolio value over time and see how you're performing against your Year 1 target projection of {formatCurrency(getTargetValue())}
                  </Text>
                </View>
              </View>

              {/* Input Section */}
              <View style={styles.inputSection}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Actual Portfolio Amount</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.portfolioInput, error ? styles.portfolioInputError : null]}
                      placeholder="Enter current portfolio value"
                      placeholderTextColor="#64748B"
                      value={currentAmount}
                      onChangeText={(text) => {
                        setCurrentAmount(text);
                        setError('');
                      }}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                      onPress={handleSaveEntry}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#00D4AA', '#00A887']}
                        style={styles.saveButtonGradient}
                      >
                        <Plus size={20} color="#FFFFFF" />
                        <Text style={styles.saveButtonText}>Save</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>
              </View>

              {/* Portfolio Entries Table/Cards */}
              {portfolioEntries.length > 0 && (
                <View style={styles.portfolioEntriesContainer}>
                  {isMobile ? (
                    // Mobile Card View
                    <View style={styles.mobilePortfolioContainer}>
                      {portfolioEntries.map((entry, index) => (
                        <MobilePortfolioCard key={entry.id} entry={entry} index={index} />
                      ))}
                    </View>
                  ) : (
                    // Desktop Table View
                    <View style={styles.portfolioTableContainer}>
                      <PortfolioTableHeader />
                      {portfolioEntries.map((entry, index) => (
                        <PortfolioTableRow key={entry.id} entry={entry} index={index} />
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Auth Status */}
              {!user && (
                <View style={styles.authNotice}>
                  <User size={16} color="#F59E0B" />
                  <Text style={styles.authNoticeText}>
                    Sign in to save your portfolio entries to the cloud and sync across devices
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

          {/* Yearly Table/Cards Container */}
          <AnimatedCard delay={300}>
            <View style={styles.tableContainer}>
              <Text style={styles.tableTitle}>Year-by-Year Portfolio Growth</Text>
              <Text style={styles.tableDescription}>
                📈 Track your portfolio value growth each year
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
                // Desktop Table View
                <View style={styles.tableScrollView}>
                  <View style={styles.table}>
                    <YearlyTableHeader />
                    {yearlyData.map((data, index) => (
                      <YearlyTableRow key={data.year} data={data} index={index} />
                    ))}
                  </View>
                </View>
              )}
            </View>
          </AnimatedCard>

          {/* Target Explanation */}
          <AnimatedCard delay={400}>
            <View style={styles.targetExplanationContainer}>
              <Text style={styles.targetExplanationTitle}>🎯 How Your Target is Calculated</Text>
              <View style={styles.targetExplanationCard}>
                <Text style={styles.targetExplanationText}>
                  Your target value of <Text style={styles.targetHighlight}>{formatCurrency(getTargetValue())}</Text> represents what your portfolio should be worth after 1 year of following your current investment strategy:
                </Text>
                <View style={styles.targetBreakdown}>
                  <Text style={styles.targetBreakdownItem}>
                    • Monthly Investment: {formatCurrency(calculatorState.monthlyAmount)}
                  </Text>
                  <Text style={styles.targetBreakdownItem}>
                    • Expected Growth Rate: {getEffectiveCAGR()}
                  </Text>
                  <Text style={styles.targetBreakdownItem}>
                    • Strategy: {getStrategyText()}
                  </Text>
                  {calculatorState.startingAmount > 0 && (
                    <Text style={styles.targetBreakdownItem}>
                      • Starting Amount: {formatCurrency(calculatorState.startingAmount)}
                    </Text>
                  )}
                </View>
                <Text style={styles.targetNote}>
                  💡 This target updates automatically when you change your calculator settings, giving you a realistic 1-year milestone to track against.
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
  portfolioTrackingContainer: {
    marginBottom: 24,
    paddingVertical: 24,
  },
  portfolioTrackingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
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
  portfolioTrackingTitleContainer: {
    flex: 1,
  },
  portfolioTrackingTitle: {
    fontSize: 20,
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

  // Input Section Styles
  inputSection: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
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
    minHeight: 52,
  },
  portfolioInputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 100,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
    minHeight: 52,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginTop: 8,
  },

  // Portfolio Entries Styles
  portfolioEntriesContainer: {
    marginBottom: 16,
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
  mobilePortfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mobilePortfolioDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobilePortfolioDateText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
  },
  mobileDeleteButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  mobilePortfolioContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mobilePortfolioAmount: {
    flex: 1,
  },
  mobilePortfolioLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 4,
  },
  mobilePortfolioValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  mobilePortfolioVariance: {
    alignItems: 'flex-end',
  },
  mobileVarianceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  mobileVarianceText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  mobileVariancePercentage: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  mobilePortfolioTarget: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  mobileTargetLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },

  // Desktop Portfolio Table
  portfolioTableContainer: {
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
    minWidth: 140,
  },
  varianceColumn: {
    flex: 2,
    minWidth: 180,
  },
  actionColumn: {
    flex: 0.8,
    minWidth: 80,
  },
  portfolioDateText: {
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
  },
  portfolioAmountText: {
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    fontSize: 15,
  },
  portfolioVarianceCell: {
    alignItems: 'center',
  },
  varianceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  varianceText: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
  },
  variancePercentage: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },

  // Auth Notice
  authNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    gap: 8,
  },
  authNoticeText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
    flex: 1,
    lineHeight: 18,
  },

  // Summary Cards
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

  // Yearly Table Styles
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

  // Mobile Card Styles for Yearly Data
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

  // Desktop Table Styles for Yearly Data
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

  // Target Explanation Styles
  targetExplanationContainer: {
    paddingVertical: 24,
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  targetExplanationTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  targetExplanationCard: {
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.2)',
  },
  targetExplanationText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 12,
  },
  targetHighlight: {
    fontFamily: 'Inter-Bold',
    color: '#00D4AA',
  },
  targetBreakdown: {
    marginBottom: 12,
  },
  targetBreakdownItem: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#E2E8F0',
    lineHeight: 18,
    marginBottom: 4,
  },
  targetNote: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#00D4AA',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});