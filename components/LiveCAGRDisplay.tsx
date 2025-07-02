import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { ChevronDown, TrendingUp, RefreshCw, Wifi, WifiOff, Clock, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { getAssetCAGR, CAGRResult, forceRefreshAsset } from '../services/twelveData';
import GlassCard from './GlassCard';

interface LiveCAGRDisplayProps {
  assetName: string;
  onCAGRUpdate?: (newCAGR: number) => void;
  defaultCAGR: number;
  style?: any;
}

export default function LiveCAGRDisplay({ 
  assetName, 
  onCAGRUpdate, 
  defaultCAGR,
  style 
}: LiveCAGRDisplayProps) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [cagrResult, setCAGRResult] = useState<CAGRResult | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  useEffect(() => {
    loadCAGRData();
  }, [assetName]);
  
  const loadCAGRData = async () => {
    setLoading(true);
    
    try {
      const result = await getAssetCAGR(assetName);
      setCAGRResult(result);
      setLastRefresh(new Date());
      
      // Update parent with suggested CAGR (prioritize 10Y > 5Y > 1Y)
      const suggestedCAGR = result.data.cagr10Y !== 'N/A' ? result.data.cagr10Y : 
                           result.data.cagr5Y !== 'N/A' ? result.data.cagr5Y : 
                           result.data.cagr1Y !== 'N/A' ? result.data.cagr1Y : defaultCAGR;
      
      if (onCAGRUpdate && typeof suggestedCAGR === 'number') {
        onCAGRUpdate(suggestedCAGR);
      }
    } catch (err) {
      console.error('Unexpected error in loadCAGRData:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleForceRefresh = async () => {
    setLoading(true);
    
    try {
      const result = await forceRefreshAsset(assetName);
      setCAGRResult(result);
      setLastRefresh(new Date());
      
      // Update parent with suggested CAGR
      const suggestedCAGR = result.data.cagr10Y !== 'N/A' ? result.data.cagr10Y : 
                           result.data.cagr5Y !== 'N/A' ? result.data.cagr5Y : 
                           result.data.cagr1Y !== 'N/A' ? result.data.cagr1Y : defaultCAGR;
      
      if (onCAGRUpdate && typeof suggestedCAGR === 'number') {
        onCAGRUpdate(suggestedCAGR);
      }
    } catch (err) {
      console.error('Error force refreshing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCAGR = (value: number | 'N/A'): string => {
    return value !== 'N/A' ? `${value}%` : 'N/A';
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatLastUpdate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return 'Just updated';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  const isDataFresh = cagrResult && !cagrResult.isFallback && lastRefresh && 
    (new Date().getTime() - new Date(cagrResult.data.lastUpdate).getTime()) < (5 * 60 * 60 * 1000); // 5 hours

  const getStatusIcon = () => {
    if (loading) {
      return <ActivityIndicator size="small" color="#00D4AA" />;
    } else if (cagrResult?.isFallback) {
      return <AlertTriangle size={20} color="#F59E0B" />;
    } else if (isDataFresh) {
      return <Wifi size={20} color="#00D4AA" />;
    } else {
      return <Clock size={20} color="#F59E0B" />;
    }
  };

  const getStatusText = () => {
    if (loading) {
      return 'Fetching...';
    } else if (cagrResult?.isFallback) {
      return `${assetName} • Fallback data`;
    } else if (cagrResult) {
      return `${assetName} • ${formatPrice(cagrResult.data.currentPrice)}`;
    } else {
      return 'Tap to load';
    }
  };

  return (
    <GlassCard style={[styles.container, style]}>
      <TouchableOpacity 
        onPress={() => setExpanded(!expanded)} 
        style={styles.header}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            {getStatusIcon()}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>📊 Live Growth Data</Text>
            <Text style={styles.headerSubtitle}>
              {getStatusText()}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              handleForceRefresh();
            }}
            style={styles.refreshButton}
            disabled={loading}
          >
            <RefreshCw 
              size={16} 
              color={loading ? "#64748B" : "#00D4AA"} 
              style={loading ? styles.spinning : undefined}
            />
          </TouchableOpacity>
          <ChevronDown 
            size={20} 
            color="#94A3B8" 
            style={[
              styles.chevron,
              expanded && styles.chevronExpanded
            ]}
          />
        </View>
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.content}>
          {cagrResult ? (
            <>
              {cagrResult.isFallback && (
                <View style={styles.fallbackWarning}>
                  <AlertTriangle size={16} color="#F59E0B" />
                  <Text style={styles.fallbackWarningText}>
                    {cagrResult.errorMessage || 'Using fallback data - live data unavailable'}
                  </Text>
                </View>
              )}
              
              <View style={styles.cagrGrid}>
                <View style={styles.cagrItem}>
                  <Text style={styles.cagrLabel}>1 Year CAGR</Text>
                  <Text style={[
                    styles.cagrValue,
                    cagrResult.data.cagr1Y === 'N/A' && styles.cagrValueNA
                  ]}>
                    {formatCAGR(cagrResult.data.cagr1Y)}
                  </Text>
                </View>
                <View style={styles.cagrItem}>
                  <Text style={styles.cagrLabel}>5 Year CAGR</Text>
                  <Text style={[
                    styles.cagrValue,
                    cagrResult.data.cagr5Y === 'N/A' && styles.cagrValueNA
                  ]}>
                    {formatCAGR(cagrResult.data.cagr5Y)}
                  </Text>
                </View>
                <View style={styles.cagrItem}>
                  <Text style={styles.cagrLabel}>10 Year CAGR</Text>
                  <Text style={[
                    styles.cagrValue,
                    cagrResult.data.cagr10Y === 'N/A' && styles.cagrValueNA
                  ]}>
                    {formatCAGR(cagrResult.data.cagr10Y)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.suggestion}>
                <TrendingUp size={16} color="#00D4AA" />
                <Text style={styles.suggestionText}>
                  💡 We suggest using {defaultCAGR}% as a conservative estimate for long-term planning
                </Text>
              </View>
              
              {cagrResult.data.yearlyData && cagrResult.data.yearlyData.length > 0 && (
                <View style={styles.yearlyBreakdown}>
                  <Text style={styles.breakdownTitle}>Recent Performance</Text>
                  <View style={styles.yearlyGrid}>
                    {cagrResult.data.yearlyData.slice(-3).map((yearData) => (
                      <View key={yearData.year} style={styles.yearItem}>
                        <Text style={styles.yearText}>{yearData.year}</Text>
                        <Text style={styles.priceText}>{formatPrice(yearData.price)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              <View style={styles.disclaimer}>
                <Text style={styles.disclaimerText}>
                  📈 {cagrResult.isFallback ? 'Fallback data' : 'Data from Twelve Data'} • Updated: {formatLastUpdate(cagrResult.data.lastUpdate)}
                </Text>
                <Text style={styles.disclaimerSubtext}>
                  Past performance doesn't guarantee future results
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00D4AA" />
              <Text style={styles.loadingText}>Loading market data...</Text>
            </View>
          )}
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
  },
  spinning: {
    // Add rotation animation if needed
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
    transition: 'transform 0.3s ease',
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  content: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 16,
  },
  fallbackWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  fallbackWarningText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  cagrGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cagrItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cagrLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginBottom: 8,
    textAlign: 'center',
  },
  cagrValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#00D4AA',
    textAlign: 'center',
  },
  cagrValueNA: {
    color: '#64748B',
    fontSize: 14,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 170, 0.2)',
  },
  suggestionText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#00D4AA',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  yearlyBreakdown: {
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  yearlyGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  yearItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  yearText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#94A3B8',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  disclaimer: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  disclaimerText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
  },
  disclaimerSubtext: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#94A3B8',
    marginTop: 12,
  },
});