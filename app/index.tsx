import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Image,
  Platform,
} from 'react-native';
import { deleteGoal, loadGoals, saveGoals } from '../lib/storage';
import { Goal, ProgressEntry } from '../types';

import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

import { useFocusEffect } from '@react-navigation/native';
import AICoach from '../components/AICoach';
import LinearProgress from '../components/LinearProgress';
import { useDarkMode } from '../context/DarkModeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { backupGoals } from '../lib/storage';

const bookOpenOutlineIcon = require('../assets/images/book-open-outline.png');
const sunnyIcon = require('../assets/images/sunny.png');
const moonIcon = require('../assets/images/moon.png');
const targetIcon = require('../assets/images/target.png');
const fireIcon = require('../assets/images/fire2.png');
const calendarTodayIcon = require('../assets/images/calendar.png');
const calendarWeekIcon = require('../assets/images/calendar.png');
const calendarMonthIcon = require('../assets/images/calendar.png');
const calendarMultipleIcon = require('../assets/images/calendar.png');
const bookVariantIcon = require('../assets/images/book-open-outline.png');
const helpCircleOutlineIcon = require('../assets/images/information.png');
const checkCircleOutlineIcon = require('../assets/images/check.png');
const timerSandEmptyIcon = require('../assets/images/timer-sand-empty.png');
const checkCircleIcon = require('../assets/images/check.png');
const closeCircleIcon = require('../assets/images/close.png');
const clipboardListOutlineIcon = require('../assets/images/information.png');
const progressCheckIcon = require('../assets/images/check.png');
const informationOutlineIcon = require('../assets/images/information.png');
const trashCanOutlineIcon = require('../assets/images/delete.png');
const plusIcon = require('../assets/images/plus.png');
const closeIcon = require('../assets/images/close.png');
const pomodoroIcon = require('../assets/images/pomodoro.png');
const summaryIcon = require('../assets/images/Summary.png');
const chatbotIcon = require('../assets/images/chatbot.png');
const cloudSyncIcon = require('../assets/images/cloud-sync.png');

const goalTypeIconsMap: { [key: string]: any } = {
  'calendar-today': calendarTodayIcon,
  'calendar-week': calendarWeekIcon,
  'calendar-month': calendarMonthIcon,
  'calendar-multiple': calendarMultipleIcon,
  'book-variant': bookVariantIcon,
  'book-open-outline': bookOpenOutlineIcon,
  'help-circle-outline': helpCircleOutlineIcon,
};

const checkinButtonIconsMap: { [key: string]: any } = {
  'check-circle-outline': checkCircleOutlineIcon,
  'timer-sand-empty': timerSandEmptyIcon,
  'check-circle': checkCircleIcon,
  'close-circle': closeCircleIcon,
  'book-open-outline': bookOpenOutlineIcon,
  'clipboard-list-outline': clipboardListOutlineIcon,
  'progress-check': progressCheckIcon,
  'information-outline': informationOutlineIcon,
};

function getTodayDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function calculateGoalProgress(goal: Goal) {
  const today = new Date();
  const todayNoTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayDateString = getTodayDate();
  let completedCount = 0;
  let targetValue = 0;
  let progressPercent = 0;
  let progressDisplayText = '';
  let isUnsuccessful = false;
  let isCompleted = false;
  let isOngoing = false;
  let streak = 0;
  let isCheckinDisabled = false;
  let checkinButtonText = 'เช็คอิน ✨';
  let checkinButtonIcon: any = "check-circle-outline";
  let isDisplayable = true;
  let goalTypeIcon: any = "book-open-outline";

  let goalTypeLabel = "ทั่วไป";

  if (goal.type === 'daily') {
    goalTypeIcon = "calendar-today";
    goalTypeLabel = "รายวัน";
  } else if (goal.type === 'weekly') {
    goalTypeIcon = "calendar-week";
    goalTypeLabel = "รายสัปดาห์";
  } else if (goal.type === 'monthly') {
    goalTypeIcon = "calendar-month";
    goalTypeLabel = "รายเดือน";
  } else if (goal.type === 'longterm') {
    goalTypeIcon = "calendar-multiple";
    goalTypeLabel = "ระยะยาว";
  }

  if (goal.isReadingGoal && goal.type === 'longterm') {
    goalTypeIcon = "book-variant";
    goalTypeLabel = "อ่านหนังสือ (ระยะยาว)";
    if (goal.startDate && goal.endDate) {
      const start = new Date(goal.startDate);
      const end = new Date(goal.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      completedCount = goal.currentPage || 0;
      targetValue = goal.targetPage || 1;
      progressPercent = Math.min(100, (completedCount / targetValue) * 100);

      if (todayNoTime < start) {
        isOngoing = true;
        progressPercent = 0;
        completedCount = 0;
        progressDisplayText = `⏳ เริ่มวันที่ ${goal.startDate}`;
        isCheckinDisabled = true;
        checkinButtonText = 'ยังไม่ถึงวันเริ่ม';
        checkinButtonIcon = "timer-sand-empty";
        isDisplayable = true;
      } else if (todayNoTime > end) {
        if (completedCount >= targetValue) {
          isCompleted = true;
          isOngoing = false;
          progressDisplayText = `✅ อ่าน "${goal.bookTitle || 'เป้าหมายนี้'}" จบแล้ว!`;
          isCheckinDisabled = true;
          checkinButtonText = 'อ่านจบแล้ว 🎉';
          checkinButtonIcon = "check-circle";
          isDisplayable = false;
        } else {
          isUnsuccessful = true;
          isOngoing = false;
          progressDisplayText = `❌ อ่าน "${goal.bookTitle || 'เป้าหมายนี้'}" ไม่สำเร็จ`;
          isCheckinDisabled = true;
          checkinButtonText = 'ไม่สำเร็จ 😔';
          checkinButtonIcon = "close-circle";
          isDisplayable = false;
        }
      } else {
        isOngoing = true;
        const pagesRead = completedCount - (goal.startPage || 0);
        const totalPagesToRead = targetValue - (goal.startPage || 0);

        if (totalPagesToRead <= 0 || pagesRead >= totalPagesToRead) {
          progressPercent = 100;
          progressDisplayText = `✅ อ่านจบแล้ว!`;
          isCompleted = true;
          isOngoing = false;
          isCheckinDisabled = true;
          checkinButtonText = 'อ่านจบแล้ว 🎉';
          checkinButtonIcon = "check-circle";
          isDisplayable = false;
        } else {
          progressPercent = Math.min(100, (pagesRead / totalPagesToRead) * 100);
          progressDisplayText = `⏳ อ่านไปแล้ว ${pagesRead} จาก ${totalPagesToRead} หน้า (${progressPercent.toFixed(0)}%)`;
          isCheckinDisabled = false;
          checkinButtonText = 'บันทึกความคืบหน้า 📖';
          checkinButtonIcon = "book-open-outline";
          isDisplayable = true;
        }
      }
    } else {
      completedCount = goal.currentPage || 0;
      targetValue = goal.targetPage || 1;
      progressPercent = Math.min(100, (completedCount / targetValue) * 100);
      if (completedCount >= targetValue) {
        isCompleted = true;
        isOngoing = false;
        progressDisplayText = `✅ อ่านครบ ${completedCount} / ${targetValue} หน้าแล้ว!`;
        isCheckinDisabled = true;
        checkinButtonText = 'อ่านครบแล้ว 🎉';
        checkinButtonIcon = "check-circle";
        isDisplayable = false;
      } else {
        isOngoing = true;
        progressDisplayText = `⏳ อ่านไปแล้ว ${completedCount} / ${targetValue} หน้า`;
        isCheckinDisabled = false;
        checkinButtonText = 'บันทึกความคืบหน้า 📖';
        checkinButtonIcon = "book-open-outline";
        isDisplayable = true;
      }
    }
  } else if (goal.type === 'daily' || goal.title === 'คุณอ่านหนังสือแล้วหรือยัง?') {
    const hasCompletedToday = goal.progress?.includes(todayDateString);

    const sortedProgress = [...(goal.progress || [])].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    let currentStreak = 0;
    let lastDate: Date | null = null;

    for (const dateString of sortedProgress) {
      const currentDate = new Date(dateString);
      currentDate.setHours(0, 0, 0, 0);

      if (lastDate === null) {
        currentStreak = 1;
      } else {
        const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      }
      lastDate = currentDate;
    }

    if (!hasCompletedToday && lastDate) {
      const diffTime = Math.abs(todayNoTime.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak = currentStreak;
      } else if (diffDays > 1) {
        streak = 0;
      } else {
        streak = currentStreak;
      }
    } else if (!hasCompletedToday && (goal.progress?.length || 0) > 0) {
      streak = 0;
    } else {
      streak = currentStreak;
    }

    if (hasCompletedToday) {
      completedCount = 1;
      targetValue = 1;
      progressPercent = 100;
      progressDisplayText = `✅ ทำสำเร็จแล้ววันนี้!`;
      isCompleted = true;
      isOngoing = true;
      isCheckinDisabled = true;
      checkinButtonText = 'เช็คอินวันนี้แล้ว 👍';
      checkinButtonIcon = "check-circle";
    } else {
      completedCount = 0;
      targetValue = 1;
      progressPercent = 0;
      progressDisplayText = `วันนี้ยังไม่ได้เช็คอิน`;
      isOngoing = true;
      isCheckinDisabled = false;
      checkinButtonText = 'เช็คอิน ✨';
      checkinButtonIcon = "check-circle-outline";
    }
    isDisplayable = true;
  } else if (goal.type === 'weekly' || goal.type === 'monthly') {
    completedCount = goal.progressCount || 0;
    targetValue = goal.targetCount || 1;
    progressPercent = Math.min(100, (completedCount / targetValue) * 100);

    let goalPeriodEnd: Date | null = null;
    let periodText = '';

    if (goal.type === 'weekly') {
      goalPeriodEnd = getEndOfWeek(today);
      periodText = 'สัปดาห์นี้';
    } else if (goal.type === 'monthly') {
      goalPeriodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      periodText = 'เดือนนี้';
    }

    const hasCheckedInToday = (goal.detailedProgress || []).some((entry: ProgressEntry) => entry.date === todayDateString);

    if (completedCount >= targetValue) {
      isCompleted = true;
      isOngoing = false;
      progressDisplayText = `✅ ทำสำเร็จแล้ว ${completedCount} / ${targetValue} ใน${periodText}!`;
      isCheckinDisabled = true;
      checkinButtonText = 'ทำสำเร็จแล้ว 🎉';
      checkinButtonIcon = "check-circle";
      isDisplayable = false;
    } else if (goalPeriodEnd && todayNoTime > goalPeriodEnd) {
      isUnsuccessful = true;
      isOngoing = false;
      progressDisplayText = `❌ ไม่สำเร็จ: ทำได้ ${completedCount} / ${targetValue} ใน${periodText}`;
      isCheckinDisabled = true;
      checkinButtonText = 'ไม่สำเร็จ 😔';
      checkinButtonIcon = "close-circle";
      isDisplayable = false;
    } else {
      isOngoing = true;
      if (hasCheckedInToday) {
        isCheckinDisabled = true;
        checkinButtonText = 'เช็คอินวันนี้แล้ว 👍';
        checkinButtonIcon = "check-circle";
        progressDisplayText = `✅ เช็คอินแล้ววันนี้ (${completedCount} / ${targetValue} ใน${periodText})!`;
      } else {
        progressDisplayText = `⏳ ทำไปแล้ว ${completedCount} / ${targetValue} ใน${periodText}`;
        isCheckinDisabled = false;
        checkinButtonText = 'เช็คอิน ✨';
        checkinButtonIcon = "check-circle-outline";
      }
      isDisplayable = true;
    }
  } else if (goal.type === 'longterm') {
    goalTypeIcon = "calendar-multiple";
    goalTypeLabel = "ระยะยาว";

    if (goal.tasks && goal.tasks.length > 0) {
      completedCount = goal.tasks.filter((task: any) => task.isCompleted).length;
      targetValue = goal.tasks.length;
      progressPercent = targetValue > 0 ? Math.min(100, (completedCount / targetValue) * 100) : 0;
      progressDisplayText = `⏳ ทำไปแล้ว ${completedCount} / ${targetValue} รายการ`;
      checkinButtonText = 'จัดการ Tasks';
      checkinButtonIcon = "clipboard-list-outline";
    } else {
      completedCount = goal.progressCount || 0;
      targetValue = goal.targetCount || 1;
      progressPercent = Math.min(100, (completedCount / targetValue) * 100);
      progressDisplayText = `⏳ ทำไปแล้ว ${completedCount} / ${targetValue} (โดยรวม)`;
      checkinButtonText = 'บันทึกความคืบหน้า 📈';
      checkinButtonIcon = "progress-check";
    }

    const hasCheckedInToday = (goal.detailedProgress || []).some((entry: ProgressEntry) => entry.date === todayDateString && !entry.isSkipped);

    if (goal.endDate) {
      const end = new Date(goal.endDate);
      end.setHours(23, 59, 59, 999);
      if (todayNoTime > end) {
        if (completedCount >= targetValue) {
          isCompleted = true;
          isOngoing = false;
          progressDisplayText = `✅ ทำสำเร็จแล้ว ${completedCount} / ${targetValue} (สิ้นสุด ${goal.endDate})!`;
          isCheckinDisabled = true;
          checkinButtonText = 'ทำสำเร็จแล้ว 🎉';
          checkinButtonIcon = "check-circle";
          isDisplayable = false;
        } else {
          isUnsuccessful = true;
          isOngoing = false;
          progressDisplayText = `❌ ไม่สำเร็จ: ทำได้ ${completedCount} / ${targetValue} (สิ้นสุด ${goal.endDate})`;
          isCheckinDisabled = true;
          checkinButtonText = 'ไม่สำเร็จ 😔';
          checkinButtonIcon = "close-circle";
          isDisplayable = false;
        }
      } else {
        isOngoing = true;
        if (completedCount >= targetValue) {
          isCompleted = true;
          isOngoing = false;
          progressDisplayText = `✅ ทำสำเร็จแล้ว ${completedCount} / ${targetValue} (โดยรวม)!`;
          isCheckinDisabled = true;
          checkinButtonText = 'ทำสำเร็จแล้ว 🎉';
          checkinButtonIcon = "check-circle";
          isDisplayable = false;
        } else {
          isCheckinDisabled = false;
        }
        isDisplayable = true;
      }
    } else {
      isOngoing = true;
      if (completedCount >= targetValue) {
        isCompleted = true;
        isOngoing = false;
        progressDisplayText = `✅ ทำสำเร็จแล้ว ${completedCount} / ${targetValue} (โดยรวม)!`;
        isCheckinDisabled = true;
        checkinButtonText = 'ทำสำเร็จแล้ว 🎉';
        checkinButtonIcon = "check-circle";
        isDisplayable = false;
      } else {
        isCheckinDisabled = false;
      }
      isDisplayable = true;
    }
  } else {
    isOngoing = true;
    progressDisplayText = 'ยังไม่มีความคืบหน้า';
    checkinButtonText = 'บันทึกความคืบหน้า';
    checkinButtonIcon = "information-outline";
    isDisplayable = true;
    goalTypeIcon = "help-circle-outline";
    goalTypeLabel = "ไม่ระบุ";
  }
  return { completed: completedCount, target: targetValue, percent: progressPercent, progressText: progressDisplayText, isUnsuccessful, isCompleted, isOngoing, streak, isCheckinDisabled, checkinButtonText, checkinButtonIcon, isDisplayable, goalTypeIcon, goalTypeLabel };
}

export default function Home() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showSubButtons, setShowSubButtons] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const hasReadingGoal = goals.some(goal => goal.isReadingGoal);
  const activeReadingGoal = goals.find(goal => goal.isReadingGoal && goal.type === 'longterm');
  const totalBooksRead = goals.filter(goal => goal.isReadingGoal && calculateGoalProgress(goal).isCompleted).length;

  const ensureDailyGoalExists = useCallback(async () => {
    let allGoals = await loadGoals();
    let dailyReadingGoal = allGoals.find((g: Goal) => g.type === 'daily' && g.title === 'คุณอ่านหนังสือแล้วหรือยัง?');

    if (!dailyReadingGoal) {
      const newDailyReadingGoal: Goal = {
        id: `daily-reading-checkin-${Date.now()}`,
        title: 'คุณอ่านหนังสือแล้วหรือยัง?',
        description: 'เป้าหมายประจำวันเพื่อติดตามว่าคุณอ่านหนังสือแล้วหรือไม่',
        type: 'daily',
        isReadingGoal: true,
        progress: [],
        createdAt: new Date().toISOString(),
        detailedProgress: []
      };
      allGoals.push(newDailyReadingGoal);
      await saveGoals(allGoals);
    } else {
      if (dailyReadingGoal.type !== 'daily' || dailyReadingGoal.isReadingGoal !== true) {
        dailyReadingGoal.type = 'daily';
        dailyReadingGoal.isReadingGoal = true;
        await saveGoals(allGoals);
      }
    }
  }, []);

  const fetchGoals = useCallback(async () => {
    setRefreshing(true);
    await ensureDailyGoalExists();

    const allGoals: Goal[] = await loadGoals();

    const filteredGoals = allGoals.filter((goal: Goal) => {
      const progressStatus = calculateGoalProgress(goal);
      const isCompleted = progressStatus.isCompleted;
      const isUnsuccessful = progressStatus.isUnsuccessful;

      if (goal.type === 'daily' || goal.title === 'คุณอ่านหนังสือแล้วหรือยัง?') {
        return true;
      }

      if ((goal.type === 'weekly' || goal.type === 'monthly' || goal.type === 'longterm') && (isCompleted || isUnsuccessful)) {
        return false;
      }

      if (goal.isReadingGoal && goal.type === 'longterm' && (isCompleted || isUnsuccessful)) {
        return false;
      }

      return true;
    });

    filteredGoals.sort((a, b) => {
      const titleA = a.title || '';
      const titleB = b.title || '';
      if (titleA === 'คุณอ่านหนังสือแล้วหรือยัง?') return -1;
      if (titleB === 'คุณอ่านหนังสือแล้วหรือยัง?') return 1;

      const typeOrder: { [key: string]: number } = { 'daily': 1, 'weekly': 2, 'monthly': 3, 'longterm': 4 };
      if (typeOrder[a.type] < typeOrder[b.type]) return -1;
      if (typeOrder[a.type] > typeOrder[b.type]) return 1;

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    setGoals(filteredGoals);
    setRefreshing(false);
  }, [ensureDailyGoalExists]);

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, [fetchGoals])
  );

  const markProgress = async (goal: Goal) => {
    const allGoals: Goal[] = await loadGoals();
    const currentGoalData = allGoals.find((g: Goal) => g.id === goal.id);
    if (!currentGoalData) return;

    const { isCompleted } = calculateGoalProgress(currentGoalData);
    const todayDateString = getTodayDate();

    if (isCompleted && currentGoalData.type !== 'daily' && currentGoalData.title !== 'คุณอ่านหนังสือแล้วหรือยัง?') {
      Alert.alert('ทำสำเร็จแล้ว!', `เป้าหมาย "${currentGoalData.title}" ทำสำเร็จแล้ว`);
      return;
    }

    if (currentGoalData.type === 'daily' || currentGoalData.title === 'คุณอ่านหนังสือแล้วหรือยัง?') {
      const hasCompletedToday = currentGoalData.progress?.includes(todayDateString);

      if (hasCompletedToday) {
        Alert.alert('ทำสำเร็จแล้ว!', `คุณได้เช็คอินเป้าหมาย "${currentGoalData.title}" สำหรับวันนี้แล้ว`);
        return;
      }

      const updatedProgress = [...(currentGoalData.progress || []), todayDateString];
      const updatedDetailedProgress = [...(currentGoalData.detailedProgress || []), { date: todayDateString, note: 'เช็คอินประจำวัน' }];

      const updatedGoal: Goal = {
        ...currentGoalData,
        progress: updatedProgress,
        progressCount: (currentGoalData.progressCount || 0) + 1,
        detailedProgress: updatedDetailedProgress
      };

      setGoals(prevGoals => prevGoals.map((g: Goal) => g.id === updatedGoal.id ? updatedGoal : g));
      await saveGoals(allGoals.map((g: Goal) => g.id === updatedGoal.id ? updatedGoal : g));
      Alert.alert('ยอดเยี่ยม!', `คุณได้เช็คอิน "${currentGoalData.title}" สำหรับวันนี้แล้ว!`);
      fetchGoals();

    } else if (currentGoalData.isReadingGoal && currentGoalData.type === 'longterm') {
      Alert.prompt(
        'บันทึกความคืบหน้าการอ่าน',
        `คุณอ่านถึงหน้าไหนแล้วของหนังสือ "${currentGoalData.bookTitle || currentGoalData.title}"?`,
        [
          {
            text: 'ยกเลิก',
            style: 'cancel',
          },
          {
            text: 'บันทึก',
            onPress: async (pageInput) => {
              const newPage = parseInt(pageInput || '0');
              const startPage = currentGoalData.startPage || 0;
              const targetPage = currentGoalData.targetPage || 1;

              if (isNaN(newPage) || newPage < 0) {
                Alert.alert('ผิดพลาด', 'กรุณากรอกตัวเลขหน้าที่ถูกต้อง');
                return;
              }
              if (newPage < (currentGoalData.currentPage || 0)) {
                Alert.alert('ผิดพลาด', 'หน้าที่บันทึกต้องมากกว่าหรือเท่ากับหน้าที่อ่านไปแล้ว');
                return;
              }
              if (newPage > targetPage) {
                Alert.alert('แจ้งเตือน', `คุณอ่านเกินเป้าหมายแล้ว! (${newPage} > ${targetPage})`);
              }

              const updatedGoal: Goal = {
                ...currentGoalData,
                currentPage: newPage,
                detailedProgress: [...(currentGoalData.detailedProgress || []), {
                  date: todayDateString,
                  value: newPage,
                  note: `อ่านถึงหน้า ${newPage}`
                }]
              };

              setGoals(prevGoals => prevGoals.map((g: Goal) => g.id === updatedGoal.id ? updatedGoal : g));
              await saveGoals(allGoals.map((g: Goal) => g.id === updatedGoal.id ? updatedGoal : g));
              fetchGoals();
            },
          },
        ],
        'plain-text',
        (currentGoalData.currentPage || currentGoalData.startPage || 0).toString(),
        'numeric'
      );
    } else if (currentGoalData.type === 'weekly' || currentGoalData.type === 'monthly' || currentGoalData.type === 'longterm') {
      const { isCompleted } = calculateGoalProgress(currentGoalData);
      if (isCompleted) {
        Alert.alert('ทำสำเร็จแล้ว!', `เป้าหมาย "${currentGoalData.title}" ทำสำเร็จแล้ว`);
        return;
      }

      const hasCheckedInToday = (currentGoalData.detailedProgress || []).some((entry: ProgressEntry) => entry.date === todayDateString && !entry.isSkipped);
      if (hasCheckedInToday) {
        Alert.alert('ทำสำเร็จแล้ว!', `คุณได้เช็คอินเป้าหมาย "${currentGoalData.title}" สำหรับวันนี้แล้ว`);
        return;
      }

      if (currentGoalData.type === 'longterm' && currentGoalData.tasks && currentGoalData.tasks.length > 0) {
        router.push(`/goals/manageTasks/${currentGoalData.id}`);
        return;
      }

      let updatedProgressCount = (currentGoalData.progressCount || 0) + 1;
      let updatedDetailedProgress = [...(currentGoalData.detailedProgress || [])];
      updatedDetailedProgress.push({ date: todayDateString, note: 'บันทึกความคืบหน้า' });

      const updatedGoal: Goal = {
        ...currentGoalData,
        progressCount: updatedProgressCount,
        detailedProgress: updatedDetailedProgress
      };

      setGoals(prevGoals => prevGoals.map((g: Goal) => g.id === updatedGoal.id ? updatedGoal : g));
      await saveGoals(allGoals.map((g: Goal) => g.id === updatedGoal.id ? updatedGoal : g));
      Alert.alert('ยอดเยี่ยม!', `บันทึกความคืบหน้าสำหรับ "${currentGoalData.title}" แล้ว!`);
      fetchGoals();
    } else {
      Alert.alert('ยังไม่รองรับ', `ยังไม่มีการกำหนดวิธีการเช็คอินสำหรับเป้าหมาย "${currentGoalData.title}" ประเภทนี้`);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    const goalToDelete = goals.find((g: Goal) => g.id === goalId);
    if (!goalToDelete) {
      console.log('Goal not found.');
      return;
    }

    if (goalToDelete.type === 'daily') {
      Alert.alert('ไม่สามารถลบได้', 'เป้าหมายประเภทรายวันไม่สามารถลบได้จากหน้านี้');
      return;
    }

    if (Platform.OS === 'web') {
      const isConfirmed = window.confirm(`คุณต้องการลบเป้าหมาย "${goalToDelete.title}" ใช่หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้`);
      if (isConfirmed) {
        await deleteGoal(goalId);
        fetchGoals();
        alert(`เป้าหมาย "${goalToDelete.title}" ถูกลบแล้ว`);
      }
    } else {
      Alert.alert(
        'ยืนยันการลบเป้าหมาย',
        `คุณต้องการลบเป้าหมาย "${goalToDelete.title}" ใช่หรือไม่? การกระทำนี้ไม่สามารถยกเลิกได้`,
        [
          {
            text: 'ยกเลิก',
            style: 'cancel',
          },
          {
            text: 'ลบ',
            style: 'destructive',
            onPress: async () => {
              await deleteGoal(goalId);
              fetchGoals();
              Alert.alert('ลบเรียบร้อย', `เป้าหมาย "${goalToDelete.title}" ถูกลบแล้ว`);
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  const toggleSubButtons = () => {
    setShowSubButtons(prev => !prev);
  };

  const calculateAllOngoingCheckinSummary = () => {
    let checkedInTodayCount = 0;
    let totalOngoingGoals = 0;

    goals.forEach(goal => {
      const { isOngoing } = calculateGoalProgress(goal);
      const isCheckedInToday = (goal.type === 'daily' && (goal.progress || []).includes(getTodayDate())) ||
        (goal.type !== 'daily' && (goal.detailedProgress || []).some(entry => entry.date === getTodayDate() && !entry.isSkipped));

      if (isOngoing) {
        totalOngoingGoals++;
        if (isCheckedInToday) {
          checkedInTodayCount++;
        }
      }
    });

    return { checkedInTodayCount, totalOngoingGoals };
  };

  const { checkedInTodayCount, totalOngoingGoals } = calculateAllOngoingCheckinSummary();
  const progressPercentSummary = (checkedInTodayCount / totalOngoingGoals) * 100 || 0;

  const renderEmptyComponent = () => (
    <View style={[styles.emptyState, { flex: 1, backgroundColor: isDarkMode ? '#121212' : '#F5F5F5' }]}>
      <Image source={bookOpenOutlineIcon} style={[styles.emptyStateIcon, { tintColor: isDarkMode ? '#555' : '#a0a0a0' }]} />
      <Text style={[styles.emptyStateText, { color: isDarkMode ? '#A0A0A0' : '#7F8C8D' }]}>
        ยังไม่มีเป้าหมายเพิ่มเติม (นอกเหนือจากเป้าหมายประจำวัน)
        มาสร้างนิสัยที่ดีไปด้วยกัน! 📚
      </Text>
      <TouchableOpacity
        style={[styles.addButtonLarge]}
        onPress={() => {
          router.push('/goals/new');
        }}
      >
        <Text style={styles.addButtonLargeText}>
          + เพิ่มเป้าหมายใหม่
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isDarkMode ? styles.containerDark : styles.containerLight]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.headerTitle, isDarkMode ? styles.headerTitleDark : styles.headerTitleLight]}>เป้าหมายของคุณ 🌟</Text>
          <Text style={[styles.subtitle, isDarkMode ? styles.subtitleDark : styles.subtitleLight]}>มาสร้างนิสัยที่ดีไปด้วยกัน!</Text>
        </View>
        <TouchableOpacity onPress={toggleDarkMode} style={styles.darkModeToggle}>
          <Image source={isDarkMode ? sunnyIcon : moonIcon} style={[styles.darkModeToggleIcon, { tintColor: isDarkMode ? '#FFD700' : '#2C3E50' }]} />
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={goals.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : styles.flatListContentContainer}
        data={goals}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyComponent}
        ListHeaderComponent={() => (
          <>
            {goals.length > 0 && (
              <LinearGradient
                colors={['#FFADAD', '#FF6F61']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.summaryCardCustom}
              >
                <View style={styles.summaryContentCustom}>
                  <Text style={styles.summaryTextCustom}>วันนี้</Text>
                  <Text style={styles.summaryTextCustom}>คุณเช็คอินทั้งหมด</Text>
                  <Text style={styles.summaryCountCustom}>
                    {checkedInTodayCount}/{totalOngoingGoals}
                  </Text>
                  <Text style={styles.summaryLabelCustom}>เป้าหมาย</Text>
                </View>
                <View style={styles.summaryImageContainer}>
                  <Image source={targetIcon} style={styles.summaryImage} />
                </View>
                <View style={styles.streakProgressBarContainer}>
                  <View style={styles.streakProgressBarBackground}>
                    <View style={[styles.streakProgressBarFill, { width: `${progressPercentSummary}%` }]} />
                    <Image
                      source={fireIcon}
                      style={[
                        styles.streakFireIcon,
                        { left: `${progressPercentSummary}%` }
                      ]}
                    />
                  </View>
                </View>
              </LinearGradient>
            )}

            <AICoach
              hasActiveReadingGoal={hasReadingGoal}
              activeReadingGoalData={activeReadingGoal}
              totalBooksRead={totalBooksRead}
            />

            {goals.length > 0 && (
              <View style={styles.headerContainer}>
                <Text style={[styles.summarySectionTitle, isDarkMode ? styles.summarySectionTitleDark : styles.summarySectionTitleLight]}>เป้าหมายทั้งหมด</Text>
              </View>
            )}
          </>
        )}
        renderItem={({ item }) => {
          const { percent, progressText, isCheckinDisabled, checkinButtonText, checkinButtonIcon, goalTypeIcon, goalTypeLabel, isCompleted, isOngoing } = calculateGoalProgress(item);

          const isDeletable = item.type !== 'daily';

          const { isUnsuccessful } = calculateGoalProgress(item);
          const isLongTermGoalWithTasks = item.type === 'longterm' && item.tasks && item.tasks.length > 0;
          const isCheckinButtonFullWidth = item.type !== 'daily' && item.title !== 'คุณอ่านหนังสือแล้วหรือยัง?';

          if (!calculateGoalProgress(item).isDisplayable) {
            return null;
          }

          return (
            <View style={[styles.card, isDarkMode ? styles.cardDark : styles.cardLight]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleContainer}>
                  <Image source={goalTypeIconsMap[goalTypeIcon] || bookOpenOutlineIcon} style={[styles.goalIcon, { tintColor: isDarkMode ? "#A3B18A" : "#4A6572", width: 22, height: 22 }]} />
                  <Text style={[styles.goalTitle, isDarkMode ? styles.goalTitleDark : styles.goalTitleLight]}>{item.title}</Text>
                </View>

                {isDeletable && (
                  <TouchableOpacity
                    onPress={() => handleDeleteGoal(item.id)}
                    style={styles.deleteButton}
                  >
                    <Image source={trashCanOutlineIcon} style={[{ tintColor: '#E74C3C', width: 20, height: 20 }]} />
                  </TouchableOpacity>
                )}
              </View>

              {item.description ? (
                <Text style={[styles.goalDescription, isDarkMode ? styles.goalDescriptionDark : styles.goalDescriptionLight]}>{item.description}</Text>
              ) : null}

              <Text style={[styles.goalTypeLabel, isDarkMode ? styles.goalTypeLabelDark : styles.goalTypeLabelLight]}>ประเภท: {goalTypeLabel}</Text>

              {item.type === 'daily' ? (
                <View style={styles.dailyGoalActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.dailyCheckinButton,
                      isCheckinDisabled ? styles.dailyCheckinButtonDisabled : styles.dailyCheckinButtonUnchecked,
                    ]}
                    onPress={() => markProgress(item)}
                    disabled={isCheckinDisabled}
                  >
                    <Image
                      source={checkinButtonIconsMap[checkinButtonIcon] || checkCircleOutlineIcon}
                      style={[styles.dailyCheckinBtnIcon, { tintColor: '#fff', width: 24, height: 24 }]}
                    />
                    <Text style={styles.dailyCheckinBtnText}>
                      {checkinButtonText}
                    </Text>
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.dailyStreakBox,
                      (isCheckinDisabled && item.progress?.includes(getTodayDate())) ? styles.dailyStreakBoxActive : (isDarkMode ? styles.dailyStreakBoxDark : styles.dailyStreakBoxLight)
                    ]}
                  >
                    <Image source={fireIcon} style={styles.fireImage} />
                    <Text style={[styles.dailyStreakText, isDarkMode ? styles.dailyStreakTextDark : styles.dailyStreakTextLight]}>
                      ต่อเนื่อง: <Text style={styles.dailyStreakNumber}>{calculateGoalProgress(item).streak || 0}</Text> วัน
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={[styles.progressText, isDarkMode ? styles.progressTextDark : styles.progressTextLight]}>
                    {progressText}
                  </Text>
                  <LinearProgress progress={percent} />
                  {isCompleted || isUnsuccessful ? (
                    <Text style={[styles.completedMessage, isDarkMode ? styles.completedMessageDark : styles.completedMessageLight]}>{progressText}</Text>
                  ) : (
                    <View style={styles.buttonRow}>
                      {isLongTermGoalWithTasks ? (
                        <TouchableOpacity
                          style={[
                            styles.checkinButton,
                            isCompleted || !isOngoing ? styles.checkinButtonDisabled : styles.checkinButtonActive,
                            styles.fullButton
                          ]}
                          onPress={() => router.push(`/goals/manageTasks/${item.id}`)}
                          disabled={isCompleted || !isOngoing}
                        >
                          <Image
                            source={clipboardListOutlineIcon}
                            style={[styles.checkinIcon, { tintColor: '#fff', width: 20, height: 20 }]}
                          />
                          <Text style={styles.checkinButtonText}>
                            จัดการ Tasks ({item.tasks?.filter((t: any) => t.isCompleted).length || 0}/{item.tasks?.length || 0})
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.checkinButton,
                            isCheckinDisabled ? styles.checkinButtonDisabled : styles.checkinButtonActive,
                            isCheckinButtonFullWidth ? styles.fullButton : null
                          ]}
                          onPress={() => markProgress(item)}
                          disabled={isCheckinDisabled}
                        >
                          <Image
                            source={checkinButtonIconsMap[checkinButtonIcon] || checkCircleOutlineIcon}
                            style={[styles.checkinIcon, { tintColor: '#fff', width: 20, height: 20 }]}
                          />
                          <Text style={styles.checkinButtonText}>
                            {checkinButtonText}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchGoals}
            tintColor={isDarkMode ? '#ECF0F1' : '#2C3E50'}
          />
        }
      />
      <View style={styles.fabContainer}>
        {showSubButtons && (
          <View style={styles.subFabButtonsWrapper}>
            <View style={styles.subFabRow}>
              <Text style={styles.subFabLabel}>โหมด Pomodoro</Text>
              <TouchableOpacity style={styles.subFab} onPress={() => {
                router.push('/Pomodoro');
                toggleSubButtons();
              }}>
                <Image source={pomodoroIcon} style={styles.subFabIcon} />
              </TouchableOpacity>
            </View>
            <View style={styles.subFabRow}>
              <Text style={styles.subFabLabel}>สรุปรายเดือน</Text>
              <TouchableOpacity style={styles.subFab} onPress={() => {
                router.push('/MonthlySummary');
                toggleSubButtons();
              }}>
                <Image source={summaryIcon} style={styles.subFabIcon} />
              </TouchableOpacity>
            </View>
            <View style={styles.subFabRow}>
              <Text style={styles.subFabLabel}>เพิ่มเป้าหมาย</Text>
              <TouchableOpacity style={styles.subFab} onPress={() => {
                router.push('/goals/new');
                toggleSubButtons();
              }}>
                <Image source={plusIcon} style={styles.subFabIcon} />
              </TouchableOpacity>
            </View>
            <View style={styles.subFabRow}>
              <Text style={styles.subFabLabel}>ผู้ช่วย AI</Text>
              <TouchableOpacity style={styles.subFab} onPress={() => {
                router.push('/ChatbotScreen');
                toggleSubButtons();
              }}>
                <Image source={chatbotIcon} style={styles.subFabIcon} />
              </TouchableOpacity>
            </View>
            <View style={styles.subFabRow}>
              <Text style={styles.subFabLabel}>สำรอง/กู้คืน</Text>
              <TouchableOpacity style={styles.subFab} onPress={() => {
                router.push('/backup');
                toggleSubButtons();
              }}>
                <Image source={cloudSyncIcon} style={styles.subFabIcon} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        <TouchableOpacity style={styles.mainFab} onPress={toggleSubButtons}>
          <Image
            source={showSubButtons ? closeIcon : plusIcon}
            style={[{ tintColor: '#fff', width: 24, height: 24 }]}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerLight: {
    backgroundColor: '#F5F5F5',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerTitleLight: {
    color: '#2C3E50',
  },
  headerTitleDark: {
    color: '#ECF0F1',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  subtitleLight: {
    color: '#7F8C8D',
  },
  subtitleDark: {
    color: '#A0A0A0',
  },
  darkModeToggle: {
    padding: 8,
  },
  flatListContentContainer: {
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summarySectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 16,
  },
  summarySectionTitleLight: {
    color: '#34495E',
  },
  summarySectionTitleDark: {
    color: '#ECF0F1',
  },
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: '#3498DB',
  },
  cardLight: {
    backgroundColor: '#fff',
  },
  cardDark: {
    backgroundColor: '#1E1E1E',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalIcon: {
    marginRight: 8,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  goalTitleLight: {
    color: '#2C3E50',
  },
  goalTitleDark: {
    color: '#ECF0F1',
  },
  deleteButton: {
    marginLeft: 10,
  },
  goalDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  goalDescriptionLight: {
    color: '#7F8C8D',
  },
  goalDescriptionDark: {
    color: '#A0A0A0',
  },
  goalTypeLabel: {
    fontSize: 12,
    marginBottom: 12,
  },
  goalTypeLabelLight: {
    color: '#95A5A6',
  },
  goalTypeLabelDark: {
    color: '#7F8C8D',
  },
  progressText: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressTextLight: {
    color: '#34495E',
  },
  progressTextDark: {
    color: '#BDC3C7',
  },
  completedMessage: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  completedMessageLight: {
    color: '#27AE60',
  },
  completedMessageDark: {
    color: '#2ECC71',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  checkinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  checkinButtonActive: {
    backgroundColor: '#27AE60',
  },
  checkinButtonDisabled: {
    backgroundColor: '#7F8C8D',
  },
  checkinIcon: {
    marginRight: 8,
  },
  checkinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fullButton: {
    flex: 1,
  },
  dailyGoalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dailyCheckinButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  dailyCheckinButtonUnchecked: {
    backgroundColor: '#27AE60',
  },
  dailyCheckinButtonDisabled: {
    backgroundColor: '#7F8C8D',
  },
  dailyCheckinBtnIcon: {
    marginRight: 8,
  },
  dailyCheckinBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dailyStreakBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dailyStreakBoxLight: {
    borderColor: '#BDC3C7',
    backgroundColor: '#ECF0F1',
  },
  dailyStreakBoxDark: {
    borderColor: '#34495E',
    backgroundColor: '#2C3E50',
  },
  dailyStreakBoxActive: {
    borderColor: '#F1C40F',
    backgroundColor: '#FFFBEA',
  },
  fireImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginRight: 4,
  },
  dailyStreakText: {
    fontSize: 14,
  },
  dailyStreakTextLight: {
    color: '#34495E',
  },
  dailyStreakTextDark: {
    color: '#ECF0F1',
  },
  dailyStreakNumber: {
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  addButtonLarge: {
    backgroundColor: '#3498DB',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  addButtonLargeText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  subFabButtonsWrapper: {
    position: 'absolute',
    bottom: 75,
    right: 0,
    alignItems: 'flex-end',
  },
  subFabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subFabLabel: {
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: 2,
  },
  subFab: {
    backgroundColor: '#6A92E8',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: 2,
  },
  subFabIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: '#fff',
  },
  mainFab: {
    backgroundColor: '#27AE60',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryCardCustom: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: '#FF6F61',
  },
  summaryContentCustom: {
    alignSelf: 'flex-start',
    marginBottom: 5,
    flex: 1,
  },
  summaryTextCustom: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'left',
    lineHeight: 20,
  },
  summaryCountCustom: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'left',
    marginVertical: 2,
  },
  summaryLabelCustom: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'left',
  },
  summaryImageContainer: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  summaryImage: {
    width: 140,
    height: 140,
    resizeMode: 'contain',
  },
  streakProgressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  streakProgressBarBackground: {
    flex: 1,
    height: 10,
    backgroundColor: '#FFADAD',
    borderRadius: 5,
    position: 'relative',
    justifyContent: 'center',
  },
  streakProgressBarFill: {
    height: 10,
    backgroundColor: '#FFD180',
    borderRadius: 5,
  },
  streakFireIcon: {
    position: 'absolute',
    width: 25,
    height: 25,
    resizeMode: 'contain',
    transform: [{ translateX: -12.5 }],
    zIndex: 1,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  darkModeToggleIcon: {
    height: 24,
    resizeMode: 'contain',
  },
});