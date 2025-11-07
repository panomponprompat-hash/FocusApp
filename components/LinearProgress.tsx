// components/LinearProgress.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface LinearProgressProps {
  progress: number;
}

const LinearProgress: React.FC<LinearProgressProps> = ({ progress }) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <View style={styles.progressBarBackground}>
      <View style={[styles.progressBarFill, { width: `${clampedProgress}%` }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  progressBarBackground: {
    height: 10,
    backgroundColor: '#E0E6EB',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 5,
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3498DB',
    borderRadius: 5,
  },
});

export default LinearProgress;