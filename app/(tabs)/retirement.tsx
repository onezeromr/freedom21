import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PiggyBank, DollarSign, TrendingUp, Calendar, Info, Save, ChevronDown, X } from 'lucide-react-native';
import AnimatedCard from '@/components/AnimatedCard';
import GlassCard from '@/components/GlassCard';
import ModernSlider from '@/components/ModernSlider';
import { usePortfolioSync } from '@/hooks/usePortfolioSync';

const { width } = Dimensions.get('window');

interface RetirementETF {
  symbol: string;
  name: string;
  annualYield: number;
  monthlyYield: number;
  description: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  tooltip: string;
}

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
  futureValue: number;
  btcHurdleValue: number;
  outperformance: number;
  targetYear: number;
  futureAge?: number | null;
  createdAt: string;
}

const RETIREMENT_ETFS: RetirementETF[] = [
  {
    symbol: 'STRF',
    name: 'Strife Income ETF',
    annualYield: 10.00,
    monthlyYield: 10.00 / 12,
    description: 'STRF offers a solid start and has the ability to grow over time!',
    riskLevel: 'Medium',
    tooltip: 'STRF offers a solid start and has the ability to grow over time! Perfect for building wealth while enjoying steady income along the way!'
  },
  {
    symbol: 'STRK',
    name: 'Strike Income ETF',
    annualYield: 8.00,
    monthlyYield: 8.00 / 12,
    description: 'STRK starts at a steady pace and has the ability to grow over time!',
    riskLevel: 'Low',
    tooltip: 'STRK starts at a steady pace and has the ability to grow over time! Great for those who want reliable income with growth potential!'
  }
];

