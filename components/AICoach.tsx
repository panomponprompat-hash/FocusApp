import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Goal } from '../types';

const RobotIcon = require('../assets/images/chatbot.png');
const SparklesIcon = require('../assets/images/sparkles.png');
const BookOpenIcon = require('../assets/images/bookopen.png');
const ThumbUpIcon = require('../assets/images/thumb-up.png');
const BrainIcon = require('../assets/images/brain.png');
const StarOutlineIcon = require('../assets/images/star.png');
const CalendarAlertIcon = require('../assets/images/calendar.png');
const SadFaceIcon = require('../assets/images/sad.png');
const GoalStartIcon = require('../assets/images/goal.png');

const RunningIcon = require('../assets/images/running.png');
const AlarmIcon = require('../assets/images/alarm.png');
const RefreshIcon = require('../assets/images/refresh.png');
const WarningIcon = require('../assets/images/warning.png');

interface AICoachProps {
  hasActiveReadingGoal: boolean;
  activeReadingGoalData?: Goal;
  totalBooksRead?: number;
}

const AICoachMessage = ({ message, iconSource }: { message: string, iconSource: any }) => (
  <View style={styles.messageContent}>
    <Image source={iconSource} style={styles.messageIcon} />
    <Text style={styles.coachText}>{message}</Text>
  </View>
);

