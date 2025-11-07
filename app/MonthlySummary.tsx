import { useRouter } from 'expo-router';
import { useCallback, useState, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, ActivityIndicator, Platform, FlatList, Image, Dimensions, SafeAreaView } from 'react-native';
import { loadGoals } from '../lib/storage';
import { useFocusEffect } from '@react-navigation/native';
import 'react-native-get-random-values';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { useDarkMode } from '../context/DarkModeContext';
import { Goal, Task, ProgressEntry } from '../types';

const screenWidth = Dimensions.get('window').width;
const EmptyOngoingIcon = require('../assets/images/ongoing_icon.png');
const EmptyCompletedIcon = require('../assets/images/completed_icon.png');
const EmptyUnsuccessfulIcon = require('../assets/images/unsuccessful_icon.png');
const backIcon = require('../assets/images/arrow-left.png');
const forwardIcon = require('../assets/images/right-arrow.png');

function getTodayDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function convertBuddhistYearToAD(dateString: string): string {
  const parts = dateString.split('-');
  if (parts.length === 3) {
    let year = parseInt(parts[0], 10);
    if (year > 2500) year -= 543;
    return `${year}-${parts[1]}-${parts[2]}`;
  }
  return dateString;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date: Date): Date {
  const startOfWeek = getStartOfWeek(date);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
}

function getMonthName(date: Date): string {
    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    return monthNames[date.getMonth()];
}

interface GoalProgressResult {
    completed: number;
    target: number;
    percent: number;
    progressText: string;
    isUnsuccessful: boolean;
    isCompleted: boolean;
    isOngoing: boolean;
    isFuture: boolean;
    isRelevantForMonth: boolean;
}

