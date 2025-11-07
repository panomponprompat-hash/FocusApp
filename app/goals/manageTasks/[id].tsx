import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, useReducer } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { loadGoals, saveGoals } from '../../../lib/storage';
import { Goal, Task, TaskStatus } from '../../../types';
import { useFocusEffect } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';
import { useDarkMode } from '../../../context/DarkModeContext';

const alertCircleOutlineIcon = require('../../../assets/images/information.png');
const arrowLeftIcon = require('../../../assets/images/arrow-left.png');
const playlistPlusIcon = require('../../../assets/images/playlist.png');
const plusIcon = require('../../../assets/images/plus.png');
const runFastIcon = require('../../../assets/images/running.png');
const pauseIcon = require('../../../assets/images/pause.png');
const checkIcon = require('../../../assets/images/check.png');
const trashCanOutlineIcon = require('../../../assets/images/delete.png');
const clipboardListOutlineIcon = require('../../../assets/images/clipboard.png');
const playIcon = require('../../../assets/images/play.png');
const checkAllIcon = require('../../../assets/images/check-all.png');
const undoIcon = require('../../../assets/images/undo.png');
const contentSaveOutlineIcon = require('../../../assets/images/save-content.png');
const checkCircleOutlineIcon = require('../../../assets/images/check.png');
const calendarCheckOutlineIcon = require('../../../assets/images/calendar.png');

const iconMap: { [key: string]: any } = {
  'alert-circle-outline': alertCircleOutlineIcon,
  'arrow-left': arrowLeftIcon,
  'playlist-plus': playlistPlusIcon,
  'plus': plusIcon,
  'run-fast': runFastIcon,
  'pause': pauseIcon,
  'check': checkIcon,
  'trash-can-outline': trashCanOutlineIcon,
  'clipboard-list-outline': clipboardListOutlineIcon,
  'play': playIcon,
  'check-all': checkAllIcon,
  'undo': undoIcon,
  'content-save-outline': contentSaveOutlineIcon,
  'check-circle-outline': checkCircleOutlineIcon,
  'calendar-check-outline': calendarCheckOutlineIcon,
};

const getDifficultyRating = (timeInSeconds: number): 'ง่าย' | 'ปานกลาง' | 'ยาก' => {
  const timeInHours = timeInSeconds / 3600;
  if (timeInHours <= 1) {
    return 'ง่าย';
  }
  if (timeInHours > 1 && timeInHours <= 3) {
    return 'ปานกลาง';
  }
  return 'ยาก';
};

const formatTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (num: number) => num.toString().padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};

function getTodayDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface TaskState {
  tasks: Task[];
}

type TaskAction =
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK_STATUS'; payload: { taskId: string; newStatus: TaskStatus } }
  | { type: 'DELETE_TASK'; payload: string };

const tasksReducer = (state: TaskState, action: TaskAction): TaskState => {
  switch (action.type) {
    case 'SET_TASKS':
      return { tasks: action.payload };
    case 'ADD_TASK':
      return { tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK_STATUS': {
      const { taskId, newStatus } = action.payload;
      const updatedTasks = state.tasks.map(task => {
        if (task.id === taskId) {
          let updatedTask = { ...task, status: newStatus };

          if (newStatus === 'doing') {
            const doingTask = state.tasks.find(t => t.status === 'doing');
            if (doingTask && doingTask.id !== taskId) {
              return task;
            }
            updatedTask.currentSessionStartTime = new Date().toISOString();
          } else if (task.status === 'doing' && (newStatus === 'todo' || newStatus === 'done')) {
            if (task.currentSessionStartTime) {
              const sessionStartTime = new Date(task.currentSessionStartTime).getTime();
              const endTime = new Date().getTime();
              const duration = Math.floor((endTime - sessionStartTime) / 1000);
              updatedTask.timeSpentSeconds = (updatedTask.timeSpentSeconds || 0) + duration;
              updatedTask.currentSessionStartTime = undefined;
            }
          }

          if (newStatus === 'done') {
            updatedTask.isCompleted = true;
            updatedTask.completedDate = new Date().toISOString();
          } else if (newStatus === 'todo') {
            updatedTask.isCompleted = false;
            updatedTask.completedDate = undefined;
          }
          return updatedTask;
        }
        return task;
      });
      return { tasks: updatedTasks };
    }
    case 'DELETE_TASK':
      return {
        tasks: state.tasks.filter(task => task.id !== action.payload),
      };
    default:
      return state;
  }
};

