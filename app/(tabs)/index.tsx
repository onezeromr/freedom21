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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calculator, DollarSign, Calendar, TrendingUp, Save, Settings, ChevronDown, ChevronUp, Target, CirclePause as PauseCircle, Rocket, User, Sparkles } from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import GlassCard from '@/components/GlassCard';
import ModernSlider from '@/components/ModernSlider';
import LiveCAGRDisplay from '@/components/LiveCAGRDisplay';

const { width } = Dimensions.get('window');

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
  useRealisticCAGR?: boolean;
  useDecliningRates?: boolean;
  phase1Rate?: number;
  phase2Rate?: number;
  phase3Rate?: number;
  inflationRate?: number;
  useInflationAdjustment?: boolean;
}

const ASSET_OPTIONS = [
  { name: 'BTC', fullName: 'Bitcoin', defaultCAGR: 30, color: '#F7931A' },
  { name: 'SPX', fullName: 'S&P 500', defaultCAGR: 10, color: '#1E40AF' },
  { name: 'QQQ', fullName: 'Nasdaq 100', defaultCAGR: 12, color: '#059669' },
  { name: 'MSTR', fullName: 'MicroStrategy', defaultCAGR: 35, color: '#FF6B35' },
  { name: 'MTPLF', fullName: 'Metaplanet', defaultCAGR: 40, color: '#9333EA' },
  { name: 'Custom', fullName: 'Custom Asset', defaultCAGR: 15, color: '#8B5CF6' },
];