function calculateGoalProgress(goal: Goal, targetDate: Date): GoalProgressResult {
    const selectedMonth = targetDate.getMonth();
    const selectedYear = targetDate.getFullYear();
    const startOfSelectedMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfSelectedMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let completedCount = 0;
    let targetValue = 0;
    let progressPercent = 0;
    let progressDisplayText = '';
    let isUnsuccessful = false;
    let isCompleted = false;
    let isOngoing = false;
    let isFuture = false;
    let isRelevantForMonth = true;

    const goalStartDate = goal.startDate ? new Date(convertBuddhistYearToAD(goal.startDate)) : null;
    const goalEndDate = goal.endDate ? new Date(convertBuddhistYearToAD(goal.endDate)) : null;
    const createdDate = goal.createdAt ? new Date(convertBuddhistYearToAD(goal.createdAt.split('T')[0])) : null;

    if (goalStartDate && goalStartDate > endOfSelectedMonth) {
        isRelevantForMonth = false;
        isFuture = true; 
        progressDisplayText = `🗓️ เป้าหมายจะเริ่มวันที่ ${goal.startDate}`;
        return { completed: 0, target: 1, percent: 0, progressText: progressDisplayText, isUnsuccessful: false, isCompleted: false, isOngoing: false, isFuture: true, isRelevantForMonth: false };
    }

    if (goalEndDate && goalEndDate < startOfSelectedMonth) {
        isRelevantForMonth = false;
        progressDisplayText = `เป้าหมายสิ้นสุดไปแล้ว`;
        return { completed: 0, target: 1, percent: 0, progressText: progressDisplayText, isUnsuccessful: false, isCompleted: false, isOngoing: false, isFuture: false, isRelevantForMonth: false };
    }

    if (startOfSelectedMonth > today) {
        isFuture = true;
        progressDisplayText = `🗓️ เป้าหมายจะเริ่มในเดือน ${getMonthName(targetDate)}`;
        return { completed: 0, target: 1, percent: 0, progressText: progressDisplayText, isUnsuccessful: false, isCompleted: false, isOngoing: false, isFuture: true, isRelevantForMonth: true };
    }

    const effectiveStartDate = goalStartDate || createdDate;
    if (effectiveStartDate && effectiveStartDate > startOfSelectedMonth && effectiveStartDate.getMonth() !== selectedMonth) {
        isRelevantForMonth = false;
        isFuture = true; 
        progressDisplayText = `🗓️ เป้าหมายจะเริ่มวันที่ ${goal.startDate || goal.createdAt?.split('T')[0]}`; 
        return { completed: 0, target: 1, percent: 0, progressText: progressDisplayText, isUnsuccessful: false, isCompleted: false, isOngoing: false, isFuture: true, isRelevantForMonth: false };
    }


    isOngoing = true;

    if (goal.isReadingGoal && goal.type === 'longterm') {
        const relevantProgressEntries = goal.detailedProgress?.filter(entry => {
            const entryDate = new Date(convertBuddhistYearToAD(entry.date));
            return entryDate >= startOfSelectedMonth && entryDate <= endOfSelectedMonth;
        }) || [];
        completedCount = relevantProgressEntries.reduce((sum, entry) => sum + (entry.value || 0), 0);
        targetValue = goal.targetPage || 1; 
        progressPercent = targetValue > 0 ? Math.min(100, (completedCount / targetValue) * 100) : 0;

        if (completedCount >= targetValue) {
            isCompleted = true;
            progressDisplayText = `✅ อ่านจบแล้ว ${completedCount} หน้าในเดือนนี้!`;
        } else if (goalEndDate && goalEndDate < today && completedCount < targetValue) { 
            isUnsuccessful = true;
            progressDisplayText = `❌ ไม่สำเร็จ (อ่านได้ ${completedCount} หน้า)`;
        } else {
            isOngoing = true;
            progressDisplayText = `⏳ อ่านไปแล้ว ${completedCount} หน้าในเดือนนี้ (เป้าหมาย ${targetValue} หน้า)`;
        }
    } else if (goal.type === 'daily') {
        const relevantProgress = goal.progress?.filter(dateString => {
            const d = new Date(convertBuddhistYearToAD(dateString));
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        }) || [];
        completedCount = relevantProgress.length;
        targetValue = new Date(selectedYear, selectedMonth + 1, 0).getDate(); 
        progressPercent = targetValue > 0 ? Math.min(100, (completedCount / targetValue) * 100) : 0;

        if (completedCount >= targetValue) {
            isCompleted = true;
            progressDisplayText = `✅ ทำสำเร็จทุกวันในเดือนนี้!`;
        } else if (endOfSelectedMonth < today) { 
            if (createdDate && createdDate > endOfSelectedMonth) {
                isUnsuccessful = false; 
                isRelevantForMonth = false;
                progressDisplayText = `เป้าหมายยังไม่เริ่มในเดือนนี้`;
            } else {
                isUnsuccessful = true;
                progressDisplayText = `❌ ไม่สำเร็จในเดือนนี้ (${completedCount}/${targetValue} วัน)`;
            }
        } else { 
            isOngoing = true;
            progressDisplayText = `ทำสำเร็จ ${completedCount} วันในเดือนนี้`;
            if (completedCount === 0) progressDisplayText = `ยังไม่ได้เช็คอินในเดือนนี้`;
        }
    } else if (goal.type === 'weekly' || goal.type === 'monthly') {
        const goalPeriodStart = new Date(selectedYear, selectedMonth, 1);
        const goalPeriodEnd = new Date(selectedYear, selectedMonth + 1, 0);
        const periodText = 'ในเดือนนี้';

        const relevantProgressEntries = goal.detailedProgress?.filter(entry => {
            const entryDate = new Date(convertBuddhistYearToAD(entry.date));
            return entryDate >= goalPeriodStart && entryDate <= goalPeriodEnd;
        }) || [];

        if (goal.isReadingGoal) { 
            completedCount = relevantProgressEntries.filter(entry => (entry.value || 0) > 0).length;
        } else {
            completedCount = relevantProgressEntries.length;
        }

        targetValue = goal.targetCount || 1; 
        progressPercent = targetValue > 0 ? Math.min(100, (completedCount / targetValue) * 100) : 0;

        if (completedCount >= targetValue) {
            isCompleted = true;
            progressDisplayText = `✅ ทำสำเร็จแล้ว ${completedCount} / ${targetValue} ครั้ง${periodText}!`;
        } else if (endOfSelectedMonth < today) { 
            if (createdDate && createdDate > endOfSelectedMonth) {
                isUnsuccessful = false; 
                isRelevantForMonth = false;
                progressDisplayText = `เป้าหมายยังไม่เริ่มในเดือนนี้`;
            } else {
                isUnsuccessful = true;
                progressDisplayText = `❌ ไม่สำเร็จในเดือนนี้ (${completedCount}/${targetValue} ครั้ง)`;
            }
        } else {
            isOngoing = true;
            progressDisplayText = `⏳ ทำสำเร็จแล้ว ${completedCount} / ${targetValue} ครั้ง${periodText}`;
        }
    } else if (goal.type === 'longterm') { 
        if (goal.tasks && goal.tasks.length > 0) {
            completedCount = goal.tasks.filter((task: Task) => task.isCompleted).length;
            targetValue = goal.tasks.length;
        } else {
            completedCount = goal.progressCount || 0;
            targetValue = goal.targetCount || 1;
        }
        progressPercent = targetValue > 0 ? Math.min(100, (completedCount / targetValue) * 100) : 0;

        if (completedCount >= targetValue) {
            isCompleted = true;
            progressDisplayText = `✅ ทำสำเร็จแล้ว ${completedCount} / ${targetValue} งาน!`;
        } else if (goalEndDate && goalEndDate < today && completedCount < targetValue) { 
            if (createdDate && createdDate > endOfSelectedMonth) {
                isUnsuccessful = false; 
                isRelevantForMonth = false;
                progressDisplayText = `เป้าหมายยังไม่เริ่มในเดือนนี้`;
            } else {
                isUnsuccessful = true;
                progressDisplayText = `❌ สิ้นสุดแล้ว (ไม่สำเร็จ) ${completedCount} / ${targetValue} งาน`;
            }
        } else {
            isOngoing = true;
            progressDisplayText = `⏳ ทำไปแล้ว ${completedCount} / ${targetValue} งาน`;
        }
    }

    if (isCompleted || isUnsuccessful) isOngoing = false;
    return { completed: completedCount, target: targetValue, percent: progressPercent, isUnsuccessful, isCompleted, isOngoing, isFuture, progressText: progressDisplayText, isRelevantForMonth };
}