export default function RetirementScreen() {
  const { portfolioState } = usePortfolioSync();
  const [portfolioValue, setPortfolioValue] = useState(500000);
  const [selectedETF, setSelectedETF] = useState(RETIREMENT_ETFS[0]);
  const [withdrawalStrategy, setWithdrawalStrategy] = useState<'reinvest' | 'withdraw'>('withdraw');
  const [years, setYears] = useState(20);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [dataSource, setDataSource] = useState<'manual' | 'calculator' | 'scenario'>('manual');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [calculations, setCalculations] = useState({
    monthlyIncome: 0,
    annualIncome: 0,
    totalIncomeReceived: 0,
    portfolioValueAfterYears: 0,
    realIncomePercentage: 0,
  });
  const mounted = useRef(true);

  const isMobile = width < 768;

  useEffect(() => {
    mounted.current = true;
    
    // Load scenarios from localStorage
    const loadData = () => {
      if (!mounted.current) return;
      
      const savedScenarios = localStorage.getItem('freedom21_scenarios');
      if (savedScenarios && mounted.current) {
        setScenarios(JSON.parse(savedScenarios));
      }
    };

    loadData();

    return () => {
      mounted.current = false;
    };
  }, []);

  // Set portfolio value from calculator state when it loads
  useEffect(() => {
    if (portfolioState && dataSource === 'manual') {
      setPortfolioValue(portfolioState.futureValue);
      setDataSource('calculator');
    }
  }, [portfolioState]);

  useEffect(() => {
    if (mounted.current) {
      calculateRetirementProjections();
    }
  }, [portfolioValue, selectedETF, withdrawalStrategy, years]);

  const calculateRetirementProjections = () => {
    if (!mounted.current) return;
    
    const monthlyIncome = (portfolioValue * selectedETF.monthlyYield) / 100;
    const annualIncome = portfolioValue * (selectedETF.annualYield / 100);
    
    // Simplified calculation for user-friendly experience
    let portfolioValueAfterYears = portfolioValue;
    let totalIncomeReceived = 0;
    
    if (withdrawalStrategy === 'withdraw') {
      // Calculate total income over the years
      totalIncomeReceived = annualIncome * years;
      // Assume portfolio maintains value with growth offsetting distributions
      portfolioValueAfterYears = portfolioValue * Math.pow(1.02, years); // 2% net growth assumption
    } else {
      // If reinvesting, calculate compound growth
      const netGrowthRate = selectedETF.annualYield / 100;
      portfolioValueAfterYears = portfolioValue * Math.pow(1 + netGrowthRate, years);
      totalIncomeReceived = 0; // No income received if reinvesting
    }

    const realIncomePercentage = 100; // Simplified for user experience

    if (mounted.current) {
      setCalculations({
        monthlyIncome,
        annualIncome,
        totalIncomeReceived,
        portfolioValueAfterYears: Math.max(0, portfolioValueAfterYears),
        realIncomePercentage,
      });
    }
  };

  const handleScenarioSelection = (scenario: Scenario) => {
    if (!mounted.current) return;
    
    setPortfolioValue(scenario.futureValue);
    setSelectedScenario(scenario);
    setDataSource('scenario');
    setShowScenarioModal(false);
  };

  const switchToCalculator = () => {
    if (!mounted.current || !portfolioState) return;
    
    setPortfolioValue(portfolioState.futureValue);
    setDataSource('calculator');
    setSelectedScenario(null);
  };

  const switchToManual = () => {
    if (!mounted.current) return;
    
    setDataSource('manual');
    setSelectedScenario(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return '#00D4AA';
      case 'Medium': return '#FB923C';
      case 'High': return '#EF4444';
      default: return '#94A3B8';
    }
  };

  const getDataSourceLabel = () => {
    switch (dataSource) {
      case 'calculator':
        return portfolioState ? `Calculator: ${portfolioState.selectedAsset} (${portfolioState.customCAGR}%)` : 'Calculator';
      case 'scenario':
        return selectedScenario ? `Scenario: ${selectedScenario.name}` : 'Saved Scenario';
      default:
        return 'Manual Entry';
    }
  };

  const renderScenarioItem = ({ item }: { item: Scenario }) => (
    <TouchableOpacity
      style={styles.scenarioItem}
      onPress={() => handleScenarioSelection(item)}
      activeOpacity={0.7}
    >
      <GlassCard style={styles.scenarioCard}>
        <View style={styles.scenarioInfo}>
          <Text style={styles.scenarioName}>{item.name}</Text>
          <Text style={styles.scenarioDetails}>
            {item.startingAmount > 0 && `${formatCurrency(item.startingAmount)} start + `}
            ${item.monthlyAmount}/mo • {item.years}Y • {item.asset} ({item.cagr}%)
          </Text>
          <Text style={styles.scenarioMeta}>
            Future Value: {formatCurrency(item.futureValue)}
          </Text>
        </View>
        <View style={styles.scenarioValue}>
          <Text style={styles.scenarioValueText}>{formatCurrency(item.futureValue)}</Text>
          <Text style={styles.scenarioValueLabel}>Portfolio Value</Text>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

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
                <PiggyBank size={32} color="#00D4AA" strokeWidth={2} />
              </View>
              <Text style={styles.title}>Retirement Income</Text>
              <Text style={styles.subtitle}>Turn Your Wealth Into Monthly Income!</Text>
              <Text style={styles.encouragingText}>
                🎯 Transform your savings into steady income for your golden years!
              </Text>
            </View>
          </AnimatedCard>

          {/* Data Source Selector */}
          <AnimatedCard delay={100}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <Info size={20} color="#00D4AA" />
                <Text style={styles.sectionTitle}>Portfolio Value Source</Text>
              </View>
              
              <View style={[styles.sourceSelector, isMobile && styles.sourceSelectorMobile]}>
                {portfolioState && (
                  <TouchableOpacity
                    style={[
                      styles.sourceButton, 
                      isMobile && styles.sourceButtonMobile,
                      dataSource === 'calculator' && styles.sourceButtonActive
                    ]}
                    onPress={switchToCalculator}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.sourceButtonText, 
                      isMobile && styles.sourceButtonTextMobile,
                      dataSource === 'calculator' && styles.sourceButtonTextActive
                    ]}>
                      Calculator
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.sourceButton, 
                    isMobile && styles.sourceButtonMobile,
                    dataSource === 'scenario' && styles.sourceButtonActive
                  ]}
                  onPress={() => setShowScenarioModal(true)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.sourceButtonContent, isMobile && styles.sourceButtonContentMobile]}>
                    <Save size={isMobile ? 14 : 16} color={dataSource === 'scenario' ? '#FFFFFF' : '#94A3B8'} />
                    <Text style={[
                      styles.sourceButtonText, 
                      isMobile && styles.sourceButtonTextMobile,
                      dataSource === 'scenario' && styles.sourceButtonTextActive
                    ]}>
                      Scenarios
                    </Text>
                    <ChevronDown size={isMobile ? 14 : 16} color={dataSource === 'scenario' ? '#FFFFFF' : '#94A3B8'} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sourceButton, 
                    isMobile && styles.sourceButtonMobile,
                    dataSource === 'manual' && styles.sourceButtonActive
                  ]}
                  onPress={switchToManual}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.sourceButtonText, 
                    isMobile && styles.sourceButtonTextMobile,
                    dataSource === 'manual' && styles.sourceButtonTextActive
                  ]}>
                    Manual
                  </Text>
                </TouchableOpacity>
              </View>
              
              {dataSource !== 'manual' && (
                <View style={styles.sourceIndicator}>
                  <Text style={[styles.sourceIndicatorText, isMobile && styles.sourceIndicatorTextMobile]}>
                    Using: {getDataSourceLabel()}
                  </Text>
                </View>
              )}
            </GlassCard>
          </AnimatedCard>

          {/* Portfolio Value Slider */}
          <AnimatedCard delay={200}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <DollarSign size={20} color="#00D4AA" />
                <Text style={styles.sectionTitle}>Portfolio Value</Text>
              </View>
              <ModernSlider
                value={portfolioValue}
                minimumValue={50000}
                maximumValue={2000000}
                step={25000}
                onValueChange={(value) => {
                  if (!mounted.current) return;
                  setPortfolioValue(value);
                  if (dataSource !== 'manual') {
                    setDataSource('manual');
                    setSelectedScenario(null);
                  }
                }}
                formatValue={(val) => formatCurrency(val)}
                color="#00D4AA"
              />
            </GlassCard>
          </AnimatedCard>

          {/* ETF Selection */}
          <AnimatedCard delay={300}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={20} color="#00D4AA" />
                <Text style={styles.sectionTitle}>Select Income ETF</Text>
              </View>
              <View style={styles.etfContainer}>
                {RETIREMENT_ETFS.map((etf) => (
                  <TouchableOpacity
                    key={etf.symbol}
                    style={[
                      styles.etfCard,
                      selectedETF.symbol === etf.symbol && styles.etfCardSelected
                    ]}
                    onPress={() => mounted.current && setSelectedETF(etf)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.etfHeader}>
                      <View>
                        <Text style={styles.etfSymbol}>{etf.symbol}</Text>
                        <Text style={styles.etfName}>{etf.name}</Text>
                      </View>
                      <View style={styles.etfYield}>
                        <Text style={styles.etfYieldText}>{formatPercentage(etf.annualYield)}</Text>
                        <Text style={styles.etfYieldLabel}>Annual Income</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.etfDescription}>{etf.description}</Text>
                    
                    <View style={styles.etfMetrics}>
                      <View style={styles.etfMetric}>
                        <Text style={styles.etfMetricLabel}>Risk Level</Text>
                        <Text style={[styles.etfMetricValue, { color: getRiskColor(etf.riskLevel) }]}>
                          {etf.riskLevel}
                        </Text>
                      </View>
                      <View style={styles.etfMetric}>
                        <Text style={styles.etfMetricLabel}>Monthly Pay</Text>
                        <Text style={styles.etfMetricValue}>Yes</Text>
                      </View>
                    </View>

                    <View style={styles.etfTooltipContainer}>
                      <Info size={14} color="#64748B" />
                      <Text style={styles.etfTooltipText}>{etf.tooltip}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </GlassCard>
          </AnimatedCard>

          {/* Income Strategy */}
          <AnimatedCard delay={400}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <Calendar size={20} color="#00D4AA" />
                <Text style={styles.sectionTitle}>Income Strategy</Text>
              </View>
              <View style={styles.strategyContainer}>
                <TouchableOpacity
                  style={[
                    styles.strategyButton,
                    withdrawalStrategy === 'withdraw' && styles.strategyButtonActive
                  ]}
                  onPress={() => mounted.current && setWithdrawalStrategy('withdraw')}
                  activeOpacity={0.7}
                >
                  <DollarSign size={24} color={withdrawalStrategy === 'withdraw' ? '#FFFFFF' : '#94A3B8'} />
                  <Text style={[
                    styles.strategyButtonText,
                    withdrawalStrategy === 'withdraw' && styles.strategyButtonTextActive
                  ]}>
                    Take Monthly Income
                  </Text>
                  <Text style={[
                    styles.strategyButtonSubtext,
                    withdrawalStrategy === 'withdraw' && styles.strategyButtonSubtextActive
                  ]}>
                    Enjoy income now
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.strategyButton,
                    withdrawalStrategy === 'reinvest' && styles.strategyButtonActive
                  ]}
                  onPress={() => mounted.current && setWithdrawalStrategy('reinvest')}
                  activeOpacity={0.7}
                >
                  <TrendingUp size={24} color={withdrawalStrategy === 'reinvest' ? '#FFFFFF' : '#94A3B8'} />
                  <Text style={[
                    styles.strategyButtonText,
                    withdrawalStrategy === 'reinvest' && styles.strategyButtonTextActive
                  ]}>
                    Reinvest & Grow
                  </Text>
                  <Text style={[
                    styles.strategyButtonSubtext,
                    withdrawalStrategy === 'reinvest' && styles.strategyButtonSubtextActive
                  ]}>
                    Build more wealth
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </AnimatedCard>

          {/* Time Horizon */}
          <AnimatedCard delay={500}>
            <GlassCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <Calendar size={20} color="#00D4AA" />
                <Text style={styles.sectionTitle}>Time Horizon</Text>
              </View>
              <ModernSlider
                value={years}
                minimumValue={5}
                maximumValue={30}
                step={1}
                onValueChange={(value) => mounted.current && setYears(value)}
                formatValue={(val) => `${val} years`}
                color="#00D4AA"
              />
            </GlassCard>
          </AnimatedCard>

          {/* Results */}
          <AnimatedCard delay={600}>
            <View style={styles.resultsContainer}>
              {withdrawalStrategy === 'withdraw' ? (
                <>
                  {/* Monthly Income Card */}
                  <LinearGradient
                    colors={['#00D4AA', '#00A887']}
                    style={styles.resultCard}
                  >
                    <DollarSign size={32} color="#FFFFFF" style={styles.resultIcon} />
                    <Text style={styles.resultTitle}>Monthly Income</Text>
                    <Text style={styles.resultValue}>{formatCurrency(calculations.monthlyIncome)}</Text>
                    <View style={styles.incomeBreakdown}>
                      <Text style={styles.incomeBreakdownText}>
                        💰 Steady income every month!
                      </Text>
                    </View>
                  </LinearGradient>

                  {/* Secondary Results */}
                  <View style={styles.secondaryResults}>
                    <View style={styles.resultCardSecondary}>
                      <Text style={styles.resultLabel}>Total Income ({years} years)</Text>
                      <Text style={styles.resultAmount}>
                        {formatCurrency(calculations.totalIncomeReceived)}
                      </Text>
                    </View>

                    <View style={styles.resultCardSecondary}>
                      <Text style={styles.resultLabel}>Portfolio After {years} Years</Text>
                      <Text style={[styles.resultAmount, { color: '#00D4AA' }]}>
                        {formatCurrency(calculations.portfolioValueAfterYears)}
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  {/* Reinvestment Growth */}
                  <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    style={styles.resultCard}
                  >
                    <TrendingUp size={32} color="#FFFFFF" style={styles.resultIcon} />
                    <Text style={styles.resultTitle}>Portfolio Value After {years} Years</Text>
                    <Text style={styles.resultValue}>
                      {formatCurrency(calculations.portfolioValueAfterYears)}
                    </Text>
                    <Text style={styles.resultSubtext}>
                      Amazing growth potential!
                    </Text>
                  </LinearGradient>

                  {/* Potential Monthly Income */}
                  <View style={styles.resultCardSecondary}>
                    <Text style={styles.resultLabel}>Potential Monthly Income</Text>
                    <Text style={styles.resultAmount}>
                      {formatCurrency((calculations.portfolioValueAfterYears * selectedETF.monthlyYield) / 100)}
                    </Text>
                    <Text style={styles.resultSubtext}>
                      If you start taking income after {years} years
                    </Text>
                  </View>
                </>
              )}
            </View>
          </AnimatedCard>

          {/* Educational Content */}
          <AnimatedCard delay={700}>
            <GlassCard style={styles.educationContainer}>
              <Text style={styles.educationTitle}>🎓 Your Investment Journey!</Text>
              
              <View style={styles.educationCard}>
                <Text style={styles.educationSubtitle}>💡 What Makes These ETFs Special?</Text>
                <Text style={styles.educationText}>
                  These ETFs are designed to provide steady income while having the potential to grow over time. 
                  They're perfect for turning your savings into monthly paychecks!
                </Text>
              </View>

              <View style={styles.educationCard}>
                <Text style={styles.educationSubtitle}>📊 Income vs. Growth Balance</Text>
                <Text style={styles.educationText}>
                  STRK offers steady income with growth potential, while STRF provides higher income with exciting growth possibilities. 
                  Both can help you build wealth while enjoying income!
                </Text>
              </View>

              <View style={styles.educationCard}>
                <Text style={styles.educationSubtitle}>🎯 Perfect For Your Goals</Text>
                <Text style={styles.educationText}>
                  • Retirees wanting steady monthly income{'\n'}
                  • Building wealth while getting paid{'\n'}
                  • Diversifying your investment portfolio{'\n'}
                  • Creating financial freedom
                </Text>
              </View>
            </GlassCard>
          </AnimatedCard>
        </ScrollView>

        {/* Scenario Selection Modal */}
        <Modal
          visible={showScenarioModal}
          animationType="slide"
          presentationStyle="pageSheet"
          transparent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Scenario</Text>
                <TouchableOpacity
                  onPress={() => setShowScenarioModal(false)}
                  style={styles.modalClose}
                >
                  <X size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {scenarios.length === 0 ? (
                <View style={styles.emptyState}>
                  <Save size={48} color="#64748B" />
                  <Text style={styles.emptyStateTitle}>No Saved Scenarios</Text>
                  <Text style={styles.emptyStateText}>
                    Save scenarios from the Calculator tab to use their portfolio values for retirement planning.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={scenarios}
                  renderItem={renderScenarioItem}
                  keyExtractor={(item) => item.id}
                  style={styles.scenarioList}
                  contentContainerStyle={styles.scenarioListContent}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </View>
        </Modal>
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
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 8,
  },
  encouragingText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
    textAlign: 'center',
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
  sourceSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  sourceSelectorMobile: {
    flexDirection: 'column',
    gap: 8,
    padding: 8,
  },
  sourceButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  sourceButtonMobile: {
    flex: 0,
    paddingVertical: 16,
    minHeight: 52,
  },
  sourceButtonActive: {
    backgroundColor: '#00D4AA',
  },
  sourceButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourceButtonContentMobile: {
    gap: 6,
  },
  sourceButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
  },
  sourceButtonTextMobile: {
    fontSize: 15,
  },
  sourceButtonTextActive: {
    color: '#FFFFFF',
  },
  sourceIndicator: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  sourceIndicatorText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#E2E8F0',
    textAlign: 'center',
  },
  sourceIndicatorTextMobile: {
    fontSize: 13,
    lineHeight: 18,
  },
  etfContainer: {
    gap: 16,
  },
  etfCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  etfCardSelected: {
    borderColor: '#00D4AA',
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
  },
  etfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  etfSymbol: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  etfName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  etfYield: {
    alignItems: 'flex-end',
  },
  etfYieldText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#00D4AA',
  },
  etfYieldLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  etfDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 20,
  },
  etfMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  etfMetric: {
    alignItems: 'center',
  },
  etfMetricLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginBottom: 4,
  },
  etfMetricValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  etfTooltipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  etfTooltipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#E2E8F0',
    lineHeight: 16,
    flex: 1,
  },
  strategyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  strategyButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  strategyButtonActive: {
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    borderColor: '#00D4AA',
  },
  strategyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  strategyButtonTextActive: {
    color: '#FFFFFF',
  },
  strategyButtonSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  strategyButtonSubtextActive: {
    color: '#E6F7F4',
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
    textAlign: 'center',
  },
  resultValue: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  resultSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.8,
  },
  incomeBreakdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  incomeBreakdownText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  secondaryResults: {
    flexDirection: 'row',
    gap: 12,
  },
  resultCardSecondary: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 8,
    textAlign: 'center',
  },
  resultAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  educationContainer: {
    paddingVertical: 24,
  },
  educationTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  educationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  educationSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
    marginBottom: 8,
  },
  educationText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  modalClose: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
  },
  scenarioList: {
    flex: 1,
  },
  scenarioListContent: {
    padding: 20,
  },
  scenarioItem: {
    marginBottom: 12,
  },
  scenarioCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  scenarioInfo: {
    flex: 1,
  },
  scenarioName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  scenarioDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 2,
  },
  scenarioMeta: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  scenarioValue: {
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  scenarioValueText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#00D4AA',
  },
  scenarioValueLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    marginTop: 2,
  },
});