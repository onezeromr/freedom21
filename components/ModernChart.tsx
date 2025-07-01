import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const { width } = Dimensions.get('window');

interface ChartData {
  year: string;
  asset: number;
  bitcoin: number;
}

interface ModernChartProps {
  data: ChartData[];
  assetName: string;
  assetColor?: string;
  bitcoinColor?: string;
}

export default function ModernChart({ 
  data, 
  assetName, 
  assetColor = '#00D4AA', 
  bitcoinColor = '#F59E0B' 
}: ModernChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  // Ensure all values are positive and calculate proper domain
  const allValues = data.flatMap(d => [d.asset, d.bitcoin]).filter(v => v >= 0);
  const maxValue = Math.max(...allValues);
  const minValue = 0; // Always start from 0 for investment portfolios

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipLabel}>Year {label}</Text>
          {payload.map((entry: any, index: number) => (
            <Text key={index} style={[styles.tooltipValue, { color: entry.color }]}>
              {entry.name}: {formatCurrency(Math.max(0, entry.value))}
            </Text>
          ))}
        </View>
      );
    }
    return null;
  };

  // Ensure data has no negative values
  const sanitizedData = data.map(item => ({
    ...item,
    asset: Math.max(0, item.asset),
    bitcoin: Math.max(0, item.bitcoin)
  }));

  return (
    <View style={styles.container}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={sanitizedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="assetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={assetColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={assetColor} stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="bitcoinGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={bitcoinColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={bitcoinColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis 
            dataKey="year" 
            stroke="#94A3B8" 
            fontSize={12}
            fontFamily="Inter-Medium"
          />
          <YAxis 
            tickFormatter={formatCurrency}
            stroke="#94A3B8"
            fontSize={12}
            fontFamily="Inter-Medium"
            domain={[0, 'dataMax']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="bitcoin"
            stroke={bitcoinColor}
            strokeWidth={3}
            fill="url(#bitcoinGradient)"
            name="Bitcoin Benchmark"
          />
          <Area
            type="monotone"
            dataKey="asset"
            stroke={assetColor}
            strokeWidth={3}
            fill="url(#assetGradient)"
            name={assetName}
          />
        </AreaChart>
      </ResponsiveContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tooltip: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
  },
  tooltipLabel: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    marginBottom: 4,
  },
  tooltipValue: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    marginBottom: 2,
  },
});