function getMonthlyCheckins(goals: Goal[], date: Date): number[] {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const monthlyCheckins: number[] = new Array(daysInMonth).fill(0);

  goals.forEach((goal: Goal) => {
    if (goal.detailedProgress) {
      goal.detailedProgress.forEach((entry: ProgressEntry) => {
        const checkinDate = new Date(convertBuddhistYearToAD(entry.date));
        if (checkinDate.getFullYear() === date.getFullYear() && checkinDate.getMonth() === date.getMonth()) {
          const dayOfMonth = checkinDate.getDate() - 1;
          if (dayOfMonth >= 0 && dayOfMonth < monthlyCheckins.length) {
            if (goal.isReadingGoal && goal.type === 'longterm') {
              if ((entry.value || 0) > 0) monthlyCheckins[dayOfMonth]++;
            } else {
              monthlyCheckins[dayOfMonth]++;
            }
          }
        }
      });
    }
  });
  return monthlyCheckins;
}

function calculateStreaks(goal: Goal): { best: number; current: number } {
  const sortedProgress = [...(goal.progress || [])].map(convertBuddhistYearToAD).sort();
  let bestStreak = 0;
  let currentStreak = 0;

  if (sortedProgress.length === 0) return { best: 0, current: 0 };

  let current = 0;
  let lastDate = new Date(sortedProgress[0]);
  
  for (let i = 0; i < sortedProgress.length; i++) {
    const currentDate = new Date(sortedProgress[i]);
    if (i === 0) {
      current = 1;
    } else {
      const diffDays = Math.round(Math.abs(currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) current++;
      else if (diffDays > 1) current = 1;
    }
    lastDate = currentDate;
    bestStreak = Math.max(bestStreak, current);
  }

  let lastDateInList = new Date(sortedProgress[sortedProgress.length - 1]);
  let todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const diffDaysFromLastCheckin = Math.round(Math.abs(todayDate.getTime() - lastDateInList.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDaysFromLastCheckin <= 1) currentStreak = current;
  else currentStreak = 0;

  return { best: bestStreak, current: currentStreak };
}

const Chart = ({ data, period, selectedDate }: { data: number[]; period: 'weekly' | 'monthly'; selectedDate: Date }) => {
  const { isDarkMode } = useDarkMode();
  const today = new Date();
  const todayNoTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const daysInSelectedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();

  const itemData = useMemo(() => {
    const chartItems: { label: string, value: number, isToday: boolean }[] = [];
    if (period === 'monthly') {
      for (let i = 0; i < daysInSelectedMonth; i++) {
        const isToday = (i + 1) === todayNoTime.getDate() && selectedDate.getMonth() === todayNoTime.getMonth() && selectedDate.getFullYear() === todayNoTime.getFullYear();
        chartItems.push({
          label: (i + 1).toString(),
          value: data[i] || 0,
          isToday: isToday,
        });
      }
    }
    return chartItems;
  }, [data, period, selectedDate, daysInSelectedMonth, todayNoTime]);

  const yAxisMax = Math.max(10, ...data); 
  const yAxisLabels = Array.from({ length: yAxisMax + 1 }, (_, i) => i);
  const chartHeight = 180;
  const itemWidth = screenWidth < 400 ? 30 : 35; 
  const contentWidth = itemData.length * itemWidth;

  const getPoints = useCallback(() => {
    const points: { x: number, y: number }[] = [];
    if (itemData.length === 0) return [];

    itemData.forEach((item, index) => {
      const x = (index * itemWidth) + (itemWidth / 2); 
      const y = chartHeight - (item.value / yAxisMax) * chartHeight;
      points.push({ x, y });
    });
    return points;
  }, [itemData, itemWidth, chartHeight, yAxisMax]);

  const points = getPoints();
  const getPath = useCallback(() => {
    if (points.length < 2) return '';
    let path = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L${points[i].x},${points[i].y}`;
    }
    return path;
  }, [points]);

  return (
    <View style={[styles.chartCard, isDarkMode ? styles.cardDark : styles.cardLight]}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, isDarkMode ? { color: '#bbb' } : null]}>จำนวนเช็คอิน</Text>
      </View>
      <View style={styles.chartView}>
        <View style={styles.yAxis}>
          {yAxisLabels.slice().reverse().map((label, index) => (
            <Text key={index} style={[styles.yAxisLabel, isDarkMode ? { color: '#bbb' } : null]}>{label}</Text>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ width: contentWidth, height: chartHeight + 25 }} 
        >
          <View style={[styles.chartContainerWrapper, { width: contentWidth }]}>
            <Svg height={chartHeight} width={contentWidth} style={styles.svgContainer}>
              {yAxisLabels.slice().reverse().map((_, index) => {
                const y = index * (chartHeight / (yAxisLabels.length - 1));
                return (
                  <Path
                    key={index}
                    d={`M0,${y} L${contentWidth},${y}`}
                    stroke={isDarkMode ? '#333' : '#EFEFEF'}
                    strokeWidth="1"
                  />
                );
              })}
              <Path d={getPath()} stroke="#F78CA0" strokeWidth="2" fill="none" />
              {points.map((point, index) => (
                <Circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#F78CA0"
                />
              ))}
            </Svg>
            <View style={[styles.xAxisContainer, { height: 25, top: chartHeight }]}>
              {itemData.map((item, index) => (
                <View key={index} style={[styles.xAxisItem, { width: itemWidth }]}>
                  <Text style={[styles.xAxisLabel, { color: item.isToday ? '#F78CA0' : (isDarkMode ? '#bbb' : '#888') }]}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default function MonthlySummary() {
  const { isDarkMode } = useDarkMode();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const [ongoingGoals, setOngoingGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [unsuccessfulGoals, setUnsuccessfulGoals] = useState<Goal[]>([]);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [monthlyData, setMonthlyData] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // NEW STATE: สำหรับเก็บค่าอัตราความสำเร็จเฉลี่ย
  const [avgCompletionRate, setAvgCompletionRate] = useState<number>(0);


  const handlePreviousMonth = () => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setSelectedDate(prevDate => {
      const today = new Date();
      const nextMonthDate = new Date(prevDate);
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

      if (nextMonthDate.getFullYear() > today.getFullYear() || 
          (nextMonthDate.getFullYear() === today.getFullYear() && nextMonthDate.getMonth() > today.getMonth())) {
        return prevDate; 
      }
      return nextMonthDate;
    });
  };

  const fetchGoalsAndCategorize = useCallback(async () => {
    setLoading(true);
    const storedGoals = await loadGoals();
    setGoals(storedGoals as Goal[]);

    const dailyGoal = storedGoals.find((g: Goal) => g.type === 'daily' && g.title === 'คุณอ่านหนังสือแล้วหรือยัง?');
    if (dailyGoal) {
      const { best, current } = calculateStreaks(dailyGoal as Goal);
      setBestStreak(best);
      setCurrentStreak(current);
    }

    setMonthlyData(getMonthlyCheckins(storedGoals as Goal[], selectedDate));

    const ongoing: Goal[] = [];
    const completed: Goal[] = [];
    const unsuccessful: Goal[] = [];

    const goalsToCategorize = storedGoals.filter((goal: Goal) => goal.title !== 'คุณอ่านหนังสือแล้วหรือยัง?');

    let completedGoalsInMonth = 0;
    let unsuccessfulGoalsInMonth = 0;

    goalsToCategorize.forEach((goal: Goal) => {
      const { isOngoing, isCompleted, isUnsuccessful, isRelevantForMonth, isFuture } = calculateGoalProgress(goal, selectedDate);
      
      if (isRelevantForMonth && !isFuture) { 
          if (isCompleted) {
              completedGoalsInMonth++;
          } else if (isUnsuccessful) {
              unsuccessfulGoalsInMonth++;
          }
          // Also add to display lists
          if (isCompleted) completed.push(goal);
          else if (isUnsuccessful) unsuccessful.push(goal);
          else if (isOngoing) ongoing.push(goal);
      }
    });

    // Calculate overall average completion rate based on finished goals in the month
    const totalFinishedGoalsInMonth = completedGoalsInMonth + unsuccessfulGoalsInMonth;
    const overallAvgCompletionRate = totalFinishedGoalsInMonth > 0 
                                      ? (completedGoalsInMonth / totalFinishedGoalsInMonth) * 100 
                                      : 0; 


    setOngoingGoals(ongoing);
    setCompletedGoals(completed);
    setUnsuccessfulGoals(unsuccessful);
    setAvgCompletionRate(overallAvgCompletionRate); 
    setLoading(false);
  }, [selectedDate]);

  useFocusEffect(useCallback(() => {
    fetchGoalsAndCategorize();
  }, [fetchGoalsAndCategorize]));

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDarkMode ? { backgroundColor: '#121212' } : null]}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={[styles.loadingText, isDarkMode ? { color: '#ddd' } : null]}>กำลังโหลดข้อมูล...</Text>
      </View>
    );
  }

  const renderGoalSummaryItem = ({ item }: { item: Goal }) => {
    const { progressText, percent, completed, target, isRelevantForMonth, isFuture } = calculateGoalProgress(item, selectedDate);
    
    if (!isRelevantForMonth || isFuture) {
      return null;
    }

    let progressDisplay = progressText;
    if (item.type === 'weekly' || item.type === 'monthly') {
        progressDisplay = `ทำสำเร็จ ${completed} / ${target} ครั้ง (${percent.toFixed(0)}%)`;
    } else if (item.type === 'daily') {
        const today = new Date();
        const endOfSelectedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);

        if (endOfSelectedMonth < today) { 
            if (completed === 0) {
                progressDisplay = `❌ ไม่สำเร็จในเดือนนี้`;
            } else {
                progressDisplay = `ทำสำเร็จ ${completed} วัน จาก ${target} วันในเดือนนี้`;
            }
        } else { 
            if (completed === 0) {
                progressDisplay = `ยังไม่ได้เช็คอินในเดือนนี้`;
            } else {
                progressDisplay = `ทำสำเร็จ ${completed} วันในเดือนนี้`;
            }
        }
    } else if (item.type === 'longterm') {
    }


    return (
      <View style={[styles.goalSummaryCard, isDarkMode ? styles.cardDark : styles.cardLight]}>
        <View style={styles.goalSummaryHeader}>
          <Text style={[styles.goalSummaryTitle, isDarkMode ? { color: '#ECF0F1' } : null]}>{item.title}</Text>
        </View>
        <Text style={[styles.goalSummaryProgressText, isDarkMode ? { color: '#ccc' } : null]}>
          {progressDisplay}
        </Text>
        {item.type !== 'daily' && (
          <View style={[styles.progressBarBackground, isDarkMode ? { backgroundColor: '#333' } : null]}>
            <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
          </View>
        )}
      </View>
    );
  };

  const today = new Date();
  const isNextMonthDisabled = 
    selectedDate.getMonth() === today.getMonth() && 
    selectedDate.getFullYear() === today.getFullYear();

  return (
    <SafeAreaView style={[styles.outerContainer, isDarkMode ? styles.bgDark : styles.bgLight]}>
        <ScrollView style={styles.scrollViewContainer} contentContainerStyle={styles.scrollViewContent}>
            <LinearGradient
                colors={['#f2a99d', '#b19cd9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientHeaderInScroll}
            >
                <View style={styles.headerBarContentInScroll}>
                   <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}><Image source={backIcon} style={[styles.headerBackIcon, { tintColor: '#FFFFFF' }]} />
</TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerPageTitle}>ภาพรวมเป้าหมายทั้งหมด</Text>
                    </View>

                    <View style={{ width: 34 + (styles.headerBackButton.padding * 2) }} />
                </View>
            </LinearGradient>

            <View style={[styles.container, isDarkMode ? styles.bgDark : styles.bgLight]}>
                <View style={styles.streakContainer}>
                    <LinearGradient colors={['#F78CA0', '#F9B2A6']} style={styles.streakCard}>
                        <View style={styles.bestStreakContainer}>
                            <Text style={styles.streakLabel}>สถิติที่เคยทำได้ดีที่สุด</Text>
                            <Text style={styles.streakNumber}>{bestStreak}</Text>
                            <Text style={styles.streakUnit}>streak</Text>
                        </View>
                        <View style={styles.fireImageContainer}>
                            <Image source={require('../assets/images/fireST.png')} style={styles.fireImage} />
                        </View>
                        <View style={styles.currentStreakContainer}>
                            <Text style={styles.streakLabel}>ล่าสุด</Text>
                            <Text style={styles.streakNumber}>{currentStreak}</Text>
                            <Text style={styles.streakUnit}>streak</Text>
                        </View>
                    </LinearGradient>
                </View>

                <View style={[styles.summaryStatsContainer, isDarkMode ? styles.cardDark : styles.cardLight]}>
                    <Text style={[styles.summaryStatTitle, isDarkMode ? { color: '#ECF0F1' } : null]}>สถานะปัจจุบัน</Text>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: '#FFC107' }]}>{ongoingGoals.length}</Text>
                            <Text style={[styles.summaryLabel, isDarkMode ? { color: '#bbb' } : null]}>กำลังดำเนินอยู่</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: '#2ECC71' }]}>{completedGoals.length}</Text>
                            <Text style={[styles.summaryLabel, isDarkMode ? { color: '#bbb' } : null]}>สำเร็จ</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, { color: '#EF5350' }]}>{unsuccessfulGoals.length}</Text>
                            <Text style={[styles.summaryLabel, isDarkMode ? { color: '#bbb' } : null]}>ไม่สำเร็จ</Text>
                        </View>
                    </View>
                    {/* NEW: Average Completion Rate */}
                    <View style={[styles.averageRateContainer, isDarkMode ? {borderTopColor: '#333'} : {}]}>
                        <Text style={[styles.averageRateText, isDarkMode ? { color: '#ECF0F1' } : null]}>
                            อัตราความสำเร็จ:
                        </Text>
                        <Text style={[styles.averageRateValue, { color: '#3498DB' }]}>
                            {avgCompletionRate.toFixed(1)}%
                        </Text>
                    </View>
                </View>

                <View style={[styles.chartSection, isDarkMode ? styles.cardDark : styles.cardLight]}>
                    <View style={styles.monthSelector}>
                        <TouchableOpacity onPress={handlePreviousMonth}>
                                <Image source={backIcon} style={[styles.monthNavIcon, { tintColor: isDarkMode ? '#ECF0F1' : '#2C3E50' }]} />
                        </TouchableOpacity>
                        <Text style={[styles.monthLabel, isDarkMode ? { color: '#ECF0F1' } : null]}>{getMonthName(selectedDate)} {selectedDate.getFullYear()}</Text>
                        <TouchableOpacity onPress={handleNextMonth} disabled={isNextMonthDisabled}>
                                <Image source={forwardIcon} style={[styles.monthNavIcon, 
                                    { tintColor: isNextMonthDisabled ? (isDarkMode ? '#555' : '#ccc') : (isDarkMode ? '#ECF0F1' : '#2C3E50') }]} />
                        </TouchableOpacity>
                    </View>
                    <Chart data={monthlyData} period={'monthly'} selectedDate={selectedDate} />
                </View>

                <Text style={[styles.sectionTitle, isDarkMode ? { color: '#ECF0F1' } : null]}>เป้าหมายที่กำลังดำเนินอยู่ ({ongoingGoals.length})</Text>
                {ongoingGoals.length > 0 ? (
                    <FlatList
                        data={ongoingGoals}
                        keyExtractor={item => item.id}
                        renderItem={renderGoalSummaryItem}
                        scrollEnabled={false}
                        style={styles.goalList}
                    />
                ) : (
                    <View style={styles.emptyGoalsContainer}>
                        <Image source={EmptyOngoingIcon} style={styles.emptyGoalIcon} />
                        <Text style={[styles.emptyGoalsText, isDarkMode ? { color: '#aaa' } : null]}>ไม่มีเป้าหมายที่กำลังดำเนินอยู่</Text>
                    </View>
                )}

                <Text style={[styles.sectionTitle, isDarkMode ? { color: '#ECF0F1' } : null]}>เป้าหมายที่สำเร็จแล้ว ({completedGoals.length})</Text>
                {completedGoals.length > 0 ? (
                    <FlatList
                        data={completedGoals}
                        keyExtractor={item => item.id}
                        renderItem={renderGoalSummaryItem}
                        scrollEnabled={false}
                        style={styles.goalList}
                    />
                ) : (
                    <View style={styles.emptyGoalsContainer}>
                        <Image source={EmptyCompletedIcon} style={styles.emptyGoalIcon} />
                        <Text style={[styles.emptyGoalsText, isDarkMode ? { color: '#aaa' } : null]}>ยังไม่มีเป้าหมายที่สำเร็จ</Text>
                    </View>
                )}

                <Text style={[styles.sectionTitle, isDarkMode ? { color: '#ECF0F1' } : null]}>เป้าหมายที่ไม่สำเร็จ ({unsuccessfulGoals.length})</Text>
                {unsuccessfulGoals.length > 0 ? (
                    <FlatList
                        data={unsuccessfulGoals}
                        keyExtractor={item => item.id}
                        renderItem={renderGoalSummaryItem}
                        scrollEnabled={false}
                        style={styles.goalList}
                    />
                ) : (
                    <View style={styles.emptyGoalsContainer}>
                        <Image source={EmptyUnsuccessfulIcon} style={styles.emptyGoalIcon} />
                        <Text style={[styles.emptyGoalsText, isDarkMode ? { color: '#aaa' } : null]}>ไม่มีเป้าหมายที่ไม่สำเร็จ</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  gradientHeaderInScroll: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    marginBottom: 20,
  },
  headerBarContentInScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'android' ? 10 : 15,
    minHeight: Platform.OS === 'android' ? 60 : 70,
  },
  headerBackButton: {
    padding: 5,
  },
  headerTitleContainer: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPageTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  scrollViewContainer: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  container: {
    paddingHorizontal: 15,
  },
  bgLight: {
    backgroundColor: '#F7F9FC',
  },
  bgDark: {
    backgroundColor: '#121212',
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardDark: {
    backgroundColor: '#1E1E1E',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#555',
  },
  summaryStatsContainer: {
    borderRadius: 12,
    marginVertical: 10,
    padding: 15,
  },
  summaryStatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34495E',
    marginBottom: 10,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  // NEW STYLES for average rate
  averageRateContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0', 
    paddingTop: 10,
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  averageRateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495E',
  },
  averageRateValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34495E',
    marginTop: 20,
    marginBottom: 10,
  },
  goalList: {
    paddingBottom: 10,
  },
  goalSummaryCard: {
    borderRadius: 12,
    marginVertical: 6,
    padding: 15,
  },
  goalSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  goalSummaryTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#34495E',
    flexShrink: 1,
    marginRight: 10,
  },
  goalSummaryType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
    fontStyle: 'italic',
  },
  goalSummaryProgressText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
  },
  progressBarBackground: {
    height: 7,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2ECC71',
    borderRadius: 4,
  },
  emptyGoalsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    marginHorizontal: 15,
  },
  emptyGoalIcon: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    tintColor: '#a0a0a0',
  },
  emptyGoalsText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  streakContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  streakCard: {
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 600,
  },
  bestStreakContainer: {
    alignItems: 'center',
    flex: 1,
  },
  currentStreakContainer: {
    alignItems: 'center',
    flex: 1,
  },
  streakLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  streakNumber: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  streakUnit: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  fireImageContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fireImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  periodButtonDark: {
    backgroundColor: '#2E2E2E',
  },
  periodButtonActive: {
    backgroundColor: '#F78CA0',
  },
  periodButtonText: {
    fontWeight: 'bold',
  },
  periodButtonTextDark: {
    color: '#aaa',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  chartSection: {
    borderRadius: 12,
    marginVertical: 10,
    padding: 15,
    paddingTop: 10,
  },
  chartCard: {
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  chartHeader: {
    paddingVertical: 10,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  chartView: {
    flexDirection: 'row',
    height: 200,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingRight: 10,
    alignItems: 'flex-end',
    width: 40,
  },
  yAxisLabel: {
    fontSize: 12,
    color: '#888',
  },
  chartContainerWrapper: {
    position: 'relative',
    height: '100%',
  },
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  xAxisContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  xAxisItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  xAxisLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginHorizontal: 15,
  },
  monthNavIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  headerBackIcon: { 
    width: 28, 
    height: 28,
    resizeMode: 'contain',
  },
});