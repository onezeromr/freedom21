import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Cloud, CloudOff, Wifi, WifiOff, Loader } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';

interface CloudSyncIndicatorProps {
  syncing?: boolean;
  lastSync?: Date;
  onPress?: () => void;
}

export default function CloudSyncIndicator({ syncing = false, lastSync, onPress }: CloudSyncIndicatorProps) {
  const { user } = useAuth();

  const getStatusIcon = () => {
    if (syncing) {
      return <Loader size={16} color="#00D4AA" style={styles.spinning} />;
    } else if (user) {
      return <Cloud size={16} color="#00D4AA" />;
    } else {
      return <CloudOff size={16} color="#64748B" />;
    }
  };

  const getStatusText = () => {
    if (syncing) {
      return 'Syncing...';
    } else if (user) {
      if (lastSync) {
        const now = new Date();
        const diffMs = now.getTime() - lastSync.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        
        if (diffMins < 1) {
          return 'Just synced';
        } else if (diffMins < 60) {
          return `Synced ${diffMins}m ago`;
        } else {
          const diffHours = Math.floor(diffMins / 60);
          return `Synced ${diffHours}h ago`;
        }
      } else {
        return 'Cloud sync enabled';
      }
    } else {
      return 'Sign in to sync';
    }
  };

  const getStatusColor = () => {
    if (syncing) return '#00D4AA';
    if (user) return '#00D4AA';
    return '#64748B';
  };

  return (
    <TouchableOpacity
      style={[styles.container, { borderColor: getStatusColor() + '40' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {getStatusIcon()}
        <Text style={[styles.text, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  spinning: {
    // Add rotation animation if needed
  },
});