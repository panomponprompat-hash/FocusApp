import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image, 
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const backIcon = require('../assets/images/arrow-left.png');
const reloadIcon = require('../assets/images/reload.png');
const playIcon = require('../assets/images/play.png');
const pauseIcon = require('../assets/images/pause.png');
const skipNextIcon = require('../assets/images/skip-next.png');
const foodAppleIcon = require('../assets/images/pomodoro.png');

const CIRCLE_SIZE = 250;
const HALF_CIRCLE_SIZE = CIRCLE_SIZE / 2;
const PROGRESS_THICKNESS = 15;

type TimerState = 'focus' | 'short_break' | 'long_break';

export default function PomodoroScreen() {
  const navigation = useNavigation();

  const FOCUS_TIME = 25 * 60;
  const SHORT_BREAK_TIME = 5 * 60;
  const LONG_BREAK_TIME = 15 * 60;
  const POMODORO_CYCLES_BEFORE_LONG_BREAK = 4;

  const [timeRemaining, setTimeRemaining] = useState(FOCUS_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [timerState, setTimerState] = useState<TimerState>('focus');
  const [pomodoroCount, setPomodoroCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef(AppState.currentState);

  const animatedRotation = useSharedValue(0);
  const animatedRightHalfOpacity = useSharedValue(1);

  const requestPermissions = useCallback(async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert(
        'การแจ้งเตือน',
        'โปรดเปิดใช้งานการแจ้งเตือนในการตั้งค่าอุปกรณ์เพื่อรับการแจ้งเตือน Pomodoro'
      );
    }
  }, []);

  useEffect(() => {
    requestPermissions();
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (isRunning) {
          setIsRunning(false);
        }
      }
      appState.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, [isRunning, requestPermissions]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timerRef.current!);
            handleTimerEnd();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    let totalTime = FOCUS_TIME;
    if (timerState === 'short_break') totalTime = SHORT_BREAK_TIME;
    if (timerState === 'long_break') totalTime = LONG_BREAK_TIME;
    const progress = timeRemaining / totalTime;
    const rotationDegrees = (1 - progress) * 360;
    animatedRotation.value = withTiming(rotationDegrees, {
      duration: 1000,
      easing: Easing.linear,
    });
    if (rotationDegrees > 180) {
      animatedRightHalfOpacity.value = withTiming(0, { duration: 0 });
    } else {
      animatedRightHalfOpacity.value = withTiming(1, { duration: 0 });
    }
  }, [timeRemaining, timerState, animatedRotation, animatedRightHalfOpacity]);

  useEffect(() => {
    if (timerState === 'focus') setTimeRemaining(FOCUS_TIME);
    if (timerState === 'short_break') setTimeRemaining(SHORT_BREAK_TIME);
    if (timerState === 'long_break') setTimeRemaining(LONG_BREAK_TIME);
  }, [timerState]);

  const scheduleNotification = async (title: string, body: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n${body}`);
      return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        sound: 'default',
      },
      trigger: null,
    });
  };

  const handleTimerEnd = () => {
    setIsRunning(false);
    if (timerState === 'focus') {
      setPomodoroCount(prevCount => prevCount + 1);
      scheduleNotification('หมดเวลาโฟกัสแล้ว!', 'ได้เวลาพักแล้วครับ');
      if ((pomodoroCount + 1) % POMODORO_CYCLES_BEFORE_LONG_BREAK === 0) {
        setTimerState('long_break');
        setTimeRemaining(LONG_BREAK_TIME);
      } else {
        setTimerState('short_break');
        setTimeRemaining(SHORT_BREAK_TIME);
      }
    } else {
      scheduleNotification('หมดเวลาพักแล้ว!', 'กลับมาโฟกัสกันต่อ!');
      setTimerState('focus');
      setTimeRemaining(FOCUS_TIME);
    }
    Alert.alert(
      timerState === 'focus' ? 'หมดเวลาโฟกัส!' : 'หมดเวลาพัก!',
      timerState === 'focus' ? 'ได้เวลาพักแล้ว' : 'กลับมาโฟกัสกันต่อ',
      [{ text: 'ตกลง', onPress: () => { } }]
    );
  };

  const startPauseTimer = () => {
    setIsRunning(prev => !prev);
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRunning(false);
    setTimerState('focus');
    setTimeRemaining(FOCUS_TIME);
    setPomodoroCount(0);
    animatedRotation.value = withTiming(0, { duration: 300 });
    animatedRightHalfOpacity.value = withTiming(1, { duration: 0 });
  };

  const skipTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsRunning(false);
    handleTimerEnd();
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const animatedLeftHalfStyle = useAnimatedStyle(() => {
    const rotation = animatedRotation.value > 180 ? animatedRotation.value - 180 : 0;
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const animatedRightHalfStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${Math.min(animatedRotation.value, 180)}deg` }],
      opacity: animatedRightHalfOpacity.value,
    };
  });

  const getBackgroundColor = () => {
    switch (timerState) {
      case 'focus':
        return '#F5B041';
      case 'short_break':
        return '#85C1E9';
      case 'long_break':
        return '#82E0AA';
      default:
        return '#F5B041';
    }
  };

  const getStatusText = () => {
    switch (timerState) {
      case 'focus':
        return 'ช่วงเวลาโฟกัส';
      case 'short_break':
        return 'พักสั้นๆ';
      case 'long_break':
        return 'พักยาวๆ';
      default:
        return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        {/* ⬅️ ใช้ Image สำหรับปุ่มย้อนกลับ */}
        <Image source={backIcon} style={styles.iconStyle} />
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', marginBottom: 20, gap: 10 }}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            timerState === 'focus' && styles.modeButtonActive,
            { backgroundColor: '#FF6B6B' }
          ]}
          onPress={() => setTimerState('focus')}
        >
          <Text style={styles.modeButtonText}>ทำงาน</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            timerState === 'short_break' && styles.modeButtonActive,
            { backgroundColor: '#6BB3FF' }
          ]}
          onPress={() => setTimerState('short_break')}
        >
          <Text style={styles.modeButtonText}>พักสั้น</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            timerState === 'long_break' && styles.modeButtonActive,
            { backgroundColor: '#6BFF8B' }
          ]}
          onPress={() => setTimerState('long_break')}
        >
          <Text style={styles.modeButtonText}>พักยาว</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.timerContainer}>
        <View style={styles.outerCircle}>
          <View style={styles.innerCircle} />
          <View style={styles.circleLayerBackground} />
          <View style={[styles.progressCircleLayer, styles.leftHalfBackground]} />
          <View style={[styles.progressCircleLayer, styles.rightHalfBackground]} />
          <Animated.View style={[styles.progressCircleLayer, styles.leftHalf, animatedLeftHalfStyle]} />
          <Animated.View style={[styles.progressCircleLayer, styles.rightHalf, animatedRightHalfStyle]} />
        </View>
        <Text style={styles.timeText}>{formatTime(timeRemaining)}</Text>
      </View>

      <Text style={styles.statusText}>{getStatusText()}</Text>

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={resetTimer}>
          {/* ⬅️ ใช้ Image สำหรับปุ่มรีเซ็ต */}
          <Image source={reloadIcon} style={styles.iconStyle} />
          <Text style={styles.controlButtonText}>รีเซ็ต</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.playPauseButton} onPress={startPauseTimer}>
          {/* ⬅️ ใช้ Image สำหรับปุ่ม Play/Pause */}
          <Image source={isRunning ? pauseIcon : playIcon} style={styles.playPauseIconStyle} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={skipTimer}>
          {/* ⬅️ ใช้ Image สำหรับปุ่มข้าม */}
          <Image source={skipNextIcon} style={styles.iconStyle} />
          <Text style={styles.controlButtonText}>ข้าม</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pomodoroCountContainer}>
        {/* ⬅️ ใช้ Image สำหรับไอคอน Pomodoro Count */}
        <Image source={foodAppleIcon} style={styles.pomodoroIconStyle} />
        <Text style={styles.pomodoroCountText}>
          รอบที่ทำสำเร็จ: {pomodoroCount}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  iconStyle: { // ⬅️ Style สำหรับไอคอนทั่วไป
    width: 28,
    height: 28,
    tintColor: '#FFFFFF', // ทำให้เป็นสีขาว
    resizeMode: 'contain',
  },
  playPauseIconStyle: { // ⬅️ Style สำหรับปุ่ม Play/Pause ที่อาจมีขนาดต่างกัน
    width: 40,
    height: 40,
    tintColor: '#FFFFFF',
    resizeMode: 'contain',
  },
  pomodoroIconStyle: { // ⬅️ Style สำหรับไอคอน Pomodoro Count
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
    resizeMode: 'contain',
  },
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 4,
    opacity: 0.9,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  modeButtonActive: {
    borderWidth: 2,
    borderColor: '#333',
    opacity: 1,
    backgroundColor: '#fff',
  },
  modeButtonText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  outerCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: CIRCLE_SIZE - PROGRESS_THICKNESS * 2,
    height: CIRCLE_SIZE - PROGRESS_THICKNESS * 2,
    borderRadius: (CIRCLE_SIZE - PROGRESS_THICKNESS * 2) / 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    position: 'absolute',
    zIndex: 2,
  },
  circleLayerBackground: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    zIndex: 0,
  },
  progressCircleLayer: {
    width: HALF_CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  leftHalfBackground: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    left: 0,
    borderTopLeftRadius: HALF_CIRCLE_SIZE,
    borderBottomLeftRadius: HALF_CIRCLE_SIZE,
    transformOrigin: 'right',
  },
  rightHalfBackground: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    right: 0,
    borderTopRightRadius: HALF_CIRCLE_SIZE,
    borderBottomRightRadius: HALF_CIRCLE_SIZE,
    transformOrigin: 'left',
  },
  leftHalf: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    left: 0,
    borderTopLeftRadius: HALF_CIRCLE_SIZE,
    borderBottomLeftRadius: HALF_CIRCLE_SIZE,
    transformOrigin: 'right',
    zIndex: 1,
  },
  rightHalf: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    right: 0,
    borderTopRightRadius: HALF_CIRCLE_SIZE,
    borderBottomRightRadius: HALF_CIRCLE_SIZE,
    transformOrigin: 'left',
    zIndex: 1,
  },
  timeText: {
    position: 'absolute',
    fontSize: 50,
    fontWeight: 'bold',
    color: '#333',
    textShadowColor: 'rgba(255,255,255,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    zIndex: 3,
  },
  statusText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 50,
    textShadowColor: 'rgba(255,255,255,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 350,
    marginBottom: 40,
  },
  controlButton: {
    alignItems: 'center',
    padding: 10,
    opacity: 0.9,
  },
  controlButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 5,
  },
  playPauseButton: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  pomodoroCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  pomodoroCountText: {
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});