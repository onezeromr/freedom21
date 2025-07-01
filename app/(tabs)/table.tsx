import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Table, Calendar, DollarSign, TrendingUp, Save, Plus, TrendingDown, Target } from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import GlassCard from '@/components/GlassCard';

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
  timestamp: number;
}

export default function TableScreen() {
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
  const [actualAmount, setActualAmount] = useState('');
  const [inputError, setInputError] = useState('');

  const isMobile = screenWidth < 768;

  useEffect(() => {
    // Load calculator state from localStorage and listen for changes
    const loadCalculatorState = () => {
      const savedState = localStorage.getItem('freedom21_calculator_state');
      if (savedState) {
        setCalculatorState(JSON.parse(savedState));
      }
    };

    // Load portfolio entries from localStorage
    const loadPortfolioEntries = () => {
      const savedEntries = localStorage.getItem('freedom21_portfolio_entries');
      if (savedEntries) {
        setPortfolioEntries(JSON.parse(savedEntries));
      } else {
        // Add sample entries to demonstrate functionality
        const sampleEntries: PortfolioEntry[] = [
          {
            id: 'sample-1',
            date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            amount: 22000,
            timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000,
          },
          {
            id: 'sample-2',
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            amount: 25500,
            timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000,
          },
        ];
        setPortfolioEntries(sampleEntries);
        localStorage.setItem('freedom21_portfolio_entries', JSON.stringify(sampleEntries));
      }
    };

    // Load initial state
    loadCalculatorState();
    loadPortfolioEntries();

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

  const validateInput = (value: string): boolean => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setInputError('Please enter a valid amount');
      return false;
    }
    setInputError('');
    return true;
  };

  const savePortfolioEntry = () => {
    if (!validateInput(actualAmount)) {
      return;
    }

    const newEntry: PortfolioEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString(),
      amount: parseFloat(actualAmount),
      timestamp: Date.now(),
    };

    const updatedEntries = [...portfolioEntries, newEntry].sort((a, b) => b.timestamp - a.timestamp);
    setPortfolioEntries(updatedEntries);
    localStorage.setItem('freedom21_portfolio_entries', JSON.stringify(updatedEntries));
    setActualAmount('');
    
    Alert.alert('Success', 'Portfolio amount saved successfully!');
  };

  const getCurrentTargetValue = (entryTimestamp: number): number => {
    // Calculate how many months have passed since the calculator's start date
    const startDate = new Date(2024, 0, 1); // Assume start of 2024 as baseline
    const entryDate = new Date(entryTimestamp);
    const monthsElapsed = Math.max(0, Math.floor((entryDate.getTime() - startDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
    const yearsElapsed = monthsElapsed / 12;
    
    if (yearsElapsed <= 0) return calculatorState.startingAmount;
    
    const result = calculateYearByYearProgression(
      calculatorState.startingAmount,
      calculatorState.monthlyAmount,
      calculatorState.customCAGR,
      Math.ceil(yearsElapsed),
      calculatorState.pauseAfterYears,
      calculatorState.boostAfterYears,
      calculatorState.boostAmount
    );
    
    return result.value;
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

  // Mobile Card View Component
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

  // Portfolio Tracking Table Components
  const PortfolioTrackingHeader = () => (
    <View style={styles.portfolioTableHeader}>
      <Text style={[styles.portfolioHeaderCell, styles.dateColumn]}>Date</Text>
      <Text style={[styles.portfolioHeaderCell, styles.amountColumn]}>Portfolio Amount</Text>
      <Text style={[styles.portfolioHeaderCell, styles.varianceColumn]}>Variance vs Target</Text>
    </View>
  );

  const PortfolioTrackingRow = ({ entry, index }: { entry: PortfolioEntry; index: number }) => {
    const targetValue = getCurrentTargetValue(entry.timestamp);
    const variance = entry.amount - targetValue;
    const variancePercentage = targetValue > 0 ? (variance / targetValue) * 100 : 0;
    
    return (
      <View style={[styles.portfolioTableRow, index % 2 === 0 && styles.portfolioTableRowEven]}>
        <Text style={[styles.portfolioCell, styles.dateColumn, styles.dateText]}>{entry.date}</Text>
        <Text style={[styles.portfolioCell, styles.amountColumn, styles.amountText]}>
          {formatCurrency(entry.amount)}
        </Text>
        <View style={[styles.portfolioCell, styles.varianceColumn, styles.varianceContainer]}>
          {variance >= 0 ? (
            <TrendingUp size={16} color="#00D4AA" />
          ) : (
            <TrendingDown size={16} color="#EF4444" />
          )}
          <View style={styles.varianceTextContainer}>
            <Text style={[
              styles.varianceText,
              { color: variance >= 0 ? '#00D4AA' : '#EF4444' }
            ]}>
              {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
            </Text>
            <Text style={[
              styles.variancePercentage,
              { color: variance >= 0 ? '#00D4AA' : '#EF4444' }
            ]}>
              ({variancePercentage >= 0 ? '+' : ''}{variancePercentage.toFixed(1)}%)
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Mobile Portfolio Card
  const MobilePortfolioCard = ({ entry, index }: { entry: PortfolioEntry; index: number }) => {
    const targetValue = getCurrentTargetValue(entry.timestamp);
    const variance = entry.amount - targetValue;
    const variancePercentage = targetValue > 0 ? (variance / targetValue) * 100 : 0;
    
    return (
      <View style={[styles.mobilePortfolioCard, index % 2 === 0 && styles.mobilePortfolioCardEven]}>
        <View style={styles.mobilePortfolioHeader}>
          <Text style={styles.mobilePortfolioDate}>{entry.date}</Text>
          <Text style={styles.mobilePortfolioAmount}>{formatCurrency(entry.amount)}</Text>
        </View>
        <View style={styles.mobilePortfolioVariance}>
          {variance >= 0 ? (
            <TrendingUp size={16} color="#00D4AA" />
          ) : (
            <TrendingDown size={16} color="#EF4444" />
          )}
          <Text style={[
            styles.mobileVarianceText,
            { color: variance >= 0 ? '#00D4AA' : '#EF4444' }
          ]}>
            {variance >= 0 ? '+' : ''}{formatCurrency(variance)} ({variancePercentage >= 0 ? '+' : ''}{variancePercentage.toFixed(1)}%)
          </Text>
        </View>
        <View style={styles.mobileTargetInfo}>
          <Target size={14} color="#94A3B8" />
          <Text style={styles.mobileTargetText}>Target: {formatCurrency(targetValue)}</Text>
        </View>
      </View>
    );
  };

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
          <AnimatedCard delay={50}>
            <View style={styles.portfolioTrackingContainer}>
              <Text style={styles.portfolioTrackingTitle}>📊 Portfolio Tracking</Text>
              <Text style={styles.portfolioTrackingDescription}>
                Track your actual portfolio value over time and see how you're performing against your target projections
              </Text>
              
              {/* Input Section */}
              <View style={styles.inputSection}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Actual Portfolio Amount</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={[styles.portfolioInput, inputError ? styles.portfolioInputError : null]}
                      value={actualAmount}
                      onChangeText={(text) => {
                        setActualAmount(text);
                        if (inputError) setInputError('');
                      }}
                      placeholder="Enter current portfolio value"
                      placeholderTextColor="#64748B"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={savePortfolioEntry}
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
                  {inputError ? (
                    <Text style={styles.errorText}>{inputError}</Text>
                  ) : null}
                </View>
              </View>

              {/* Portfolio Tracking Table */}
              <View style={styles.portfolioTableContainer}>
                {portfolioEntries.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Save size={48} color="#64748B" />
                    <Text style={styles.emptyStateTitle}>No Portfolio Entries Yet</Text>
                    <Text style={styles.emptyStateText}>
                      Start tracking your actual portfolio value to see how you're performing against your target projections.
                    </Text>
                  </View>
                ) : (
                  <>
                    {isMobile ? (
                      // Mobile Card View
                      <View style={styles.mobilePortfolioContainer}>
                        {portfolioEntries.map((entry, index) => (
                          <MobilePortfolioCard key={entry.id} entry={entry} index={index} />
                        ))}
                      </View>
                    ) : (
                      // Desktop Table View
                      <View style={styles.portfolioTableScrollView}>
                        <View style={styles.portfolioTable}>
                          <PortfolioTrackingHeader />
                          {portfolioEntries.map((entry, index) => (
                            <PortfolioTrackingRow key={entry.id} entry={entry} index={index} />
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          </AnimatedCard>

          {/* Summary Cards */}
          <AnimatedCard delay={100}>
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
          <AnimatedCard delay={200}>
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
          <AnimatedCard delay={300}>
            <View style={styles.analysisContainer}>
              <Text style={styles.analysisTitle}>Understanding Your Portfolio Growth</Text>
              
              {calculatorState.startingAmount > 0 && (
                <View style={styles.phaseCard}>
                  <Text style={styles.phaseTitle}>💰 Starting Amount Advantage</Text>
                  <Text style={styles.phaseText}>
                    Your {formatCurrency(calculatorState.startingAmount)} starting amount gets the full {calculatorState.years} years to compound and grow. This head start can make a massive difference in your final wealth!
                  </Text>
                </View>
              )}

              <View style={styles.phaseCard}>
                <Text style={styles.phaseTitle}>📊 Portfolio Tracking Benefits</Text>
                <Text style={styles.phaseText}>
                  Track your actual portfolio value to see if you're ahead or behind your target projections. The variance column shows how much you're outperforming or underperforming your calculated strategy. Green indicates you're ahead of target, red means you're behind.
                </Text>
              </View>
              
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
          <AnimatedCard delay={400}>
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
  portfolioTrackingContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  portfolioTrackingTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  portfolioTrackingDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
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
    minHeight: 52,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
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

  // Portfolio Table Styles
  portfolioTableContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 200,
  },
  portfolioTableScrollView: {
    width: '100%',
  },
  portfolioTable: {
    width: '100%',
  },
  portfolioTableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  portfolioHeaderCell: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
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
    minWidth: 160,
  },
  dateText: {
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
  },
  amountText: {
    fontFamily: 'Inter-Bold',
    color: '#00D4AA',
    fontSize: 15,
  },
  varianceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  varianceTextContainer: {
    alignItems: 'center',
  },
  varianceText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  variancePercentage: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },

  // Mobile Portfolio Card Styles
  mobilePortfolioContainer: {
    gap: 12,
    padding: 16,
  },
  mobilePortfolioCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mobilePortfolioCardEven: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  mobilePortfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mobilePortfolioDate: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
  },
  mobilePortfolioAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#00D4AA',
  },
  mobilePortfolioVariance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  mobileVarianceText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  mobileTargetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mobileTargetText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    textAlign: 'center',
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