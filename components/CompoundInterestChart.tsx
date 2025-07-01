import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { TrendingUp, DollarSign, Zap, ChartBar as BarChart3 } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  Easing 
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface ChartData {
  year: number;
  principal: number;
  simpleInterest: number;
  compoundInterest: number;
  totalValue: number;
}

interface CompoundInterestChartProps {
  startingAmount: number;
  monthlyAmount: number;
  annualRate: number;
  years: number;
  assetName: string;
  pauseAfterYears?: number | null;
  boostAfterYears?: number | null;
  boostAmount?: number;
}

export default function CompoundInterestChart({
  startingAmount,
  monthlyAmount,
  annualRate,
  years,
  assetName,
  pauseAfterYears = null,
  boostAfterYears = null,
  boostAmount = 0
}: CompoundInterestChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState(years.toString());
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [storyStep, setStoryStep] = useState(0);
  
  // Animation values
  const chartOpacity = useSharedValue(0);
  const principalOpacity = useSharedValue(1);
  const simpleOpacity = useSharedValue(1);
  const compoundOpacity = useSharedValue(1);

  const timeframes = ['10', '20', '30', '40'];
  const isMobile = width < 768;
  const isSmallMobile = width < 640;
  
  // Mobile-optimized dimensions
  const chartWidth = isMobile ? width - 40 : width - 80;
  const chartHeight = isMobile ? (isSmallMobile ? 350 : 320) : 280;
  const padding = isMobile ? 50 : 40;

  // Update timeframe when years prop changes
  useEffect(() => {
    setSelectedTimeframe(years.toString());
  }, [years]);

  useEffect(() => {
    generateChartData();
    animateChart();
  }, [selectedTimeframe, startingAmount, monthlyAmount, annualRate, pauseAfterYears, boostAfterYears, boostAmount]);

  const animateChart = () => {
    chartOpacity.value = 0;
    chartOpacity.value = withTiming(1, { 
      duration: 800, 
      easing: Easing.out(Easing.ease) 
    });
  };

  const animateStoryMode = (step: number) => {
    // Reset all layers
    principalOpacity.value = 0;
    simpleOpacity.value = 0;
    compoundOpacity.value = 0;

    // Animate layers based on story step
    if (step >= 0) {
      principalOpacity.value = withTiming(1, { duration: 600 });
    }
    if (step >= 1) {
      simpleOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    }
    if (step >= 2) {
      compoundOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    }
  };

  // Get the effective growth rate for a given year (matching calculator logic)
  const getEffectiveGrowthRate = (year: number, baseRate: number): number => {
    // Load calculator state to get the same settings
    let rate = baseRate;
    
    if (Platform.OS === 'web') {
      try {
        const savedState = localStorage.getItem('freedom21_calculator_state');
        if (savedState) {
          const state = JSON.parse(savedState);
          
          // Apply realistic CAGR reduction if enabled
          if (state.useRealisticCAGR) {
            rate = rate * 0.6; // 60% of optimistic rate
          }
          
          // Apply declining rates if enabled (overrides base rate)
          if (state.useDecliningRates) {
            if (year <= 10) {
              rate = state.phase1Rate;
            } else if (year <= 20) {
              rate = state.phase2Rate;
            } else {
              rate = state.phase3Rate;
            }
            
            // Still apply realistic reduction if both are enabled
            if (state.useRealisticCAGR) {
              rate = rate * 0.6;
            }
          }
          
          // Apply inflation adjustment if enabled
          if (state.useInflationAdjustment) {
            rate = rate - state.inflationRate;
          }
        }
      } catch (error) {
        console.error('Error loading calculator state in chart:', error);
      }
    }
    
    return Math.max(0, rate); // Ensure rate doesn't go negative
  };

  // Use the EXACT same calculation as the calculator tab
  const calculateYearByYearProgression = (
    startingAmount: number,
    monthlyAmount: number,
    baseGrowthRate: number,
    targetYear: number,
    pauseAfterYears: number | null = null,
    boostAfterYears: number | null = null,
    boostAmount: number = 0
  ): { value: number; contributions: number } => {
    let totalValue = startingAmount;
    let totalContributions = startingAmount;

    for (let year = 1; year <= targetYear; year++) {
      // Get effective growth rate for this year (matching calculator logic)
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

  const generateChartData = () => {
    const targetYears = parseInt(selectedTimeframe);
    const rate = annualRate / 100;
    const data: ChartData[] = [];

    for (let year = 0; year <= targetYears; year++) {
      const result = calculateYearByYearProgression(
        startingAmount,
        monthlyAmount,
        annualRate,
        year,
        pauseAfterYears,
        boostAfterYears,
        boostAmount
      );
      
      // Simple interest calculation (linear growth)
      let simpleInterestValue = startingAmount;
      if (year > 0) {
        simpleInterestValue += startingAmount * rate * year;
        
        for (let y = 1; y <= year; y++) {
          let yearContrib = monthlyAmount * 12;
          
          if (pauseAfterYears && y > pauseAfterYears) {
            yearContrib = 0;
          } else if (boostAfterYears && y > boostAfterYears) {
            yearContrib = boostAmount * 12;
          }
          
          const avgTimeInMarket = (year - y + 0.5);
          simpleInterestValue += yearContrib + (yearContrib * rate * avgTimeInMarket);
        }
      }

      data.push({
        year,
        principal: result.contributions,
        simpleInterest: Math.round(simpleInterestValue),
        compoundInterest: result.value,
        totalValue: result.value
      });
    }

    setChartData(data);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatFullCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Progressive X-axis label logic - SAME for both story mode and regular mode
  const getXAxisLabels = (data: ChartData[]) => {
    const currentYear = new Date().getFullYear();
    const maxYear = parseInt(selectedTimeframe);
    
    if (isMobile) {
      // Mobile: Show every 5 years (0, 5, 10, 15, 20) plus final year if not divisible by 5
      const labels = [];
      for (let year = 0; year <= maxYear; year += 5) {
        const dataPoint = data.find(d => d.year === year);
        if (dataPoint) {
          labels.push({
            ...dataPoint,
            isMainLabel: true,
            isFinalYear: year === maxYear,
            displayYear: currentYear + year
          });
        }
      }
      
      // Add final year if it's not divisible by 5
      if (maxYear % 5 !== 0) {
        const finalDataPoint = data.find(d => d.year === maxYear);
        if (finalDataPoint) {
          labels.push({
            ...finalDataPoint,
            isMainLabel: true,
            isFinalYear: true,
            displayYear: currentYear + maxYear
          });
        }
      }
      
      // NO MARKERS for story mode - keep it clean
      return { labels, markers: [] };
    } else {
      // Desktop: Show all years as before
      const labels = data.map(point => ({
        ...point,
        isMainLabel: true,
        isFinalYear: point.year === maxYear,
        displayYear: currentYear + point.year
      }));
      return { labels, markers: [] };
    }
  };

  // Mobile-optimized chart rendering with area chart option
  const renderChart = () => {
    if (chartData.length === 0) return null;

    const maxValue = Math.max(...chartData.map(d => d.compoundInterest));
    const availableWidth = chartWidth - padding * 2;
    const availableHeight = chartHeight - padding * 2;
    
    // Mobile: Show fewer data points for cleaner visualization
    const stepSize = isMobile ? Math.max(1, Math.floor(chartData.length / 8)) : Math.max(1, Math.floor(chartData.length / 12));
    const filteredData = chartData.filter((_, index) => index % stepSize === 0 || index === chartData.length - 1);
    
    if (isMobile && isStoryMode) {
      // Story mode: render as area chart
      return renderAreaChart(filteredData, maxValue, availableWidth, availableHeight);
    } else {
      // Standard mode: render as bars
      return renderBarChart(filteredData, maxValue, availableWidth, availableHeight);
    }
  };

  const renderAreaChart = (data: ChartData[], maxValue: number, availableWidth: number, availableHeight: number) => {
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * availableWidth;
      const principalY = availableHeight - (point.principal / maxValue) * availableHeight;
      const simpleY = availableHeight - (point.simpleInterest / maxValue) * availableHeight;
      const compoundY = availableHeight - (point.compoundInterest / maxValue) * availableHeight;
      
      return { x, principalY, simpleY, compoundY, ...point };
    });

    const { labels } = getXAxisLabels(data); // No markers for story mode

    return (
      <View style={[styles.chartContainer, { width: chartWidth, height: chartHeight }]}>
        {/* Y-Axis Labels - Mobile optimized */}
        {Array.from({ length: isMobile ? 4 : 5 }, (_, i) => {
          const value = maxValue - (i * maxValue) / (isMobile ? 3 : 4);
          const y = padding + (i * availableHeight) / (isMobile ? 3 : 4);
          return (
            <Text
              key={`y-label-${i}`}
              style={[
                styles.yAxisLabel,
                isMobile && styles.yAxisLabelMobile,
                {
                  top: y - 8,
                  left: 5,
                }
              ]}
            >
              {formatCurrency(value)}
            </Text>
          );
        })}

        {/* Area Chart Layers */}
        <View style={[styles.areaContainer, { 
          left: padding, 
          top: padding, 
          width: availableWidth, 
          height: availableHeight 
        }]}>
          {/* Render areas using positioned views */}
          {points.map((point, index) => {
            if (index === 0) return null;
            
            const prevPoint = points[index - 1];
            const segmentWidth = point.x - prevPoint.x;
            
            return (
              <View key={`area-segment-${index}`} style={{ position: 'absolute' }}>
                {/* Principal area */}
                <Animated.View
                  style={[
                    styles.areaSegment,
                    {
                      left: prevPoint.x,
                      top: Math.min(prevPoint.principalY, point.principalY),
                      width: segmentWidth,
                      height: availableHeight - Math.min(prevPoint.principalY, point.principalY),
                      backgroundColor: 'rgba(30, 64, 175, 0.8)',
                      opacity: principalOpacity,
                    }
                  ]}
                />
                
                {/* Simple interest area */}
                <Animated.View
                  style={[
                    styles.areaSegment,
                    {
                      left: prevPoint.x,
                      top: Math.min(prevPoint.simpleY, point.simpleY),
                      width: segmentWidth,
                      height: Math.min(prevPoint.principalY, point.principalY) - Math.min(prevPoint.simpleY, point.simpleY),
                      backgroundColor: 'rgba(251, 146, 60, 0.8)',
                      opacity: simpleOpacity,
                    }
                  ]}
                />
                
                {/* Compound interest area */}
                <Animated.View
                  style={[
                    styles.areaSegment,
                    {
                      left: prevPoint.x,
                      top: Math.min(prevPoint.compoundY, point.compoundY),
                      width: segmentWidth,
                      height: Math.min(prevPoint.simpleY, point.simpleY) - Math.min(prevPoint.compoundY, point.compoundY),
                      backgroundColor: 'rgba(0, 212, 170, 0.9)',
                      opacity: compoundOpacity,
                    }
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* Progressive X-Axis Labels - CLEAN for story mode */}
        {labels.map((point, index) => {
          const dataIndex = data.findIndex(d => d.year === point.year);
          const x = padding + (dataIndex / (data.length - 1)) * availableWidth;
          
          return (
            <View key={`x-label-${index}`} style={{ position: 'absolute' }}>
              {/* Main year label */}
              <Text
                style={[
                  styles.xAxisLabel,
                  isMobile && styles.xAxisLabelMobile,
                  point.isFinalYear && styles.xAxisLabelFinal,
                  {
                    left: x - 15,
                    bottom: 15,
                  }
                ]}
              >
                {point.year}
              </Text>
              
              {/* Current year indicator */}
              {point.isFinalYear && (
                <View style={[styles.currentYearIndicator, { left: x - 2, bottom: 35 }]}>
                  <Text style={styles.currentYearText}>{point.displayYear}</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Grid Lines - Simplified for mobile */}
        <View style={styles.gridContainer}>
          {Array.from({ length: isMobile ? 4 : 5 }, (_, i) => (
            <View
              key={`h-grid-${i}`}
              style={[
                styles.gridLineHorizontal,
                {
                  top: padding + (i * availableHeight) / (isMobile ? 3 : 4),
                  left: padding,
                  width: availableWidth,
                }
              ]}
            />
          ))}
        </View>

        {/* Mobile-optimized annotations */}
        <View style={styles.annotationContainer}>
          <View style={[styles.annotation, { 
            top: isMobile ? '65%' : '70%', 
            left: isMobile ? '10%' : '15%' 
          }]}>
            <View style={styles.annotationBubble}>
              <Text style={styles.annotationText}>
                {isMobile ? "Starting Small" : "Pocket Change"}
              </Text>
            </View>
            <View style={styles.annotationLine} />
          </View>
          
          <View style={[styles.annotation, { 
            top: isMobile ? '20%' : '25%', 
            right: isMobile ? '10%' : '15%' 
          }]}>
            <View style={styles.annotationBubbleBright}>
              <Text style={styles.annotationTextBright}>
                {isMobile ? "Exponential Growth!" : "Huge & Growing Fast!"}
              </Text>
            </View>
            <View style={styles.annotationLineBright} />
          </View>
        </View>
      </View>
    );
  };

  const renderBarChart = (data: ChartData[], maxValue: number, availableWidth: number, availableHeight: number) => {
    const barWidth = Math.max(isMobile ? 12 : 16, Math.min(isMobile ? 24 : 32, availableWidth / (data.length * 1.5)));
    const spacing = (availableWidth - (data.length * barWidth)) / Math.max(1, data.length - 1);
    
    const { labels, markers } = getXAxisLabels(data);
    
    return (
      <View style={[styles.chartContainer, { width: chartWidth, height: chartHeight }]}>
        {/* Y-Axis Labels */}
        {Array.from({ length: isMobile ? 4 : 5 }, (_, i) => {
          const value = maxValue - (i * maxValue) / (isMobile ? 3 : 4);
          const y = padding + (i * availableHeight) / (isMobile ? 3 : 4);
          return (
            <Text
              key={`y-label-${i}`}
              style={[
                styles.yAxisLabel,
                isMobile && styles.yAxisLabelMobile,
                {
                  top: y - 8,
                  left: 5,
                }
              ]}
            >
              {formatCurrency(value)}
            </Text>
          );
        })}

        {/* Chart Bars Container */}
        <View style={[styles.barsContainer, { 
          left: padding, 
          top: padding, 
          width: availableWidth, 
          height: availableHeight 
        }]}>
          {data.map((point, index) => {
            const x = index * (barWidth + spacing);
            const principalHeight = Math.max(4, (point.principal / maxValue) * availableHeight);
            const simpleHeight = Math.max(4, (point.simpleInterest / maxValue) * availableHeight);
            const compoundHeight = Math.max(4, (point.compoundInterest / maxValue) * availableHeight);
            
            return (
              <View 
                key={`bar-group-${index}`} 
                style={[styles.barGroup, { 
                  left: x, 
                  width: barWidth,
                  height: availableHeight 
                }]}
              >
                {/* Principal bar (bottom layer) */}
                <Animated.View
                  style={[
                    styles.principalBar,
                    isMobile && styles.principalBarMobile,
                    {
                      height: principalHeight,
                      width: barWidth,
                      bottom: 0,
                      opacity: principalOpacity,
                    }
                  ]}
                />
                
                {/* Simple interest bar (middle layer) */}
                {simpleHeight > principalHeight && (
                  <Animated.View
                    style={[
                      styles.simpleBar,
                      isMobile && styles.simpleBarMobile,
                      {
                        height: simpleHeight - principalHeight,
                        width: barWidth,
                        bottom: principalHeight,
                        opacity: simpleOpacity,
                      }
                    ]}
                  />
                )}
                
                {/* Compound interest bar (top layer) */}
                {compoundHeight > simpleHeight && (
                  <Animated.View
                    style={[
                      styles.compoundBar,
                      isMobile && styles.compoundBarMobile,
                      {
                        height: compoundHeight - simpleHeight,
                        width: barWidth,
                        bottom: simpleHeight,
                        opacity: compoundOpacity,
                      }
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* Progressive X-Axis Labels */}
        {labels.map((point, index) => {
          const dataIndex = data.findIndex(d => d.year === point.year);
          const x = padding + dataIndex * (barWidth + spacing) + barWidth / 2;
          
          return (
            <View key={`x-label-${index}`} style={{ position: 'absolute' }}>
              {/* Main year label */}
              <Text
                style={[
                  styles.xAxisLabel,
                  isMobile && styles.xAxisLabelMobile,
                  point.isFinalYear && styles.xAxisLabelFinal,
                  {
                    left: x - 15,
                    bottom: 15,
                  }
                ]}
              >
                {point.year}
              </Text>
              
              {/* Current year indicator */}
              {point.isFinalYear && (
                <View style={[styles.currentYearIndicator, { left: x - 20, bottom: 35 }]}>
                  <Text style={styles.currentYearText}>{point.displayYear}</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Year markers for non-labeled years - ONLY for regular mode */}
        {!isStoryMode && markers.map((point, index) => {
          const dataIndex = data.findIndex(d => d.year === point.year);
          const x = padding + dataIndex * (barWidth + spacing) + barWidth / 2;
          
          return (
            <View
              key={`marker-${index}`}
              style={[
                styles.yearMarker,
                {
                  left: x - 2,
                  bottom: 25,
                }
              ]}
            />
          );
        })}

        {/* Grid Lines */}
        <View style={styles.gridContainer}>
          {Array.from({ length: isMobile ? 4 : 5 }, (_, i) => (
            <View
              key={`h-grid-${i}`}
              style={[
                styles.gridLineHorizontal,
                {
                  top: padding + (i * availableHeight) / (isMobile ? 3 : 4),
                  left: padding,
                  width: availableWidth,
                }
              ]}
            />
          ))}
        </View>

        {/* Mobile-optimized annotations */}
        <View style={styles.annotationContainer}>
          <View style={[styles.annotation, { 
            top: isMobile ? '65%' : '70%', 
            left: isMobile ? '10%' : '15%' 
          }]}>
            <View style={styles.annotationBubble}>
              <Text style={styles.annotationText}>
                {isMobile ? "Starting Small" : "Pocket Change"}
              </Text>
            </View>
            <View style={styles.annotationLine} />
          </View>
          
          <View style={[styles.annotation, { 
            top: isMobile ? '20%' : '25%', 
            right: isMobile ? '10%' : '15%' 
          }]}>
            <View style={styles.annotationBubbleBright}>
              <Text style={styles.annotationTextBright}>
                {isMobile ? "Exponential Growth!" : "Huge & Growing Fast!"}
              </Text>
            </View>
            <View style={styles.annotationLineBright} />
          </View>
        </View>
      </View>
    );
  };

  const TimeframeButton = ({ timeframe, isSelected, onPress }: any) => (
    <TouchableOpacity
      style={[
        styles.timeframeButton,
        isMobile && styles.timeframeButtonMobile,
        isSelected && styles.timeframeButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.timeframeText,
          isMobile && styles.timeframeTextMobile,
          isSelected && styles.timeframeTextActive,
        ]}
      >
        {timeframe}Y
      </Text>
    </TouchableOpacity>
  );

  const StoryModeButton = ({ step, title, isActive, onPress }: any) => (
    <TouchableOpacity
      style={[
        styles.storyButton,
        isActive && styles.storyButtonActive,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[
        styles.storyButtonText,
        isActive && styles.storyButtonTextActive,
      ]}>
        {step + 1}. {title}
      </Text>
    </TouchableOpacity>
  );

  const finalData = chartData[chartData.length - 1];
  const compoundGains = finalData ? finalData.compoundInterest - finalData.principal : 0;
  const compoundPercentage = finalData && finalData.principal > 0 ? ((compoundGains / finalData.principal) * 100) : 0;

  // Animated styles
  const chartAnimatedStyle = useAnimatedStyle(() => ({
    opacity: chartOpacity.value,
  }));

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      {/* Mobile: Move timeframe selector to top */}
      {isMobile && (
        <View style={[styles.timeframeContainer, styles.timeframeContainerMobile]}>
          <View style={styles.timeframeSelector}>
            {timeframes.map((timeframe) => (
              <TimeframeButton
                key={timeframe}
                timeframe={timeframe}
                isSelected={selectedTimeframe === timeframe}
                onPress={() => setSelectedTimeframe(timeframe)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <Text style={[styles.title, isMobile && styles.titleMobile]}>
          The Magic of Compound Interest
        </Text>
        <Text style={[styles.subtitle, isMobile && styles.subtitleMobile]}>
          See how your {assetName} investment grows over time
        </Text>
      </View>

      {/* Desktop: Timeframe Selector */}
      {!isMobile && (
        <View style={styles.timeframeContainer}>
          <View style={styles.timeframeSelector}>
            {timeframes.map((timeframe) => (
              <TimeframeButton
                key={timeframe}
                timeframe={timeframe}
                isSelected={selectedTimeframe === timeframe}
                onPress={() => setSelectedTimeframe(timeframe)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Mobile: Story Mode Toggle */}
      {isMobile && (
        <View style={styles.storyModeContainer}>
          <TouchableOpacity
            style={[styles.storyModeToggle, isStoryMode && styles.storyModeToggleActive]}
            onPress={() => {
              setIsStoryMode(!isStoryMode);
              if (!isStoryMode) {
                setStoryStep(0);
                animateStoryMode(0);
              } else {
                // Reset to show all layers
                principalOpacity.value = withTiming(1, { duration: 300 });
                simpleOpacity.value = withTiming(1, { duration: 300 });
                compoundOpacity.value = withTiming(1, { duration: 300 });
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.storyModeToggleText, isStoryMode && styles.storyModeToggleTextActive]}>
              {isStoryMode ? "📊 Chart View" : "📖 Story Mode"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mobile: Story Mode Controls */}
      {isMobile && isStoryMode && (
        <View style={styles.storyControls}>
          <StoryModeButton
            step={0}
            title="Your Contributions"
            isActive={storyStep === 0}
            onPress={() => {
              setStoryStep(0);
              animateStoryMode(0);
            }}
          />
          <StoryModeButton
            step={1}
            title="Plus Simple Interest"
            isActive={storyStep === 1}
            onPress={() => {
              setStoryStep(1);
              animateStoryMode(1);
            }}
          />
          <StoryModeButton
            step={2}
            title="The Compound Effect"
            isActive={storyStep === 2}
            onPress={() => {
              setStoryStep(2);
              animateStoryMode(2);
            }}
          />
        </View>
      )}

      {/* Chart */}
      <Animated.View style={[styles.chartWrapper, isMobile && styles.chartWrapperMobile, chartAnimatedStyle]}>
        {renderChart()}

        {/* Legend - Mobile optimized */}
        <View style={[styles.legend, isMobile && styles.legendMobile]}>
          <View style={[styles.legendItem, isMobile && styles.legendItemMobile]}>
            <View style={[styles.legendDot, { backgroundColor: '#1E40AF' }]} />
            <Text style={[styles.legendText, isMobile && styles.legendTextMobile]}>Principal</Text>
          </View>
          <View style={[styles.legendItem, isMobile && styles.legendItemMobile]}>
            <View style={[styles.legendDot, { backgroundColor: '#FB923C' }]} />
            <Text style={[styles.legendText, isMobile && styles.legendTextMobile]}>Simple Interest</Text>
          </View>
          <View style={[styles.legendItem, isMobile && styles.legendItemMobile]}>
            <View style={[styles.legendDot, { backgroundColor: '#00D4AA' }]} />
            <Text style={[styles.legendText, isMobile && styles.legendTextMobile]}>Compound Interest</Text>
          </View>
        </View>
      </Animated.View>

      {/* Performance Cards - Mobile optimized */}
      <View style={[styles.performanceContainer, isMobile && styles.performanceContainerMobile]}>
        <View style={[styles.performanceGrid, isMobile && styles.performanceGridMobile]}>
          <View style={[styles.performanceCard, isMobile && styles.performanceCardMobile]}>
            <DollarSign size={isMobile ? 20 : 24} color="#1E40AF" style={styles.cardIcon} />
            <Text style={[styles.cardLabel, isMobile && styles.cardLabelMobile]}>Total Invested</Text>
            <Text style={[styles.cardValue, isMobile && styles.cardValueMobile]}>
              {formatFullCurrency(finalData?.principal || 0)}
            </Text>
          </View>

          <View style={[styles.performanceCard, isMobile && styles.performanceCardMobile]}>
            <TrendingUp size={isMobile ? 20 : 24} color="#FB923C" style={styles.cardIcon} />
            <Text style={[styles.cardLabel, isMobile && styles.cardLabelMobile]}>Interest Earned</Text>
            <Text style={[styles.cardValue, isMobile && styles.cardValueMobile]}>
              {formatFullCurrency(compoundGains)}
            </Text>
          </View>

          <View style={[styles.performanceCard, isMobile && styles.performanceCardMobile]}>
            <BarChart3 size={isMobile ? 20 : 24} color="#00D4AA" style={styles.cardIcon} />
            <Text style={[styles.cardLabel, isMobile && styles.cardLabelMobile]}>Final Value</Text>
            <Text style={[styles.cardValue, styles.cardValueHighlight, isMobile && styles.cardValueMobile]}>
              {formatFullCurrency(finalData?.totalValue || 0)}
            </Text>
          </View>

          <View style={[styles.performanceCard, isMobile && styles.performanceCardMobile]}>
            <Zap size={isMobile ? 20 : 24} color="#F59E0B" style={styles.cardIcon} />
            <Text style={[styles.cardLabel, isMobile && styles.cardLabelMobile]}>Compound Power</Text>
            <Text style={[styles.cardValue, styles.cardValueGold, isMobile && styles.cardValueMobile]}>
              {compoundPercentage.toFixed(0)}% Gain
            </Text>
          </View>
        </View>
      </View>

      {/* Insights - Mobile optimized */}
      <View style={[styles.insightsContainer, isMobile && styles.insightsContainerMobile]}>
        <Text style={[styles.insightsTitle, isMobile && styles.insightsTitleMobile]}>
          💡 Compound Interest Insights
        </Text>
        <View style={styles.insightsList}>
          <Text style={[styles.insightText, isMobile && styles.insightTextMobile]}>
            🚀 Your money grows exponentially, not linearly - the curve gets steeper over time
          </Text>
          <Text style={[styles.insightText, isMobile && styles.insightTextMobile]}>
            ⏰ Time is your greatest asset - starting early makes a massive difference
          </Text>
          <Text style={[styles.insightText, isMobile && styles.insightTextMobile]}>
            💰 The "compound interest" layer shows money your money earned, not you
          </Text>
          <Text style={[styles.insightText, isMobile && styles.insightTextMobile]}>
            🎯 In later years, your gains dwarf your contributions - that's the magic!
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  containerMobile: {
    padding: 16,
    borderRadius: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerMobile: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleMobile: {
    fontSize: 20,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#00D4AA',
    textAlign: 'center',
  },
  subtitleMobile: {
    fontSize: 14,
  },
  timeframeContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  timeframeContainerMobile: {
    marginBottom: 16,
    order: -1, // Move to top on mobile
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  timeframeButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  timeframeButtonMobile: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 44, // Touch target
  },
  timeframeButtonActive: {
    backgroundColor: '#00D4AA',
  },
  timeframeText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
  },
  timeframeTextMobile: {
    fontSize: 13,
  },
  timeframeTextActive: {
    color: '#FFFFFF',
  },
  storyModeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  storyModeToggle: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  storyModeToggleActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8B5CF6',
  },
  storyModeToggleText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
  },
  storyModeToggleTextActive: {
    color: '#8B5CF6',
  },
  storyControls: {
    marginBottom: 16,
    gap: 8,
  },
  storyButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  storyButtonActive: {
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
    borderColor: '#00D4AA',
  },
  storyButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
    textAlign: 'center',
  },
  storyButtonTextActive: {
    color: '#00D4AA',
  },
  chartWrapper: {
    marginBottom: 24,
  },
  chartWrapperMobile: {
    marginBottom: 20,
  },
  chartContainer: {
    position: 'relative',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  barsContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  areaContainer: {
    position: 'absolute',
  },
  areaSegment: {
    position: 'absolute',
  },
  barGroup: {
    position: 'absolute',
    bottom: 0,
  },
  principalBar: {
    position: 'absolute',
    backgroundColor: '#1E40AF',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(30, 64, 175, 0.3)',
  },
  principalBarMobile: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderWidth: 0.5,
  },
  simpleBar: {
    position: 'absolute',
    backgroundColor: '#FB923C',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  simpleBarMobile: {
    borderWidth: 0.5,
  },
  compoundBar: {
    position: 'absolute',
    backgroundColor: '#00D4AA',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.3)',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  compoundBarMobile: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderWidth: 0.5,
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  gridLineHorizontal: {
    position: 'absolute',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  yAxisLabel: {
    position: 'absolute',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  yAxisLabelMobile: {
    fontSize: 10,
  },
  xAxisLabel: {
    position: 'absolute',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    textAlign: 'center',
    width: 30,
  },
  xAxisLabelMobile: {
    fontSize: 11,
    width: 30,
  },
  xAxisLabelFinal: {
    fontFamily: 'Inter-Bold',
    color: '#00D4AA',
    fontSize: 13,
  },
  currentYearIndicator: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 212, 170, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00D4AA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  currentYearText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#00D4AA',
    textAlign: 'center',
  },
  yearMarker: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.6)',
  },
  annotationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  annotation: {
    position: 'absolute',
  },
  annotationBubble: {
    backgroundColor: 'rgba(26, 31, 46, 0.95)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  annotationBubbleBright: {
    backgroundColor: 'rgba(0, 212, 170, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.3)',
    shadowColor: '#00D4AA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  annotationText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  annotationTextBright: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#00D4AA',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  annotationLine: {
    width: 30,
    height: 1,
    backgroundColor: '#6B7280',
    marginTop: 4,
  },
  annotationLineBright: {
    width: 30,
    height: 1,
    backgroundColor: '#00D4AA',
    marginTop: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  legendMobile: {
    gap: 16,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44, // Touch target for mobile
  },
  legendItemMobile: {
    minHeight: 36,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#E2E8F0',
  },
  legendTextMobile: {
    fontSize: 13,
  },
  performanceContainer: {
    marginBottom: 24,
  },
  performanceContainerMobile: {
    marginBottom: 20,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  performanceGridMobile: {
    gap: 8,
  },
  performanceCard: {
    flex: 1,
    minWidth: 150,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(42, 47, 62, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  performanceCardMobile: {
    minWidth: '47%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  cardIcon: {
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardLabelMobile: {
    fontSize: 11,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cardValueMobile: {
    fontSize: 14,
  },
  cardValueHighlight: {
    color: '#00D4AA',
  },
  cardValueGold: {
    color: '#F59E0B',
  },
  insightsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  insightsContainerMobile: {
    padding: 16,
    borderRadius: 12,
  },
  insightsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  insightsTitleMobile: {
    fontSize: 16,
    marginBottom: 12,
  },
  insightsList: {
    gap: 12,
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    lineHeight: 20,
  },
  insightTextMobile: {
    fontSize: 13,
    lineHeight: 18,
  },
});