export default function ManageTasksPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const goalId = typeof id === 'string' ? id : undefined;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const { isDarkMode } = useDarkMode();

  const [state, dispatch] = useReducer(tasksReducer, { tasks: [] });
  const { tasks } = state;

  const fetchGoal = useCallback(async () => {
    if (!goalId) {
      Alert.alert('ข้อผิดพลาด', 'ไม่พบ ID เป้าหมาย');
      router.back();
      return;
    }
    setLoading(true);
    const allGoals = await loadGoals();
    const foundGoal = allGoals.find(g => g.id === goalId);

    if (foundGoal) {
      const initializedTasks = (foundGoal.tasks || []).map(task => ({
        ...task,
        status: (task.status as TaskStatus | undefined) || 'todo',
        timeSpentSeconds: task.timeSpentSeconds || 0,
        timeEntries: task.timeEntries || [],
      }));
      setGoal(foundGoal);
      dispatch({ type: 'SET_TASKS', payload: initializedTasks });
    } else {
      Alert.alert('ไม่พบเป้าหมาย', 'ไม่พบเป้าหมายที่คุณต้องการจัดการ');
      router.back();
    }
    setLoading(false);
  }, [goalId, router]);

  useFocusEffect(
    useCallback(() => {
      fetchGoal();
    }, [fetchGoal])
  );

  const handleAddTask = () => {
    if (newTaskDescription.trim() === '') {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกรายละเอียด Task');
      return;
    }
    const newTask: Task = {
      id: uuidv4(),
      description: newTaskDescription.trim(),
      isCompleted: false,
      createdAt: new Date().toISOString(),
      status: 'todo',
      timeSpentSeconds: 0,
      timeEntries: [],
    };
    dispatch({ type: 'ADD_TASK', payload: newTask });
    setNewTaskDescription('');
  };

  const updateTaskStatus = useCallback((taskId: string, newStatus: TaskStatus) => {
    dispatch({ type: 'UPDATE_TASK_STATUS', payload: { taskId, newStatus } });
  }, []);

  const handleDeleteTask = (taskId: string) => {
    Alert.alert(
      'ยืนยันการลบ',
      'คุณต้องการลบ Task นี้ใช่หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ', onPress: () => {
            dispatch({ type: 'DELETE_TASK', payload: taskId });
          }
        },
      ]
    );
  };

  const saveChanges = async () => {
    if (!goal) return;
    const tasksToSave = tasks.map(task => {
      if (task.status === 'doing' && task.currentSessionStartTime) {
        const sessionStartTime = new Date(task.currentSessionStartTime).getTime();
        const endTime = new Date().getTime();
        const duration = Math.floor((endTime - sessionStartTime) / 1000);
        return {
          ...task,
          status: 'todo' as TaskStatus,
          timeSpentSeconds: (task.timeSpentSeconds || 0) + duration,
          currentSessionStartTime: undefined,
        };
      }
      return task;
    });

    const updatedGoal = { ...goal, tasks: tasksToSave };

    const today = getTodayDate();
    let updatedProgress = goal.progress ? [...goal.progress] : [];
    let updatedDetailedProgress = goal.detailedProgress ? [...goal.detailedProgress] : [];

    const allGoals = await loadGoals();
    const finalGoals = allGoals.map(g =>
      g.id === updatedGoal.id ? { ...updatedGoal, progress: updatedProgress, detailedProgress: updatedDetailedProgress } : g
    );
    await saveGoals(finalGoals);
    Alert.alert('สำเร็จ!', 'บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว');
    router.back();
  };

  const todoTasks = tasks.filter(task => task.status === 'todo');
  const doingTasks = tasks.filter(task => task.status === 'doing');
  const doneTasks = tasks.filter(task => task.status === 'done');
  const todayDate = getTodayDate();
  const hasCheckedInToday = goal?.detailedProgress?.some(entry => entry.date === todayDate);

  const handleDailyCheckIn = async () => {
    if (!goal) return;
    const todayDate = getTodayDate();
    let updatedProgress = goal.progress ? [...goal.progress] : [];
    let updatedDetailedProgress = goal.detailedProgress ? [...goal.detailedProgress] : [];

    if (updatedDetailedProgress.some(entry => entry.date === todayDate)) {
      Alert.alert('คุณได้เช็คอินแล้ว', 'คุณได้เช็คอินเป้าหมายนี้สำหรับวันนี้แล้ว!');
      return;
    }

    updatedProgress.push(todayDate);
    updatedDetailedProgress.push({ date: todayDate, value: 1 });

    Alert.alert('เช็คอินสำเร็จ!', 'คุณได้เช็คอินเป้าหมายนี้สำหรับวันนี้แล้ว!');

    const allGoals = await loadGoals();
    const updatedGoals = allGoals.map(g =>
      g.id === goal.id ? { ...g, progress: updatedProgress, detailedProgress: updatedDetailedProgress } : g
    );
    await saveGoals(updatedGoals);
    setGoal(prev => prev ? { ...prev, progress: updatedProgress, detailedProgress: updatedDetailedProgress } : null);
  };

  const difficultyMap = {
    'ง่าย': styles.difficultyง่าย,
    'ปานกลาง': styles.difficultyปานกลาง,
    'ยาก': styles.difficultyยาก,
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, isDarkMode ? styles.containerDark : null]}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={[styles.loadingText, isDarkMode ? { color: '#BDC3C7' } : null]}>กำลังโหลดเป้าหมาย...</Text>
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={[styles.errorContainer, isDarkMode ? styles.containerDark : null]}>
        <Image source={iconMap['alert-circle-outline']} style={styles.iconStyleLarge} />
        <Text style={[styles.errorText, isDarkMode ? { color: '#ECF0F1' } : null]}>ไม่พบข้อมูลเป้าหมาย</Text>
        <TouchableOpacity style={styles.returnButton} onPress={() => router.back()}>
          <Text style={styles.returnButtonText}>กลับหน้าหลัก</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.fullScreenContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={[styles.container, isDarkMode ? styles.containerDark : null]}>
        <View style={[styles.header, isDarkMode ? styles.headerDark : null]}>
          <TouchableOpacity onPress={() => { saveChanges(); }} style={styles.backButton}>
            <Image source={iconMap['arrow-left']} style={[styles.iconStyle, { tintColor: isDarkMode ? '#ECF0F1' : '#34495E' }]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isDarkMode ? styles.headerTitleDark : null]}>จัดการ Tasks</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.goalInfoCard, isDarkMode ? styles.goalInfoCardDark : null]}>
            <Text style={[styles.goalTitle, isDarkMode ? styles.goalTitleDark : null]}>{goal.title}</Text>
            {goal.description ? (
              <Text style={[styles.goalDescription, isDarkMode ? styles.goalDescriptionDark : null]}>{goal.description}</Text>
            ) : (
              <Text style={[styles.noDescriptionText, isDarkMode ? styles.noDescriptionTextDark : null]}>ไม่มีคำอธิบายสำหรับเป้าหมายนี้</Text>
            )}

            <TouchableOpacity
              style={[styles.dailyCheckinButton, hasCheckedInToday ? styles.dailyCheckinDone : {}]}
              onPress={handleDailyCheckIn}
              disabled={hasCheckedInToday}
            >
              <Image
                source={hasCheckedInToday ? iconMap['check-circle-outline'] : iconMap['calendar-check-outline']}
                style={[styles.iconStyleSmall, { tintColor: '#fff' }]}
              />
              <Text style={styles.dailyCheckinButtonText}>
                {hasCheckedInToday ? 'เช็คอินวันนี้แล้ว 👍' : 'เช็คอินวันนี้'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.section, isDarkMode ? styles.sectionDark : null]}>
              <Text style={[styles.sectionTitle, isDarkMode ? styles.sectionTitleDark : null]}>
                <Image source={iconMap['playlist-plus']} style={[styles.iconStyleSmall, { marginRight: 8, tintColor: isDarkMode ? '#BDC3C7' : '#4A6572' }]} /> เพิ่ม Task ใหม่
              </Text>
              <View style={styles.addTaskContainer}>
                <TextInput
                  value={newTaskDescription}
                  onChangeText={setNewTaskDescription}
                  placeholder="กรอกรายละเอียด Task ใหม่..."
                  placeholderTextColor={isDarkMode ? '#A0A0A0' : '#A9B7C0'}
                  style={[styles.newTaskInput, isDarkMode ? styles.newTaskInputDark : null]}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={styles.addBtn} onPress={handleAddTask}>
                  <Image source={iconMap['plus']} style={[styles.iconStyleSmall, { tintColor: '#fff' }]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.section, isDarkMode ? styles.sectionDark : null]}>
              <Text style={[styles.sectionTitle, isDarkMode ? styles.sectionTitleDark : null]}>
                <Image source={iconMap['run-fast']} style={[styles.iconStyleSmall, { marginRight: 8, tintColor: isDarkMode ? '#F39C12' : '#F39C12' }]} /> กำลังดำเนินอยู่ (Doing) ({doingTasks.length})
              </Text>
              {doingTasks.length === 0 ? (
                <Text style={[styles.emptyTasksText, isDarkMode ? styles.emptyTasksTextDark : null]}>ยังไม่มี Task ที่กำลังทำอยู่</Text>
              ) : (
                <View style={styles.tasksList}>
                  {doingTasks.map(task => (
                    <View key={task.id} style={[styles.taskItem, styles.doingTaskItem, isDarkMode ? styles.doingTaskItemDark : null]}>
                      <Text style={[styles.taskDescription, isDarkMode ? styles.taskDescriptionDark : null]}>{task.description}</Text>
                      <View style={styles.taskActions}>
                        <TouchableOpacity
                          onPress={() => updateTaskStatus(task.id, 'todo')}
                          style={[styles.taskActionButton, styles.pauseButton]}
                        >
                          <Image source={iconMap['pause']} style={[styles.iconStyleTiny, { tintColor: '#fff' }]} />
                          <Text style={styles.taskActionButtonText}>หยุด</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => updateTaskStatus(task.id, 'done')}
                          style={[styles.taskActionButton, styles.doneButton]}
                        >
                          <Image source={iconMap['check']} style={[styles.iconStyleTiny, { tintColor: '#fff' }]} />
                          <Text style={styles.taskActionButtonText}>เสร็จสิ้น</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteTask(task.id)} style={[styles.taskActionButton, styles.deleteButtonSmall]}>
                          <Image source={iconMap['trash-can-outline']} style={[styles.iconStyleTiny, { tintColor: '#E74C3C' }]} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.section, isDarkMode ? styles.sectionDark : null]}>
              <Text style={[styles.sectionTitle, isDarkMode ? styles.sectionTitleDark : null]}>
                <Image source={iconMap['clipboard-list-outline']} style={[styles.iconStyleSmall, { marginRight: 8, tintColor: isDarkMode ? '#BDC3C7' : '#4A6572' }]} /> ที่ต้องทำ (To Do) ({todoTasks.length})
              </Text>
              {todoTasks.length === 0 ? (
                <Text style={[styles.emptyTasksText, isDarkMode ? styles.emptyTasksTextDark : null]}>ยังไม่มี Task ที่ต้องทำ</Text>
              ) : (
                <View style={styles.tasksList}>
                  {todoTasks.map(task => (
                    <View key={task.id} style={[styles.taskItem, isDarkMode ? styles.taskItemDark : null]}>
                      <Text style={[styles.taskDescription, isDarkMode ? styles.taskDescriptionDark : null]}>{task.description}</Text>
                      <View style={styles.taskActions}>
                        <TouchableOpacity
                          onPress={() => updateTaskStatus(task.id, 'doing')}
                          style={[styles.taskActionButton, styles.startButton]}
                        >
                          <Image source={iconMap['play']} style={[styles.iconStyleTiny, { tintColor: '#fff' }]} />
                          <Text style={styles.taskActionButtonText}>เริ่ม</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteTask(task.id)} style={[styles.taskActionButton, styles.deleteButtonSmall]}>
                          <Image source={iconMap['trash-can-outline']} style={[styles.iconStyleTiny, { tintColor: '#E74C3C' }]} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.section, isDarkMode ? styles.sectionDark : null]}>
              <Text style={[styles.sectionTitle, isDarkMode ? styles.sectionTitleDark : null]}>
                <Image source={iconMap['check-all']} style={[styles.iconStyleSmall, { marginRight: 8, tintColor: '#2ECC71' }]} /> ทำสำเร็จแล้ว (Done) ({doneTasks.length})
              </Text>
              {doneTasks.length === 0 ? (
                <Text style={[styles.emptyTasksText, isDarkMode ? styles.emptyTasksTextDark : null]}>ยังไม่มี Task ที่ทำสำเร็จ</Text>
              ) : (
                <View style={styles.tasksList}>
                  {doneTasks.map(task => {
                    const timeSpent = task.timeSpentSeconds ?? 0;
                    return (
                      <View key={task.id} style={[styles.taskItem, styles.doneTaskItem, isDarkMode ? styles.doneTaskItemDark : null]}>
                        <Text style={[styles.taskDescription, styles.completedTaskDescription]}>{task.description}</Text>
                        {timeSpent > 0 && (
                          <View style={styles.difficultyContainer}>
                            <Text style={[styles.taskTimeSpentSmall, isDarkMode ? styles.taskTimeSpentSmallDark : null]}>ใช้เวลาไป: {formatTime(timeSpent)}</Text>
                            <Text style={[styles.difficultyTag, difficultyMap[getDifficultyRating(timeSpent)]]}>
                              ระดับความยาก: {getDifficultyRating(timeSpent)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.taskActions}>
                          <TouchableOpacity
                            onPress={() => updateTaskStatus(task.id, 'todo')}
                            style={[styles.taskActionButton, styles.undoButton]}
                          >
                            <Image source={iconMap['undo']} style={[styles.iconStyleTiny, { tintColor: '#fff' }]} />
                            <Text style={styles.taskActionButtonText}>ย้ายไป To Do</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteTask(task.id)} style={[styles.taskActionButton, styles.deleteButtonSmall]}>
                            <Image source={iconMap['trash-can-outline']} style={[styles.iconStyleTiny, { tintColor: '#E74C3C' }]} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
          <Image source={iconMap['content-save-outline']} style={[styles.iconStyleSmall, { tintColor: '#fff' }]} />
          <Text style={styles.saveButtonText}>
            บันทึกการเปลี่ยนแปลง
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E74C3C',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  returnButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingBottom: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerDark: {
    backgroundColor: '#1E1E1E',
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  headerTitleDark: {
    color: '#ECF0F1',
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 100,
  },
  goalInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    borderLeftWidth: 5,
    borderLeftColor: '#3498DB',
  },
  goalInfoCardDark: {
    backgroundColor: '#1E1E1E',
    borderLeftColor: '#3498DB',
  },
  goalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  goalTitleDark: {
    color: '#ECF0F1',
  },
  goalDescription: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  goalDescriptionDark: {
    color: '#A0A0A0',
  },
  noDescriptionText: {
    fontSize: 14,
    color: '#7F8C8D',
    fontStyle: 'italic',
  },
  noDescriptionTextDark: {
    color: '#7F8C8D',
  },
  dailyCheckinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28A745',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 20,
    justifyContent: 'center',
    shadowColor: '#28A745',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  dailyCheckinDone: {
    backgroundColor: '#6C757D',
    shadowColor: '#6C757D',
    opacity: 0.7,
  },
  dailyCheckinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionDark: {
    backgroundColor: '#1E1E1E',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A6572',
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitleDark: {
    color: '#BDC3C7',
  },
  addTaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  newTaskInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D9E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
    color: '#333',
    marginRight: 10,
  },
  newTaskInputDark: {
    backgroundColor: '#2C3E50',
    color: '#ECF0F1',
    borderColor: '#34495E',
  },
  addBtn: {
    backgroundColor: '#3498DB',
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  tasksList: {},
  taskItem: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: '#F0F4F7',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskItemDark: {
    backgroundColor: '#2C3E50',
  },
  doingTaskItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
  },
  doingTaskItemDark: {
    backgroundColor: '#2C3E50',
    borderLeftColor: '#F39C12',
  },
  doneTaskItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#2ECC71',
    backgroundColor: '#EBF5EB',
  },
  doneTaskItemDark: {
    backgroundColor: '#2C3E50',
    borderLeftColor: '#2ECC71',
  },
  taskDescription: {
    flex: 1,
    fontSize: 16,
    color: '#4A6572',
    marginBottom: 5,
  },
  taskDescriptionDark: {
    color: '#ECF0F1',
  },
  completedTaskDescription: {
    textDecorationLine: 'line-through',
    color: '#7F8C8D',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    marginTop: 5,
  },
  taskActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  startButton: {
    backgroundColor: '#3498DB',
  },
  pauseButton: {
    backgroundColor: '#F39C12',
  },
  doneButton: {
    backgroundColor: '#2ECC71',
  },
  undoButton: {
    backgroundColor: '#7F8C8D',
  },
  deleteButtonSmall: {
    backgroundColor: '#FADBD8',
    borderWidth: 1,
    borderColor: '#E74C3C',
    paddingVertical: 7,
    paddingHorizontal: 7,
  },
  saveButton: {
    backgroundColor: '#2ECC71',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  emptyTasksText: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  emptyTasksTextDark: {
    color: '#A0A0A0',
  },
  difficultyContainer: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  difficultyTag: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    color: '#fff',
  },
  difficultyง่าย: {
    backgroundColor: '#28a745',
  },
  difficultyปานกลาง: {
    backgroundColor: '#ffc107',
  },
  difficultyยาก: {
    backgroundColor: '#dc3545',
  },
  taskTimeSpentSmall: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  taskTimeSpentSmallDark: {
    color: '#A0A0A0',
  },
  iconStyle: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    tintColor: '#2C3E50',
  },
  iconStyleLarge: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    tintColor: '#E74C3C',
  },
  iconStyleSmall: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#333',
  },
  iconStyleTiny: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#fff',
    marginRight: 5,
  },
});