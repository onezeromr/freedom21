import React, { useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated } from 'react-native';

interface ModernSliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
  formatValue?: (value: number) => string;
  label?: string;
  color?: string;
}

export default function ModernSlider({
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
  formatValue = (val) => val.toString(),
  label,
  color = '#00D4AA',
}: ModernSliderProps) {
  const [sliderWidth, setSliderWidth] = useState(0);
  const animatedValue = new Animated.Value(value);

  const getValueFromPosition = (position: number) => {
    const percentage = Math.max(0, Math.min(1, position / sliderWidth));
    const rawValue = minimumValue + percentage * (maximumValue - minimumValue);
    return Math.round(rawValue / step) * step;
  };

  const getPositionFromValue = (val: number) => {
    const percentage = (val - minimumValue) / (maximumValue - minimumValue);
    return percentage * sliderWidth;
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      // Add haptic feedback for web
    },
    onPanResponderMove: (evt, gestureState) => {
      const newValue = getValueFromPosition(gestureState.moveX);
      if (newValue !== value) {
        onValueChange(newValue);
      }
    },
  });

  const thumbPosition = getPositionFromValue(value);
  const fillWidth = (thumbPosition / sliderWidth) * 100;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Text style={[styles.value, { color }]}>{formatValue(value)}</Text>
      
      <View
        style={styles.sliderContainer}
        onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={styles.track} />
        <View style={[styles.fill, { width: `${fillWidth}%`, backgroundColor: color }]} />
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: color,
              left: thumbPosition - 12,
              shadowColor: color,
            },
          ]}
        />
      </View>
      
      <View style={styles.labels}>
        <Text style={styles.labelText}>{formatValue(minimumValue)}</Text>
        <Text style={styles.labelText}>{formatValue(maximumValue)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  value: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
  },
  fill: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  labelText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
});