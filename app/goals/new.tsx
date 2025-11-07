import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  SafeAreaView,
} from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { loadGoals, saveGoals } from '../../lib/storage';
import { Goal, Task } from '../../types';

import { Calendar } from 'react-native-calendars';
import { useDarkMode } from '../../context/DarkModeContext';
import { LinearGradient } from 'expo-linear-gradient';

const BackIcon = require('../../assets/images/arrow-left.png');
const PlusIcon = require('../../assets/images/plus.png');
const CheckIcon = require('../../assets/images/check.png');
const CloseCircleIcon = require('../../assets/images/close-circle.png'); 
const CalendarDailyIcon = require('../../assets/images/calendar.png'); 
const CalendarWeekIcon = require('../../assets/images/calendar.png');
const CalendarMonthIcon = require('../../assets/images/calendar.png');
const CalendarMultipleIcon = require('../../assets/images/calendar.png');

type GoalType = 'daily' | 'weekly' | 'monthly' | 'longterm';

function getTodayDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function NewGoal() {
  const router = useRouter();
  const { isDarkMode } = useDarkMode();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalType, setGoalType] = useState<GoalType>('longterm');
  const [targetCount, setTargetCount] = useState('');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);
  const [currentTaskText, setCurrentTaskText] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);

  const handleAddTask = () => {
    if (currentTaskText.trim() === '') {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกรายละเอียด Task');
      return;
    }
    const newTask: Task = {
      id: uuidv4(),
      description: currentTaskText.trim(),
      isCompleted: false,
      createdAt: new Date().toISOString(),
      status: 'todo',
      timeSpentSeconds: 0,
      timeEntries: [],
    };
    setTasks(prevTasks => [...prevTasks, newTask]);
    setCurrentTaskText('');
  };

  const handleDeleteTask = (id: string) => {
    Alert.alert(
      'ยืนยันการลบ',
      'คุณต้องการลบ Task นี้ใช่หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ลบ', onPress: () => setTasks(prevTasks => prevTasks.filter(task => task.id !== id)) },
      ]
    );
  };

  const addGoal = async () => {
    if (title.trim() === '') {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อเป้าหมายก่อนที่จะบันทึก');
      return;
    }

    const newGoal: Goal = {
      id: uuidv4(),
      title: title.trim(),
      description: description.trim(),
      type: goalType,
      progress: [],
      detailedProgress: [],
      createdAt: getTodayDate(),
      isReadingGoal: false,
    };

    if (goalType === 'daily' || goalType === 'weekly' || goalType === 'monthly') {
      const parsedTargetCount = parseInt(targetCount.trim());
      if (isNaN(parsedTargetCount) || parsedTargetCount <= 0) {
        Alert.alert('แจ้งเตือน', `กรุณากรอกจำนวนเป้าหมายที่ต้องการต่อ${goalType === 'weekly' ? 'สัปดาห์' : goalType === 'monthly' ? 'เดือน' : 'วัน'}ให้ถูกต้อง (ต้องเป็นตัวเลขมากกว่า 0)`);
        return;
      }
      newGoal.targetCount = parsedTargetCount;
      newGoal.tasks = undefined;
      newGoal.startDate = undefined;
      newGoal.endDate = undefined;
    }

    if (goalType === 'longterm') {
      if (tasks.length === 0) {
        Alert.alert('แจ้งเตือน', 'กรุณาเพิ่มอย่างน้อยหนึ่ง Task สำหรับเป้าหมายระยะยาว');
        return;
      }

      if (!selectedEndDate) {
        Alert.alert('แจ้งเตือน', 'กรุณาเลือกวันที่สิ้นสุดสำหรับเป้าหมายระยะยาว');
        return;
      }
      const todayNoTime = new Date(getTodayDate());
      const selectedEndNoTime = new Date(selectedEndDate.getFullYear(), selectedEndDate.getMonth(), selectedEndDate.getDate());

      if (selectedEndNoTime < todayNoTime) {
        Alert.alert('แจ้งเตือน', 'วันที่สิ้นสุดเป้าหมายต้องไม่เป็นวันที่ผ่านมาแล้ว');
        return;
      }

      newGoal.tasks = tasks;
      newGoal.targetCount = tasks.length;
      newGoal.progressCount = 0;
      newGoal.startDate = getTodayDate();
      newGoal.endDate = selectedEndDate.toISOString().slice(0, 10);
    }

    const currentGoals = await loadGoals();
    await saveGoals([...currentGoals, newGoal]);
    setTitle('');
    setDescription('');
    setGoalType('longterm');
    setTargetCount('');
    setSelectedEndDate(null);
    setCurrentTaskText('');
    setTasks([]);

    Alert.alert('สำเร็จ!', `สร้างเป้าหมาย "${newGoal.title}" เรียบร้อยแล้ว!`);
    router.replace('/');
  };

  const onDayPress = (day: any) => {
    const date = new Date(day.dateString);
    setSelectedEndDate(date);
    setShowCalendarModal(false);
  };

  const themeStyles = StyleSheet.create({
    container: {
      backgroundColor: isDarkMode ? '#121212' : '#F7F9FC',
    },
    header: {
      color: isDarkMode ? '#ECF0F1' : '#2C3E50',
    },
    subHeader: {
      color: isDarkMode ? '#A0A0A0' : '#7F8C8D',
    },
    formSection: {
      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    },
    subFormSection: {
      borderTopColor: isDarkMode ? '#34495E' : '#E0E6EB',
    },
    label: {
      color: isDarkMode ? '#BDC3C7' : '#4A6572',
    },
    input: {
      borderColor: isDarkMode ? '#4A6572' : '#D1D9E0',
      backgroundColor: isDarkMode ? '#2C3E50' : '#FFFFFF',
      color: isDarkMode ? '#ECF0F1' : '#333',
    },
    typeButton: {
      borderColor: isDarkMode ? '#4A6572' : '#D1D9E0',
      backgroundColor: isDarkMode ? '#2C3E50' : '#FFFFFF',
    },
    typeButtonSelected: {
      backgroundColor: '#3498DB',
      borderColor: '#3498DB',
    },
    typeButtonText: {
      color: isDarkMode ? '#BDC3C7' : '#4A6572',
    },
    typeButtonTextSelected: {
      color: '#fff',
    },
    datePickerButton: {
      borderColor: isDarkMode ? '#4A6572' : '#D1D9E0',
      backgroundColor: isDarkMode ? '#2C3E50' : '#FFFFFF',
    },
    datePickerButtonText: {
      color: isDarkMode ? '#ECF0F1' : '#333',
    },
    infoText: {
      color: isDarkMode ? '#7F8C8D' : '#7F8C8D',
    },
    cancelButtonText: {
      color: isDarkMode ? '#BDC3C7' : '#7F8C8D',
    },
    taskItem: {
      backgroundColor: isDarkMode ? '#2C3E50' : '#F0F4F7',
    },
    taskItemText: {
      color: isDarkMode ? '#ECF0F1' : '#4A6572',
    },
    headerBarContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 15,
      paddingVertical: 20,
      paddingTop: Platform.OS === 'android' ? 35 : undefined,
      minHeight: 80,
    },
    headerTitleContainer: {
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      color: '#FFFFFF',
    },
    backButtonInHeader: {
      padding: 5,
    },
  });

  return (
    <SafeAreaView style={[styles.outerContainer, themeStyles.container]}>
      <LinearGradient
        colors={['#f2a99d', '#b19cd9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientHeader}
      >
        <View style={themeStyles.headerBarContent}>
          <TouchableOpacity style={themeStyles.backButtonInHeader} onPress={() => router.back()}>
            <Image source={BackIcon} style={styles.headerIcon} />
          </TouchableOpacity>

          <View style={themeStyles.headerTitleContainer}>
            <Text style={themeStyles.headerTitle}>สร้างเป้าหมายใหม่</Text>
          </View>

          <View style={{ width: 34 + (themeStyles.backButtonInHeader.padding * 2) }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.containerContent}>
        <View style={[styles.formSection, themeStyles.formSection]}>
          <Text style={[styles.label, themeStyles.label]}>
            ชื่อเป้าหมาย <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="เช่น 'อ่านหนังสือสอบ', 'สร้างโปรเจกต์ส่วนตัว'"
            placeholderTextColor={isDarkMode ? '#7F8C8D' : '#A9B7C0'}
            style={[styles.input, themeStyles.input]}
          />
        </View>

        <View style={[styles.formSection, themeStyles.formSection]}>
          <Text style={[styles.label, themeStyles.label]}>
            คำอธิบาย (ไม่บังคับ)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="รายละเอียดเพิ่มเติมของเป้าหมายของคุณ"
            placeholderTextColor={isDarkMode ? '#7F8C8D' : '#A9B7C0'}
            style={[styles.input, styles.multilineInput, themeStyles.input]}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={[styles.formSection, themeStyles.formSection]}>
          <Text style={[styles.label, themeStyles.label]}>
            ความถี่ของเป้าหมาย
          </Text>
          <View style={styles.typeContainer}>
            {[
              { key: 'weekly', label: 'รายสัปดาห์', icon: CalendarWeekIcon },
              { key: 'monthly', label: 'รายเดือน', icon: CalendarMonthIcon },
              { key: 'longterm', label: 'ระยะยาว', icon: CalendarMultipleIcon },
            ].map((typeOption) => (
              <TouchableOpacity
                key={typeOption.key}
                style={[
                  styles.typeButton,
                  themeStyles.typeButton,
                  goalType === typeOption.key && styles.typeButtonSelected,
                ]}
                onPress={() => {
                  setGoalType(typeOption.key as GoalType);
                  setTargetCount('');
                  setSelectedEndDate(null);
                  setCurrentTaskText('');
                  setTasks([]);
                  setShowCalendarModal(false);
                }}
              >
                <Image
                  source={typeOption.icon}
                  style={[
                    styles.typeButtonIcon,
                    { tintColor: goalType === typeOption.key ? '#fff' : (isDarkMode ? '#BDC3C7' : '#4A6572') }
                  ]}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    themeStyles.typeButtonText,
                    goalType === typeOption.key && styles.typeButtonTextSelected,
                  ]}
                >
                  {typeOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {(goalType === 'daily' || goalType === 'weekly' || goalType === 'monthly') && (
            <View style={[styles.subFormSection, themeStyles.subFormSection]}>
              <Text style={[styles.label, themeStyles.label]}>
                จำนวนเป้าหมายที่ต้องการต่อ{goalType === 'weekly' ? 'สัปดาห์' : goalType === 'monthly' ? 'เดือน' : 'วัน'}
                <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                value={targetCount}
                onChangeText={setTargetCount}
                keyboardType="numeric"
                placeholder="เช่น 3 (ครั้ง)"
                placeholderTextColor={isDarkMode ? '#7F8C8D' : '#A9B7C0'}
                style={[styles.input, themeStyles.input]}
              />
              <Text style={[styles.infoText, themeStyles.infoText]}>
                * ตัวอย่าง: ถ้าต้องการออกกำลังกาย 3 ครั้งต่อสัปดาห์ ให้กรอก 3
              </Text>
            </View>
          )}

          {goalType === 'longterm' && (
            <View style={[styles.subFormSection, themeStyles.subFormSection]}>
              <Text style={[styles.label, themeStyles.label]}>
                วันที่สิ้นสุดเป้าหมาย
                <Text style={styles.requiredAsterisk}>*</Text>
              </Text>

              <TouchableOpacity
                onPress={() => setShowCalendarModal(true)}
                style={[styles.datePickerButton, themeStyles.datePickerButton]}
              >
                <Text style={[styles.datePickerButtonText, themeStyles.datePickerButtonText]}>
                  {selectedEndDate ? selectedEndDate.toISOString().slice(0, 10) : 'เลือกวันที่'}
                </Text>
              </TouchableOpacity>

              {Platform.OS !== 'web' && (
                <Modal
                  animationType="slide"
                  transparent={true}
                  visible={showCalendarModal}
                  onRequestClose={() => setShowCalendarModal(false)}
                >
                  <View style={styles.centeredView}>
                    <View style={[styles.modalView, { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }]}>
                      <Calendar
                        onDayPress={onDayPress}
                        markedDates={{
                          [selectedEndDate?.toISOString().slice(0, 10) || '']: { selected: true, marked: true, selectedColor: '#3498DB' }
                        }}
                        minDate={getTodayDate()}
                        theme={{
                          selectedDayBackgroundColor: '#3498DB',
                          todayTextColor: '#3498DB',
                          arrowColor: '#3498DB',
                          backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                          calendarBackground: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                          dayTextColor: isDarkMode ? '#ECF0F1' : '#2D4150',
                          textDisabledColor: isDarkMode ? '#555' : '#D9E1E8',
                          monthTextColor: isDarkMode ? '#ECF0F1' : '#2D4150',
                          textSectionTitleColor: isDarkMode ? '#BDC3C7' : '#A0A0A0',
                        }}
                      />
                      <TouchableOpacity
                        style={[styles.button, styles.buttonClose]}
                        onPress={() => setShowCalendarModal(false)}
                      >
                        <Text style={styles.textStyle}>ปิด</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}

              {Platform.OS === 'web' && showCalendarModal && (
                <View style={[styles.calendarWebContainer, { backgroundColor: isDarkMode ? '#1E1E1E' : 'white' }]}>
                  <Calendar
                    onDayPress={onDayPress}
                    markedDates={{
                      [selectedEndDate?.toISOString().slice(0, 10) || '']: { selected: true, marked: true, selectedColor: '#3498DB' }
                    }}
                    minDate={getTodayDate()}
                    theme={{
                      selectedDayBackgroundColor: '#3498DB',
                      todayTextColor: '#3498DB',
                      arrowColor: '#3498DB',
                      backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                      calendarBackground: isDarkMode ? '#1E1E1E' : '#FFFFFF',
                      dayTextColor: isDarkMode ? '#ECF0F1' : '#2D4150',
                      textDisabledColor: isDarkMode ? '#555' : '#D9E1E8',
                      monthTextColor: isDarkMode ? '#ECF0F1' : '#2D4150',
                      textSectionTitleColor: isDarkMode ? '#BDC3C7' : '#A0A0A0',
                    }}
                  />
                </View>
              )}
              <Text style={[styles.infoText, themeStyles.infoText]}>* เป้าหมายระยะยาวจะถือว่าไม่สำเร็จ หากไม่ทำ Task ทั้งหมดให้เสร็จก่อนวันที่กำหนด</Text>
            </View>
          )}
        </View>

        {goalType === 'longterm' && (
          <View style={[styles.formSection, themeStyles.formSection]}>
            <Text style={[styles.label, themeStyles.label]}>
              รายการย่อย (Tasks) <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <View style={styles.taskInputContainer}>
              <TextInput
                value={currentTaskText}
                onChangeText={setCurrentTaskText}
                placeholder="เช่น 'อ่านบทที่ 1', 'เขียนโครงร่างโปรเจกต์'"
                placeholderTextColor={isDarkMode ? '#7F8C8D' : '#A9B7C0'}
                style={[styles.input, { flex: 1, marginRight: 10 }, themeStyles.input]}
              />
              <TouchableOpacity style={styles.addTaskButton} onPress={handleAddTask}>
                <Image source={PlusIcon} style={styles.addTaskIcon} />
              </TouchableOpacity>
            </View>

            {tasks.length > 0 ? (
              <View style={styles.tasksListContainer}>
                {tasks.map((task, index) => (
                  <View key={task.id} style={[styles.taskItem, themeStyles.taskItem]}>
                    <Text style={[styles.taskItemText, themeStyles.taskItemText]}>{index + 1}. {task.description}</Text>
                    <TouchableOpacity onPress={() => handleDeleteTask(task.id)}>
                      <Image source={CloseCircleIcon} style={styles.closeTaskIcon} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.infoText, themeStyles.infoText]}>* เพิ่ม Tasks ย่อยสำหรับเป้าหมายระยะยาวของคุณ</Text>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.saveButton} onPress={addGoal}>
          <Image source={CheckIcon} style={styles.saveButtonIcon} />
          <Text style={styles.saveButtonText}>บันทึกเป้าหมาย</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  gradientHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    marginBottom: 20,
  },
  containerContent: {
    flexGrow: 1,
    padding: 20,
  },
  subHeader: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
  },
  formSection: {
    marginBottom: 20,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  subFormSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },
  requiredAsterisk: {
    color: '#E74C3C',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  typeButtonSelected: {
    backgroundColor: '#3498DB',
    borderColor: '#3498DB',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  typeButtonTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  typeButtonIcon: { 
    width: 20,
    height: 20,
    marginRight: 5,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  datePickerButtonText: {
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#2ECC71',
    padding: 15,
    borderRadius: 10,
    marginTop: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...Platform.select({
      ios: {
        shadowColor: '#2ECC71',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  saveButtonIcon: {
    width: 20,
    height: 20,
    tintColor: '#fff',
    marginRight: 8,
  },
  cancelButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerIcon: { 
    width: 34,
    height: 34,
    tintColor: '#FFFFFF',
  },
  subLabel: {
    fontSize: 14,
    marginBottom: 5,
    marginTop: 10,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 12,
    marginTop: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    marginTop: 15,
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  calendarWebContainer: {
    position: 'relative',
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    padding: 10,
    marginTop: 10,
  },
  taskInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  addTaskButton: {
    backgroundColor: '#3498DB',
    borderRadius: 25,
    padding: 10,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTaskIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
  tasksListContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E6EB',
    paddingTop: 10,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskItemText: {
    fontSize: 16,
    flex: 1,
    marginRight: 10,
  },
  closeTaskIcon: { 
    width: 20,
    height: 20,
    tintColor: '#E74C3C',
  },
});