export default function CalculatorScreen() {
  const [startingAmount, setStartingAmount] = useState(0);
  const [monthlyAmount, setMonthlyAmount] = useState(500);
  const [years, setYears] = useState(20);
  const [currentAge, setCurrentAge] = useState<number | null>(null);
  const [btcHurdleRate, setBtcHurdleRate] = useState(30.0);
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [customCAGR, setCustomCAGR] = useState(30);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pauseAfterYears, setPauseAfterYears] = useState<number | null>(null);
  const [boostAfterYears, setBoostAfterYears] = useState<number | null>(null);
  const [boostAmount, setBoostAmount] = useState(1000);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioName, setScenarioName] = useState('');
  
  // Advanced strategy options
  const [useRealisticCAGR, setUseRealisticCAGR] = useState(false);
  const [useDecliningRates, setUseDecliningRates] = useState(false);
  const [phase1Rate, setPhase1Rate] = useState(30);
  const [phase2Rate, setPhase2Rate] = useState(20);
  const [phase3Rate, setPhase3Rate] = useState(15);
  const [inflationRate, setInflationRate] = useState(3);
  const [useInflationAdjustment, setUseInflationAdjustment] = useState(false);

  const isMobile = width < 768;

  useEffect(() => {
    // Load saved state from localStorage
    const savedState = localStorage.getItem('freedom21_calculator_state');
    if (savedState) {
      const state = JSON.parse(savedState);
      setStartingAmount(state.startingAmount || 0);
      setMonthlyAmount(state.monthlyAmount || 500);
      setYears(state.years || 20);
      setCurrentAge(state.currentAge || null);
      setBtcHurdleRate(state.btcHurdleRate || 30.0);
      setSelectedAsset(state.selectedAsset || 'BTC');
      setCustomCAGR(state.customCAGR || 30);
      setPauseAfterYears(state.pauseAfterYears || null);
      setBoostAfterYears(state.boostAfterYears || null);
      setBoostAmount(state.boostAmount || 1000);
      setUseRealisticCAGR(state.useRealisticCAGR || false);
      setUseDecliningRates(state.useDecliningRates || false);
      setPhase1Rate(state.phase1Rate || 30);
      setPhase2Rate(state.phase2Rate || 20);
      setPhase3Rate(state.phase3Rate || 15);
      setInflationRate(state.inflationRate || 3);
      setUseInflationAdjustment(state.useInflationAdjustment || false);
    }

    // Load saved scenarios
    const savedScenarios = localStorage.getItem('freedom21_scenarios');
    if (savedScenarios) {
      setScenarios(JSON.parse(savedScenarios));
    }
  }, []);

  useEffect(() => {
    // Save state to localStorage whenever it changes
    const state = {
      startingAmount,
      monthlyAmount,
      years,
      currentAge,
      btcHurdleRate,
      selectedAsset,
      customCAGR,
      pauseAfterYears,
      boostAfterYears,
      boostAmount,
      useRealisticCAGR,
      useDecliningRates,
      phase1Rate,
      phase2Rate,
      phase3Rate,
      inflationRate,
      useInflationAdjustment,
    };
    
    localStorage.setItem('freedom21_calculator_state', JSON.stringify(state));
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('calculatorStateUpdate', { detail: state }));
  }, [
    startingAmount, monthlyAmount, years, currentAge, btcHurdleRate, 
    selectedAsset, customCAGR, pauseAfterYears, boostAfterYears, boostAmount,
    useRealisticCAGR, useDecliningRates, phase1Rate, phase2Rate, phase3Rate,
    inflationRate, useInflationAdjustment
  ]);

  // Get the effective growth rate for a given year
  const getEffectiveGrowthRate = (year: number, baseRate: number): number => {
    let rate = baseRate;
    
    // Apply realistic CAGR reduction if enabled
    if (useRealisticCAGR) {
      rate = rate * 0.6; // 60% of optimistic rate
    }
    
    // Apply declining rates if enabled
    if (useDecliningRates) {
      if (year <= 10) {
        rate = phase1Rate;
      } else if (year <= 20) {
        rate = phase2Rate;
      } else {
        rate = phase3Rate;
      }
      
      // Still apply realistic reduction if both are enabled
      if (useRealisticCAGR) {
        rate = rate * 0.6;
      }
    }
    
    // Apply inflation adjustment if enabled
    if (useInflationAdjustment) {
      rate = rate - inflationRate;
    }
    
    return Math.max(0, rate); // Ensure rate doesn't go negative
  };

  // Calculate year-by-year progression for complex strategies with starting amount
  const calculateYearByYearProgression = (
    startingAmount: number,
    monthlyAmount: number,
    baseGrowthRate: number,
    targetYear: number,
    pauseAfterYears: number | null = null,
    boostAfterYears: number | null = null,
    boostAmount: number = 0
  ): number => {
    let totalValue = startingAmount; // Start with initial amount

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

      // Add this year's contributions
      const yearlyContrib = monthlyContrib * 12;

      // Grow previous value and add new contributions
      totalValue = totalValue * (1 + rate) + yearlyContrib;
    }

    return Math.max(0, Math.round(totalValue)); // Ensure never negative
  };

  const calculateFutureValue = () => {
    return calculateYearByYearProgression(
      startingAmount,
      monthlyAmount,
      customCAGR,
      years,
      pauseAfterYears,
      boostAfterYears,
      boostAmount
    );
  };

  const calculateBitcoinHurdleValue = () => {
    return calculateYearByYearProgression(
      startingAmount,
      monthlyAmount,
      btcHurdleRate,
      years,
      pauseAfterYears,
      boostAfterYears,
      boostAmount
    );
  };

  const handleAssetChange = (assetName: string) => {
    setSelectedAsset(assetName);
    const asset = ASSET_OPTIONS.find(a => a.name === assetName);
    if (asset) {
      setCustomCAGR(asset.defaultCAGR);
    }
  };

  const handleCAGRUpdate = (newCAGR: number) => {
    setCustomCAGR(newCAGR);
  };

  const saveScenario = () => {
    if (!scenarioName.trim()) {
      Alert.alert('Error', 'Please enter a scenario name');
      return;
    }

    const futureValue = calculateFutureValue();
    const btcHurdleValue = calculateBitcoinHurdleValue();
    const outperformance = futureValue - btcHurdleValue;
    const currentYear = new Date().getFullYear();
    const targetYear = currentYear + years;
    const futureAge = currentAge ? currentAge + years : null;

    const newScenario: Scenario = {
      id: Date.now().toString(),
      name: scenarioName,
      startingAmount,
      monthlyAmount,
      years,
      currentAge,
      btcHurdleRate,
      asset: selectedAsset,
      cagr: customCAGR,
      pauseAfterYears,
      boostAfterYears,
      boostAmount,
      futureValue,
      btcHurdleValue,
      outperformance,
      targetYear,
      futureAge,
      createdAt: new Date().toISOString(),
      useRealisticCAGR,
      useDecliningRates,
      phase1Rate,
      phase2Rate,
      phase3Rate,
      inflationRate,
      useInflationAdjustment,
    };

    const updatedScenarios = [...scenarios, newScenario];
    setScenarios(updatedScenarios);
    localStorage.setItem('freedom21_scenarios', JSON.stringify(updatedScenarios));
    setScenarioName('');
    
    Alert.alert('Success', `Scenario "${newScenario.name}" saved successfully!`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const futureValue = calculateFutureValue();
  const btcHurdleValue = calculateBitcoinHurdleValue();
  const outperformance = futureValue - btcHurdleValue;
  const currentYear = new Date().getFullYear();
  const targetYear = currentYear + years;
  const futureAge = currentAge ? currentAge + years : null;

  const getEffectiveCAGR = () => {
    if (useDecliningRates) {
      return `${phase1Rate}%→${phase2Rate}%→${phase3Rate}%`;
    }
    
    let rate = customCAGR;
    if (useRealisticCAGR) {
      rate = rate * 0.6;
    }
    if (useInflationAdjustment) {
      rate = rate - inflationRate;
    }
    
    return `${rate.toFixed(1)}%`;
  };

  const AssetCard = ({ asset, isSelected, onPress }: any) => (
    <TouchableOpacity
      style={[
        styles.assetCard,
        isSelected && styles.assetCardSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.assetIndicator, { backgroundColor: asset.color }]} />
      <View style={styles.assetInfo}>
        <Text style={[styles.assetName, isSelected && styles.assetNameSelected]}>
          {asset.name}
        </Text>
        <Text style={styles.assetFullName}>{asset.fullName}</Text>
      </View>
      <Text style={[styles.assetCAGR, isSelected && styles.assetCAGRSelected]}>
        {asset.defaultCAGR}%
      </Text>
    </TouchableOpacity>
  );

  const AdvancedToggle = ({ label, value, onValueChange, description }: any) => (
    <TouchableOpacity
      style={styles.advancedToggle}
      onPress={() => onValueChange(!value)}
      activeOpacity={0.8}
    >
      <View style={styles.toggleContent}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>{label}</Text>
          <Text style={styles.toggleDescription}>{description}</Text>
        </View>
        <View style={[styles.toggleSwitch, value && styles.toggleSwitchActive]}>
          <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0A0E1A', '#1E293B', '#0F172A']}
        style={styles.gradient}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <AnimatedCard delay={0}>
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Calculator size={32} color="#00D4AA" strokeWidth={2} />
              </View>
              <Text style={styles.title}>Wealth Calculator</Text>
              <Text style={styles.subtitle}>Build your financial future with smart investing</Text>
            </View>
          </AnimatedCard>

          {/* Starting Amount */}
          <AnimatedCard delay={100}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <DollarSign size={20} color="#00D4AA" />
                <Text style={styles.sectionTitle}>Starting Amount (Optional)</Text>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Initial Investment</Text>
                <TextInput
                  style={styles.textInput}
                  value={startingAmount === 0 ? '' : startingAmount.toString()}
                  onChangeText={(text) => {
                    const value = text === '' ? 0 : parseInt(text.replace(/[^0-9]/g, '')) || 0;
                    setStartingAmount(value);
                  }}
                  placeholder="$0"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                />
                <Text style={styles.inputHint}>
                  💡 Starting with a lump sum gives your money more time to compound
                </Text>
              </View>
            </GlassCard>
          </AnimatedCard>

          {/* Monthly Investment */}
          <AnimatedCard delay={200}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <Calendar size={20} color="#00D4AA" />
                <Text style={styles.sectionTitle}>Monthly Investment</Text>
              </View>
              <ModernSlider
                value={monthlyAmount}
                minimumValue={50}
                maximumValue={10000}
                step={50}
                onValueChange={setMonthlyAmount}
                formatValue={(val) => `$${val.toLocaleString()}`}
                color="#00D4AA"
              />
            </GlassCard>
          </AnimatedCard>

          {/* Current Age - Moved above Time Horizon */}
          <AnimatedCard delay={300}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <User size={20} color="#00D4AA" />
                <Text style={styles.sectionTitle}>Current Age (Optional)</Text>
              </View>
              <ModernSlider
                value={currentAge || 25}
                minimumValue={10}
                maximumValue={90}
                step={1}
                onValueChange={setCurrentAge}
                formatValue={(val) => currentAge ? `${val} years old` : 'Not set'}
                color="#00D4AA"
              />
              {futureAge && (
                <View style={styles.ageProjection}>
                  <Text style={styles.ageProjectionText}>
                    🎯 You'll be {futureAge} years old in {targetYear}
                  </Text>
                </View>
              )}
            </GlassCard>
          </AnimatedCard>

          {/* Time Horizon - Moved below Current Age */}
          <AnimatedCard delay={400}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <Calendar size={20} color="#00D4AA" />
                <Text style={styles.sectionTitle}>Time Horizon</Text>
              </View>
              <ModernSlider
                value={years}
                minimumValue={1}
                maximumValue={50}
                step={1}
                onValueChange={setYears}
                formatValue={(val) => `${val} years`}
                color="#00D4AA"
              />
            </GlassCard>
          </AnimatedCard>

          {/* Asset Selection - Updated to remove TSLA and NVDA */}
          <AnimatedCard delay={500}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={20} color="#00D4AA" />
                <Text style={styles.sectionTitle}>Investment Asset</Text>
              </View>
              <View style={styles.assetsGrid}>
                {ASSET_OPTIONS.map((asset) => (
                  <AssetCard
                    key={asset.name}
                    asset={asset}
                    isSelected={selectedAsset === asset.name}
                    onPress={() => handleAssetChange(asset.name)}
                  />
                ))}
              </View>
            </GlassCard>
          </AnimatedCard>

          {/* Live CAGR Display */}
          {selectedAsset !== 'Custom' && (
            <AnimatedCard delay={600}>
              <LiveCAGRDisplay
                assetName={selectedAsset}
                onCAGRUpdate={handleCAGRUpdate}
                defaultCAGR={customCAGR}
              />
            </AnimatedCard>
          )}

          {/* Custom CAGR */}
          <AnimatedCard delay={700}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <Target size={20} color="#00D4AA" />
                <Text style={styles.sectionTitle}>Expected Annual Growth (CAGR)</Text>
              </View>
              <ModernSlider
                value={customCAGR}
                minimumValue={1}
                maximumValue={50}
                step={0.5}
                onValueChange={setCustomCAGR}
                formatValue={(val) => `${val}%`}
                color="#00D4AA"
              />
              <Text style={styles.cagrNote}>
                💡 Current setting: {getEffectiveCAGR()} effective growth rate
              </Text>
            </GlassCard>
          </AnimatedCard>

          {/* Bitcoin Hurdle Rate */}
          <AnimatedCard delay={800}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={20} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Bitcoin Hurdle Rate</Text>
              </View>
              <ModernSlider
                value={btcHurdleRate}
                minimumValue={5}
                maximumValue={50}
                step={0.5}
                onValueChange={setBtcHurdleRate}
                formatValue={(val) => `${val}%`}
                color="#F59E0B"
              />
              <Text style={styles.hurdleNote}>
                📊 Benchmark to compare your investment performance against Bitcoin
              </Text>
            </GlassCard>
          </AnimatedCard>

          {/* Advanced Strategy */}
          <AnimatedCard delay={900}>
            <GlassCard style={styles.section}>
              <TouchableOpacity
                style={styles.advancedHeader}
                onPress={() => setShowAdvanced(!showAdvanced)}
                activeOpacity={0.8}
              >
                <View style={styles.advancedHeaderLeft}>
                  <Settings size={20} color="#8B5CF6" />
                  <Text style={styles.advancedTitle}>Advanced Strategy</Text>
                </View>
                <View style={styles.advancedHeaderRight}>
                  <Text style={styles.advancedSubtitle}>
                    {showAdvanced ? 'Hide Options' : 'Show Options'}
                  </Text>
                  {showAdvanced ? (
                    <ChevronUp size={isMobile ? 28 : 32} color="#8B5CF6" strokeWidth={2.5} />
                  ) : (
                    <ChevronDown size={isMobile ? 28 : 32} color="#8B5CF6" strokeWidth={2.5} />
                  )}
                </View>
              </TouchableOpacity>

              {showAdvanced && (
                <View style={styles.advancedContent}>
                  {/* Realistic CAGR Toggle */}
                  <AdvancedToggle
                    label="Conservative CAGR"
                    value={useRealisticCAGR}
                    onValueChange={setUseRealisticCAGR}
                    description="Use 60% of optimistic growth rates for more realistic projections"
                  />

                  {/* Declining Rates Toggle */}
                  <AdvancedToggle
                    label="Declining Growth Rates"
                    value={useDecliningRates}
                    onValueChange={setUseDecliningRates}
                    description="Model how high-growth assets typically mature over time"
                  />

                  {/* Declining Rates Configuration */}
                  {useDecliningRates && (
                    <View style={styles.decliningRatesConfig}>
                      <Text style={styles.configTitle}>Growth Rate Phases</Text>
                      
                      <View style={styles.phaseConfig}>
                        <Text style={styles.phaseLabel}>Phase 1 (Years 1-10)</Text>
                        <ModernSlider
                          value={phase1Rate}
                          minimumValue={5}
                          maximumValue={50}
                          step={1}
                          onValueChange={setPhase1Rate}
                          formatValue={(val) => `${val}%`}
                          color="#00D4AA"
                        />
                      </View>

                      <View style={styles.phaseConfig}>
                        <Text style={styles.phaseLabel}>Phase 2 (Years 11-20)</Text>
                        <ModernSlider
                          value={phase2Rate}
                          minimumValue={5}
                          maximumValue={40}
                          step={1}
                          onValueChange={setPhase2Rate}
                          formatValue={(val) => `${val}%`}
                          color="#FB923C"
                        />
                      </View>

                      <View style={styles.phaseConfig}>
                        <Text style={styles.phaseLabel}>Phase 3 (Years 21+)</Text>
                        <ModernSlider
                          value={phase3Rate}
                          minimumValue={5}
                          maximumValue={30}
                          step={1}
                          onValueChange={setPhase3Rate}
                          formatValue={(val) => `${val}%`}
                          color="#EF4444"
                        />
                      </View>
                    </View>
                  )}

                  {/* Inflation Adjustment Toggle */}
                  <AdvancedToggle
                    label="Inflation Adjustment"
                    value={useInflationAdjustment}
                    onValueChange={setUseInflationAdjustment}
                    description="Subtract inflation to show real purchasing power growth"
                  />

                  {/* Inflation Rate Configuration */}
                  {useInflationAdjustment && (
                    <View style={styles.inflationConfig}>
                      <Text style={styles.configTitle}>Annual Inflation Rate</Text>
                      <ModernSlider
                        value={inflationRate}
                        minimumValue={0}
                        maximumValue={10}
                        step={0.1}
                        onValueChange={setInflationRate}
                        formatValue={(val) => `${val}%`}
                        color="#F59E0B"
                      />
                    </View>
                  )}

                  {/* Pause Savings Strategy */}
                  <View style={styles.strategySection}>
                    <View style={styles.strategyHeader}>
                      <PauseCircle size={20} color="#FB923C" />
                      <Text style={styles.strategyTitle}>Pause Savings Strategy</Text>
                    </View>
                    <Text style={styles.strategyDescription}>
                      Stop monthly contributions after a certain number of years and let compound interest work
                    </Text>
                    <ModernSlider
                      value={pauseAfterYears || 0}
                      minimumValue={0}
                      maximumValue={years - 1}
                      step={1}
                      onValueChange={(value) => {
                        setPauseAfterYears(value === 0 ? null : value);
                        if (value > 0) setBoostAfterYears(null); // Clear boost if pause is set
                      }}
                      formatValue={(val) => val === 0 ? 'Disabled' : `Pause after ${val} years`}
                      color="#FB923C"
                    />
                  </View>

                  {/* Boost Savings Strategy */}
                  <View style={styles.strategySection}>
                    <View style={styles.strategyHeader}>
                      <Rocket size={20} color="#8B5CF6" />
                      <Text style={styles.strategyTitle}>Boost Savings Strategy</Text>
                    </View>
                    <Text style={styles.strategyDescription}>
                      Increase monthly contributions after a certain number of years
                    </Text>
                    <ModernSlider
                      value={boostAfterYears || 0}
                      minimumValue={0}
                      maximumValue={years - 1}
                      step={1}
                      onValueChange={(value) => {
                        setBoostAfterYears(value === 0 ? null : value);
                        if (value > 0) setPauseAfterYears(null); // Clear pause if boost is set
                      }}
                      formatValue={(val) => val === 0 ? 'Disabled' : `Boost after ${val} years`}
                      color="#8B5CF6"
                    />
                    
                    {boostAfterYears && (
                      <View style={styles.boostAmountContainer}>
                        <Text style={styles.boostAmountLabel}>New Monthly Amount</Text>
                        <ModernSlider
                          value={boostAmount}
                          minimumValue={monthlyAmount}
                          maximumValue={10000}
                          step={100}
                          onValueChange={setBoostAmount}
                          formatValue={(val) => `$${val.toLocaleString()}`}
                          color="#8B5CF6"
                        />
                      </View>
                    )}
                  </View>
                </View>
              )}
            </GlassCard>
          </AnimatedCard>

          {/* Results */}
          <AnimatedCard delay={1000}>
            <View style={styles.resultsContainer}>
              {/* Main Result Card */}
              <LinearGradient
                colors={['#00D4AA', '#00A887']}
                style={styles.resultCard}
              >
                <TrendingUp size={32} color="#FFFFFF" style={styles.resultIcon} />
                <Text style={styles.resultTitle}>Portfolio Value</Text>
                <Text style={styles.resultValue}>{formatCurrency(futureValue)}</Text>
                <View style={styles.resultDetails}>
                  <Text style={styles.resultYear}>Year {targetYear}</Text>
                  {futureAge && <Text style={styles.resultAge}>Age {futureAge}</Text>}
                </View>
              </LinearGradient>

              {/* Comparison Cards */}
              <View style={styles.comparisonCards}>
                <View style={styles.comparisonCard}>
                  <Text style={styles.comparisonLabel}>Bitcoin Hurdle</Text>
                  <Text style={styles.comparisonValue}>
                    {formatCurrency(btcHurdleValue)}
                  </Text>
                  <Text style={styles.comparisonRate}>{btcHurdleRate}% CAGR</Text>
                </View>

                <View style={styles.comparisonCard}>
                  <Text style={styles.comparisonLabel}>Outperformance</Text>
                  <Text style={[
                    styles.comparisonValue,
                    { color: outperformance >= 0 ? '#00D4AA' : '#EF4444' }
                  ]}>
                    {outperformance >= 0 ? '+' : ''}{formatCurrency(outperformance)}
                  </Text>
                  <Text style={styles.comparisonRate}>
                    {outperformance >= 0 ? 'Above' : 'Below'} Bitcoin
                  </Text>
                </View>
              </View>
            </View>
          </AnimatedCard>

          {/* Save Scenario - Improved Mobile Layout */}
          <AnimatedCard delay={1100}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <Save size={20} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>Save Scenario</Text>
              </View>
              
              {/* Improved mobile-optimized layout */}
              <View style={styles.saveContainer}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.saveInputLabel}>Scenario Name</Text>
                  <TextInput
                    style={styles.scenarioInput}
                    value={scenarioName}
                    onChangeText={setScenarioName}
                    placeholder="Enter scenario name..."
                    placeholderTextColor="#64748B"
                  />
                </View>
                
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={saveScenario}
                  activeOpacity={0.8}
                >
                  <Sparkles size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.saveNote}>
                💾 Save different strategies to compare in the Scenarios tab
              </Text>
            </GlassCard>
          </AnimatedCard>
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
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 12,
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
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#00D4AA',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  ageProjection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  ageProjectionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
  },
  assetsGrid: {
    gap: 12,
  },
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  assetCardSelected: {
    borderColor: '#00D4AA',
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
  },
  assetIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  assetNameSelected: {
    color: '#00D4AA',
  },
  assetFullName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  assetCAGR: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#94A3B8',
  },
  assetCAGRSelected: {
    color: '#00D4AA',
  },
  cagrNote: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#00D4AA',
    textAlign: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  hurdleNote: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
    textAlign: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  advancedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  advancedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  advancedHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  advancedTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    marginLeft: 12,
  },
  advancedSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  advancedContent: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  advancedToggle: {
    marginBottom: 20,
  },
  toggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    lineHeight: 20,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#00D4AA',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  decliningRatesConfig: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 20,
  },
  configTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  phaseConfig: {
    marginBottom: 16,
  },
  phaseLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
    marginBottom: 8,
  },
  inflationConfig: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 20,
  },
  strategySection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  strategyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  strategyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  strategyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 20,
  },
  boostAmountContainer: {
    marginTop: 16,
  },
  boostAmountLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
    marginBottom: 8,
  },
  resultsContainer: {
    marginBottom: 24,
  },
  resultCard: {
    borderRadius: 24,
    padding: 32,
    marginBottom: 20,
    alignItems: 'center',
  },
  resultIcon: {
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  resultDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  resultYear: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resultAge: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  comparisonCards: {
    flexDirection: 'row',
    gap: 12,
  },
  comparisonCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  comparisonLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 8,
  },
  comparisonValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#F59E0B',
    marginBottom: 4,
    textAlign: 'center',
  },
  comparisonRate: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  // Improved Save Scenario Layout - Clean and spacious
  saveContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  saveInputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  scenarioInput: {
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    minHeight: 52,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  saveNote: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    textAlign: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: 12,
    borderRadius: 8,
    lineHeight: 16,
  },
});