export default function AICoach({
  hasActiveReadingGoal,
  activeReadingGoalData,
  totalBooksRead = 0,
}: AICoachProps) {
  const getCoachMessage = () => {
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);

    const getYesterdayISO = () => {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return yesterday.toISOString().slice(0, 10);
    };
    const yesterdayISO = getYesterdayISO();

    if (hasActiveReadingGoal && activeReadingGoalData) {
      if (activeReadingGoalData.type === 'daily') {
        const goalCreatedAt = new Date(activeReadingGoalData.createdAt || '').toISOString().slice(0, 10);
        const hasCheckedInToday = (activeReadingGoalData.progress || []).includes(todayISO);
        const hasCheckedInYesterday = (activeReadingGoalData.progress || []).includes(yesterdayISO);

        if (goalCreatedAt !== todayISO && !hasCheckedInToday) {
          return {
            message: `ดูเหมือนเป้าหมายการอ่านรายวันของคุณยังไม่ได้รับการรีเซ็ต หรือคุณลืม Check-in วันนี้! มาเริ่มสร้างความสำเร็จสำหรับวันนี้กันเถอะ! 🗓️`,
            icon: CalendarAlertIcon
          };
        } else if (hasCheckedInToday) {
          return {
            message: `คุณทำเป้าหมายการอ่านวันนี้สำเร็จแล้ว! รักษาความสม่ำเสมอนะ 🌟`,
            icon: StarOutlineIcon
          };
        } else if (!hasCheckedInToday && hasCheckedInYesterday) {
          return {
            message: `ไม่เป็นไรถ้าพลาดไปเมื่อวาน! มาเริ่มต้น Check-in เป้าหมายการอ่านวันนี้กันเถอะ! ทุกวันคือโอกาสใหม่ 🔄`,
            icon: RefreshIcon
          };
        } else {
          return {
            message: `อย่าลืมเช็คอินเป้าหมายการอ่านวันนี้ล่ะ! ทุกๆ วันคือโอกาสที่ดีนะ 📖`,
            icon: BookOpenIcon
          };
        }
      } 
      else if (activeReadingGoalData.type === 'weekly' || activeReadingGoalData.type === 'monthly') {
        const completedCount = activeReadingGoalData.progress?.length || 0;
        const targetCount = activeReadingGoalData.targetCount || 1;
        const remaining = targetCount - completedCount;

        let totalPeriodDays: number;
        let daysPassedInPeriod: number;

        if (activeReadingGoalData.type === 'weekly') {
            totalPeriodDays = 7;
            const dayOfWeek = today.getDay(); 
            daysPassedInPeriod = dayOfWeek === 0 ? 7 : dayOfWeek; 
        } else { 
            totalPeriodDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            daysPassedInPeriod = today.getDate();
        }

        const expectedProgressRatio = daysPassedInPeriod / totalPeriodDays;
        const actualProgressRatio = completedCount / targetCount;
        
        if (completedCount >= targetCount) {
          return {
            message: `เยี่ยมมาก! คุณบรรลุเป้าหมายการอ่านราย${activeReadingGoalData.type === 'weekly' ? 'สัปดาห์' : 'เดือน'}แล้ว! สุดยอดจริงๆ! 👍`,
            icon: ThumbUpIcon
          };
        } else if (actualProgressRatio < expectedProgressRatio * 0.5 && daysPassedInPeriod > totalPeriodDays / 3) {
            return {
                message: `ดูเหมือนคุณจะตามหลังเป้าหมายการอ่านราย${activeReadingGoalData.type === 'weekly' ? 'สัปดาห์' : 'เดือน'}อยู่นะ! เหลืออีก ${remaining} ครั้ง ลองเร่งความเร็วขึ้นอีกหน่อยไหม? 🏃‍♂️`,
                icon: RunningIcon
            };
        } else if (daysPassedInPeriod >= totalPeriodDays - 2 && completedCount < targetCount) {
            return {
                message: `เหลือเวลาน้อยแล้วนะ! คุณยังเหลืออีก ${remaining} ครั้งในเป้าหมาย "${activeReadingGoalData.title}"! รีบจัดการให้เสร็จก่อนหมดรอบ! ⏰`,
                icon: AlarmIcon
            };
        } else if (completedCount > 0) {
          return {
            message: `คุณอ่านไปแล้ว ${completedCount} ครั้ง! เหลืออีก ${remaining} ครั้งในเป้าหมาย "${activeReadingGoalData.title}"! สู้ๆ! 🤓`,
            icon: BrainIcon
          };
        } else {
          return {
            message: `ถึงเวลาเริ่มต้นเป้าหมายการอ่านราย${activeReadingGoalData.type === 'weekly' ? 'สัปดาห์' : 'เดือน'}แล้วนะ! ความรู้รอคุณอยู่ 🧠`,
            icon: BrainIcon
          };
        }
      } 
      else if (activeReadingGoalData.type === 'longterm' && activeReadingGoalData.tasks) {
        const completedTasks = activeReadingGoalData.tasks.filter(task => task.isCompleted).length;
        const totalTasks = activeReadingGoalData.tasks.length;
        const remainingTasks = totalTasks - completedTasks;
        
        const endDate = activeReadingGoalData.endDate ? new Date(activeReadingGoalData.endDate) : null;
        const startDate = activeReadingGoalData.startDate ? new Date(activeReadingGoalData.startDate) : new Date(activeReadingGoalData.createdAt || todayISO);

        const totalDaysForGoal = endDate ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
        const daysPassedSinceStart = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const daysRemaining = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

        const expectedTaskRatio = totalDaysForGoal > 0 ? daysPassedSinceStart / totalDaysForGoal : 0;
        const actualTaskRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;

        if (completedTasks >= totalTasks) {
          return {
            message: `สุดยอด! คุณทำเป้าหมายการอ่าน "${activeReadingGoalData.title}" สำเร็จแล้ว! 🎉`,
            icon: SparklesIcon
          };
        } else if (endDate && daysRemaining !== null && daysRemaining < 0) {
          return {
            message: `โอ้ไม่! เป้าหมาย "${activeReadingGoalData.title}" เลยกำหนดไปแล้ว! ลองพิจารณาปรับปรุงหรือสร้างเป้าหมายใหม่ดูนะ 🙁`,
            icon: SadFaceIcon
          };
        } else if (daysRemaining !== null && daysRemaining <= 7 && actualTaskRatio < 0.8) {
            return {
                message: `ใกล้หมดเขตแล้ว! เหลืออีกเพียง ${daysRemaining} วัน และ ${remainingTasks} Task ในเป้าหมาย "${activeReadingGoalData.title}"! มาเร่งมือกัน! 🚨`,
                icon: WarningIcon
            };
        } else if (actualTaskRatio < expectedTaskRatio * 0.7 && daysPassedSinceStart > totalDaysForGoal / 4) {
            return {
                message: `ดูเหมือนคุณจะตามหลังเป้าหมายระยะยาว "${activeReadingGoalData.title}" อยู่นะ! เหลืออีก ${remainingTasks} Task ลองแบ่งเวลาเพิ่มขึ้นอีกนิดสิ 📈`,
                icon: RunningIcon
            };
        } else if (completedTasks > 0) {
          let timeMessage = '';
          if (daysRemaining !== null && daysRemaining >= 0) {
            if (daysRemaining <= 7) timeMessage = `เหลือเวลาอีก ${daysRemaining} วัน`;
            else if (daysRemaining > 7) timeMessage = `เหลือเวลาอีกประมาณ ${Math.ceil(daysRemaining / 7)} สัปดาห์`;
          }
          return {
            message: `ยอดเยี่ยม! คุณอ่านไปแล้ว ${completedTasks} จาก ${totalTasks} Task ในเป้าหมาย "${activeReadingGoalData.title}"! ${timeMessage ? `(${timeMessage})` : ''} สู้ๆ! 📚`,
            icon: BookOpenIcon
          };
        } else {
          let timeMessage = '';
          if (daysRemaining !== null && daysRemaining >= 0) {
            if (daysRemaining <= 7) timeMessage = `เหลือเวลาอีก ${daysRemaining} วัน`;
            else if (daysRemaining > 7) timeMessage = `เหลือเวลาอีกประมาณ ${Math.ceil(daysRemaining / 7)} สัปดาห์`;
          }
          return {
            message: `มาเริ่มอ่านหนังสือเพื่อเป้าหมาย "${activeReadingGoalData.title}" กันเถอะ! ${timeMessage ? `(${timeMessage})` : ''} ทุกหน้ามีความหมายนะ 📖`,
            icon: BookOpenIcon
          };
        }
      }
    }

    if (totalBooksRead > 0) {
      return {
        message: `คุณอ่านหนังสือไปแล้วทั้งหมด ${totalBooksRead} เล่ม! ยอดเยี่ยมมาก! ทำไมไม่ลองตั้งเป้าหมายการอ่านใหม่ล่ะ 🤩`,
        icon: SparklesIcon
      };
    }

    return {
      message: "มาเริ่มการเดินทางสู่โลกแห่งการอ่านกันเถอะ! ความรู้รอคุณอยู่ 📚",
      icon: GoalStartIcon
    };
  };

  const { message, icon } = getCoachMessage();

  return (
    <View style={styles.coachContainer}>
      <Image source={RobotIcon} style={styles.coachAvatar} />
      <AICoachMessage message={message} iconSource={icon} />
    </View>
  );
}

const styles = StyleSheet.create({
  coachContainer: {
    backgroundColor: '#E6F0F7',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coachAvatar: {
    width: 30,
    height: 30,
    marginRight: 10,
    marginTop: 5,
  },
  messageContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  coachText: {
    flex: 1,
    fontSize: 15,
    color: '#34495E',
    fontWeight: '500',
    lineHeight: 22,
  },
});