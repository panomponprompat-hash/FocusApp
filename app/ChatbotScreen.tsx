import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { loadGoals, updateGoal } from '../lib/storage';
import { useDarkMode } from '../context/DarkModeContext';
import { LinearGradient } from 'expo-linear-gradient';
import 'react-native-get-random-values';

const { width } = Dimensions.get('window');
const BackIcon = require('../assets/images/arrow-left.png');
const BotAvatar = require('../assets/images/chatbot.png');
const UserAvatar = require('../assets/images/user.png');
const SendIcon = require('../assets/images/send.png');

export type GoalType = 'daily' | 'weekly' | 'monthly' | 'longterm';
export type TaskStatus = 'todo' | 'doing' | 'done';
export interface ProgressEntry {
    date: string;
    value?: number;
    note?: string;
    isSkipped?: boolean;
}
export interface TimeEntry {
    startTime: string;
    endTime?: string;
    durationSeconds?: number;
}
export interface Task {
    id: string;
    description: string;
    isCompleted: boolean;
    completedDate?: string;
    createdAt: string;
    status?: TaskStatus;
    timeSpentSeconds?: number;
    currentSessionStartTime?: string;
    timeEntries?: TimeEntry[];
    dueDate?: string;
}
export interface Goal {
    id: string;
    title: string;
    description?: string;
    type: GoalType;
    progress?: string[];
    detailedProgress?: ProgressEntry[];
    createdAt: string;
    targetWeeklyCount?: number;
    targetMonthlyCount?: number;
    targetCount?: number;
    startDate?: string;
    endDate?: string;
    isReadingGoal?: boolean;
    bookTitle?: string;
    startPage?: number;
    targetPage?: number;
    currentPage?: number;
    totalPages?: number;
    tasks?: Task[];
    progressCount?: number;
    isCompleted?: boolean;
    isUnsuccessful?: boolean;
    isOngoing?: boolean;
}

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    isTyping?: boolean;
}

function getTodayDate(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calculateGoalProgress(goal: Goal): {
    completed: number;
    target: number;
    percent: number;
    progressText: string;
    isUnsuccessful: boolean;
    isCompleted: boolean;
    isOngoing: boolean;
    isAhead: boolean;
    remainingDays: number;
} {
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
    let isAhead = false;
    let remainingDays = 0;

    if (goal.isReadingGoal && goal.type === 'longterm') {
        completedCount = goal.currentPage || 0;
        targetValue = goal.targetPage || 1;
        progressPercent = targetValue > 0 ? Math.min(100, (completedCount / targetValue) * 100) : 0;

        const start = goal.startDate ? new Date(goal.startDate) : null;
        const end = goal.endDate ? new Date(goal.endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (end) {
            const timeDiff = end.getTime() - todayNoTime.getTime();
            remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        }


        if (completedCount >= targetValue) {
            isCompleted = true;
            progressDisplayText = `✅ อ่าน "${goal.bookTitle || 'เป้าหมายนี้'}" จบแล้ว!`;
        } else if (start && todayNoTime < start) {
            isAhead = true;
            progressDisplayText = `🗓️ ก่อนเริ่ม: เป้าหมายจะเริ่มวันที่ ${goal.startDate}`;
            completedCount = 0;
            progressPercent = 0;
        } else if (end && todayNoTime > end) {
            isUnsuccessful = true;
            progressDisplayText = `❌ อ่าน "${goal.bookTitle || 'เป้าหมายนี้'}" ไม่สำเร็จตามกำหนด`;
        } else {
            isOngoing = true;
            const pagesRead = completedCount - (goal.startPage || 0);
            const totalPagesToRead = targetValue - (goal.startPage || 0);
            progressDisplayText = `⏳ อ่าน "${goal.bookTitle || 'เป้าหมายนี้'}" ไปแล้ว ${pagesRead} จาก ${totalPagesToRead} หน้า (${progressPercent.toFixed(0)}%)`;
        }
        return { completed: completedCount, target: targetValue, percent: progressPercent, progressText: progressDisplayText, isUnsuccessful, isCompleted, isOngoing, isAhead, remainingDays };
    }

    if (goal.type === 'daily') {
        const hasCompletedToday = goal.progress?.includes(todayDateString);
        if (hasCompletedToday) {
            completedCount = 1;
            targetValue = 1;
            progressPercent = 100;
            progressDisplayText = `✅ ทำสำเร็จแล้ววันนี้!`;
            isCompleted = true;
        } else {
            completedCount = 0;
            targetValue = 1;
            progressPercent = 0;
            progressDisplayText = `วันนี้ยังไม่ได้เช็คอิน`;
            isOngoing = true;
        }
        return { completed: completedCount, target: targetValue, percent: progressPercent, progressText: progressDisplayText, isUnsuccessful, isCompleted, isOngoing, isAhead, remainingDays: 0 };
    }

    if (goal.type === 'weekly' || goal.type === 'monthly') {
        completedCount = goal.progressCount || 0;
        targetValue = goal.targetCount || 1;
        progressPercent = targetValue > 0 ? Math.min(100, (completedCount / targetValue) * 100) : 0;

        let goalPeriodEnd: Date | null = null;
        let periodText = '';
        if (goal.type === 'weekly') {
            const dayOfWeek = today.getDay();
            const daysUntilSunday = (7 - dayOfWeek) % 7;
            goalPeriodEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilSunday);
            periodText = 'สัปดาห์นี้';
        } else if (goal.type === 'monthly') {
            goalPeriodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            periodText = 'เดือนนี้';
        }
        const goalPeriodEndNoTime = goalPeriodEnd ? new Date(goalPeriodEnd.getFullYear(), goalPeriodEnd.getMonth(), goalPeriodEnd.getDate()) : null;

        if (goalPeriodEndNoTime) {
            const timeDiff = goalPeriodEndNoTime.getTime() - todayNoTime.getTime();
            remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        }


        if (completedCount >= targetValue) {
            isCompleted = true;
            progressDisplayText = `✅ ทำสำเร็จแล้ว ${completedCount} / ${targetValue} ครั้งใน${periodText}!`;
        } else if (goalPeriodEndNoTime && todayNoTime > goalPeriodEndNoTime) {
            isUnsuccessful = true;
            progressDisplayText = `❌ เป้าหมายไม่สำเร็จใน${periodText} (${completedCount}/${targetValue} ครั้ง)`;
        } else {
            isOngoing = true;
            const daysRemaining = goalPeriodEnd ? Math.ceil((goalPeriodEnd.getTime() - todayNoTime.getTime()) / (1000 * 60 * 60 * 24)) : 0;
            progressDisplayText = `⏳ ทำสำเร็จแล้ว ${completedCount} / ${targetValue} ครั้งใน${periodText} (เหลืออีก ${daysRemaining} วัน)`;
        }
        return { completed: completedCount, target: targetValue, percent: progressPercent, progressText: progressDisplayText, isUnsuccessful, isCompleted, isOngoing, isAhead, remainingDays };
    }

    if (goal.type === 'longterm') {
        const start = goal.startDate ? new Date(goal.startDate) : null;
        const end = goal.endDate ? new Date(goal.endDate) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (end) {
            const timeDiff = end.getTime() - todayNoTime.getTime();
            remainingDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        }

        if (goal.tasks && goal.tasks.length > 0) {
            const completedTasks = goal.tasks.filter((task: Task) => task.isCompleted);
            completedCount = completedTasks.length;
            targetValue = goal.tasks.length;
        } else {
            completedCount = goal.progressCount || 0;
            targetValue = goal.targetCount || 1;
        }
        progressPercent = targetValue > 0 ? Math.min(100, (completedCount / targetValue) * 100) : 0;

        if (completedCount >= targetValue) {
            isCompleted = true;
            progressDisplayText = `✅ ทำสำเร็จแล้ว ${completedCount} / ${targetValue} งาน!`;
        } else if (end && todayNoTime > end) {
            isUnsuccessful = true;
            progressDisplayText = `❌ สิ้นสุดแล้ว (ไม่สำเร็จ) ${completedCount} / ${targetValue} งาน`;
        } else if (start && todayNoTime < start) {
            isAhead = true;
            progressPercent = 0;
            progressDisplayText = `🗓️ ก่อนเริ่ม: เป้าหมายจะเริ่มวันที่ ${goal.startDate}`;
        } else {
            isOngoing = true;
            progressDisplayText = `⏳ ทำไปแล้ว ${completedCount} / ${targetValue} งาน (${progressPercent.toFixed(0)}%)`;
        }
        return { completed: completedCount, target: targetValue, percent: progressPercent, progressText: progressDisplayText, isUnsuccessful, isCompleted, isOngoing, isAhead, remainingDays };
    }

    return { completed: 0, target: 0, percent: 0, progressText: 'ยังไม่มีความคืบหน้า', isOngoing: true, isCompleted: false, isUnsuccessful: false, isAhead: false, remainingDays: 0 };
}

const isGoalNearDeadline = (goal: Goal): boolean => {
    const progress = calculateGoalProgress(goal);
    if (!(progress.isOngoing || progress.isAhead) || goal.type !== 'longterm' || !goal.endDate) {
        return false;
    }
    const today = new Date();
    const endDate = new Date(goal.endDate);
    const timeDiff = endDate.getTime() - today.getTime();
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return dayDiff <= 7 && dayDiff >= 0;
};

const findNearestLongtermGoal = (goals: Goal[]): Goal | undefined => {
    const today = new Date();
    const longTermGoals = goals.filter((g: Goal) => {
        const progress = calculateGoalProgress(g);
        return g.type === 'longterm' && !progress.isCompleted && !progress.isUnsuccessful && (progress.isOngoing || progress.isAhead);
    });

    if (longTermGoals.length === 0) {
        return undefined;
    }
    longTermGoals.sort((a, b) => {
        const aEndDate = a.endDate ? new Date(a.endDate).getTime() : Infinity;
        const bEndDate = b.endDate ? new Date(b.endDate).getTime() : Infinity;
        return aEndDate - bEndDate;
    });
    return longTermGoals[0];
};

const findGoalWithUpcomingTask = (goals: Goal[]): Goal | undefined => {
    const today = new Date();
    const todayNoTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const goalsWithUpcomingTasks = goals.filter((g: Goal) => {
        if (g.tasks && g.tasks.length > 0) {
            return g.tasks.some(task => {
                if (task.dueDate && task.status !== 'done') {
                    const dueDate = new Date(task.dueDate);
                    const timeDiff = dueDate.getTime() - todayNoTime.getTime();
                    const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                    return dayDiff >= 0 && dayDiff <= 7;
                }
                return false;
            });
        }
        return false;
    });

    if (goalsWithUpcomingTasks.length === 0) return undefined;
    goalsWithUpcomingTasks.sort((a, b) => {
        const aNearestTaskDate = Math.min(...(a.tasks?.filter(t => t.dueDate && t.status !== 'done').map(t => new Date(t.dueDate!).getTime()) || [Infinity]));
        const bNearestTaskDate = Math.min(...(b.tasks?.filter(t => t.dueDate && t.status !== 'done').map(t => new Date(t.dueDate!).getTime()) || [Infinity]));
        return aNearestTaskDate - bNearestTaskDate;
    });
    return goalsWithUpcomingTasks[0];
};

const calculateSuccessChance = (
    goal: Goal,
    userEffort: number,
    taskComplexity: number
): { chance: number, advice: string } => {
    const { completed, target, remainingDays, percent, isCompleted, isUnsuccessful } = calculateGoalProgress(goal);

    if (isCompleted) {
        return { chance: 100, advice: "เป้าหมายนี้สำเร็จเรียบร้อยแล้วครับ! ยอดเยี่ยมมาก!" };
    }
    if (isUnsuccessful) {
        return { chance: 0, advice: "น่าเสียดายครับ เป้าหมายนี้ไม่สำเร็จตามกำหนดแล้ว ลองทบทวนและวางแผนใหม่ในครั้งหน้าได้นะครับ" };
    }

    if (target === 0) {
        return { chance: 0, advice: "เป้าหมายนี้ยังไม่มีจำนวนงานหรือเป้าหมายที่ชัดเจน ทำให้คำนวณโอกาสได้ยากครับ" };
    }

    const remainingWork = target - completed;
    if (remainingWork <= 0) {
        return { chance: 100, advice: "ท่านทำส่วนที่เหลือสำเร็จแล้วครับ! เป้าหมายใกล้สำเร็จแล้ว!" };
    }

    let chance = percent;

    if (remainingDays <= 0 && remainingWork > 0) {
        chance = chance * 0.1;
    } else if (remainingDays > 0) {
        const workPerDayNeeded = remainingWork / remainingDays;
        let averageWorkRate = 1;
        if (goal.isReadingGoal && goal.targetPage) {
             averageWorkRate = (goal.targetPage - (goal.startPage || 0)) / ((new Date(goal.endDate || getTodayDate()).getTime() - new Date(goal.startDate || getTodayDate()).getTime()) / (1000 * 60 * 60 * 24) + 1);
        } else if (goal.tasks && goal.tasks.length > 0) {
            averageWorkRate = goal.tasks.length / ((new Date(goal.endDate || getTodayDate()).getTime() - new Date(goal.startDate || getTodayDate()).getTime()) / (1000 * 60 * 60 * 24) + 1);
        }

        if (workPerDayNeeded > averageWorkRate * 2 && remainingDays < 5) {
            chance *= 0.7;
        } else if (workPerDayNeeded > averageWorkRate * 3 && remainingDays < 10) {
            chance *= 0.5;
        }
    }

    const effortMultiplier = 0.5 + (userEffort / 10);
    const complexityMultiplier = 1.5 - (taskComplexity / 10);

    chance = chance * effortMultiplier * complexityMultiplier;

    chance = Math.max(0, Math.min(100, chance));

    let advice = '';
    if (chance >= 80) {
        advice = "โอกาสสำเร็จสูงมากครับ! ขอให้รักษาความมุ่งมั่นนี้ไว้ ท่านทำได้แน่นอน!";
    } else if (chance >= 50) {
        advice = "โอกาสสำเร็จอยู่ในระดับปานกลางครับ ท่านอาจจะต้องพยายามเพิ่มขึ้นอีกนิด หรือลองปรับแผนดูนะครับ";
    } else if (chance >= 20) {
        advice = "โอกาสสำเร็จค่อนข้างน้อยครับ แนะนำให้ท่านทบทวนเป้าหมายใหม่ หรือพิจารณาการขยายเวลาและแบ่งงานย่อยให้ชัดเจนขึ้นครับ";
    } else {
        advice = "โอกาสสำเร็จน้อยมากครับ อาจจะถึงเวลาที่ต้องปรับแผนครั้งใหญ่ หรือเปลี่ยนเป้าหมายให้เป็นไปได้มากขึ้นแล้วนะครับ";
    }

    return { chance, advice };
};

type BotMode = 'default' | 'extending_goal' | 'predicting_chance_selecting_goal' | 'predicting_chance_asking_effort' | 'predicting_chance_asking_complexity';

interface BotResponseResult {
    reply: string;
    nextMode?: BotMode;
    goal?: Goal;
    tempEffort?: number; 
}

const getBotResponse = async (action: string, allGoals: Goal[], currentBotMode: BotMode, goalForPrediction?: Goal, tempEffort?: number): Promise<BotResponseResult> => {
    const lowerCaseAction = action.toLowerCase().trim();

    if (currentBotMode.startsWith('predicting_chance')) {
        if (!goalForPrediction) {
            return { reply: 'ขออภัยครับ ไม่พบเป้าหมายที่ต้องการทำนาย กรุณาลองใหม่', nextMode: 'default' };
        }

        if (currentBotMode === 'predicting_chance_asking_effort') {
            const effort = parseInt(action, 10);
            if (isNaN(effort) || effort < 1 || effort > 10) {
                return { reply: 'กรุณาป้อนตัวเลขความพยายามระหว่าง 1 ถึง 10 ครับ', nextMode: 'predicting_chance_asking_effort', goal: goalForPrediction };
            }
            return { reply: `รับทราบครับ ${effort} คะแนน! ตอนนี้ขอถามเรื่องความซับซ้อนของงานในเป้าหมาย "${goalForPrediction.title}" ครับ (1 = ง่ายมาก, 10 = ซับซ้อนมาก)`, nextMode: 'predicting_chance_asking_complexity', goal: goalForPrediction, tempEffort: effort };
        }

        if (currentBotMode === 'predicting_chance_asking_complexity') {
            const complexity = parseInt(action, 10);
            if (isNaN(complexity) || complexity < 1 || complexity > 10) {
                return { reply: 'กรุณาป้อนตัวเลขความซับซ้อนระหว่าง 1 ถึง 10 ครับ', nextMode: 'predicting_chance_asking_complexity', goal: goalForPrediction };
            }
            
            if (tempEffort === undefined) {
                return { reply: 'ขออภัยครับ ไม่พบข้อมูลความพยายาม กรุณาลองใหม่', nextMode: 'default' };
            }
            const { chance, advice } = calculateSuccessChance(goalForPrediction, tempEffort, complexity);

            let reply = `จากการประเมิน ผมคิดว่าโอกาสที่ท่านจะทำเป้าหมาย "${goalForPrediction.title}" สำเร็จภายในกำหนดคือประมาณ **${chance.toFixed(0)}%** ครับ\n\n${advice}`;
            return { reply, nextMode: 'default' };
        }
    }


    if (['สวัสดี', 'hi', 'hello', 'หวัดดี'].some(keyword => lowerCaseAction.includes(keyword))) {
        return { reply: 'สวัสดีครับ! ยินดีที่ได้พูดคุยกับท่านครับ มีอะไรให้ผมช่วยดูแลเป้าหมายของท่านวันนี้บ้างครับ?' };
    }
    if (['ทำอะไรได้บ้าง', 'ช่วยอะไรได้บ้าง', 'ความสามารถ', 'features'].some(keyword => lowerCaseAction.includes(keyword))) {
        return { reply: 'ผมสามารถช่วยท่านเช็คความคืบหน้าเป้าหมายต่างๆ เช่น ภาพรวม, เป้าหมายใกล้เดดไลน์, งานที่กำลังจะถึงกำหนด, หรือเป้าหมายการอ่าน นอกจากนี้ยังสามารถช่วยขยายเวลาเป้าหมายระยะยาว และประเมินโอกาสสำเร็จของเป้าหมายได้อีกด้วยครับ' };
    }
    if (['ขอบคุณ', 'thanks', 'thx'].some(keyword => lowerCaseAction.includes(keyword))) {
        return { reply: 'ยินดีครับ! หากมีสิ่งใดให้ช่วยอีก บอกผมได้เลยนะครับ!' };
    }
    if (['ไม่เข้าใจ', 'งง', 'ช่วยด้วย', 'help'].some(keyword => lowerCaseAction.includes(keyword))) {
        return { reply: 'ขออภัยครับที่ทำให้สับสน ท่านต้องการคำแนะนำหรือความช่วยเหลือในเรื่องใดเป็นพิเศษครับ? ลองเลือกจากคำแนะนำด้านล่างได้เลยนะครับ' };
    }
    if (['ยกเลิก', 'cancel'].some(keyword => lowerCaseAction.includes(keyword))) {
        return { reply: 'รับทราบครับ ยกเลิกคำสั่งเรียบร้อย หากต้องการทำอะไรต่อ บอกผมได้เลยครับ.', nextMode: 'default' };
    }

    const matchedGoal = allGoals.find(g => lowerCaseAction.includes(g.title.toLowerCase()));
    if (matchedGoal) {
        const { progressText, isCompleted, isUnsuccessful, isOngoing, isAhead } = calculateGoalProgress(matchedGoal);
        let status = '';
        if (isCompleted) status = '✅ สำเร็จแล้ว';
        else if (isUnsuccessful) status = '❌ ไม่สำเร็จ';
        else if (isAhead) status = '🗓️ ยังไม่เริ่ม';
        else if (isOngoing) status = '⏳ กำลังดำเนินอยู่';

        return { reply: `ความคืบหน้าของเป้าหมาย "${matchedGoal.title}":\n${progressText}\nสถานะ: ${status}` };
    }


    switch (action) {
        case 'เช็คภาพรวมความคืบหน้า': {
            const activeGoals = allGoals.filter(g => {
                const progress = calculateGoalProgress(g);
                return (progress.isOngoing || progress.isAhead);
            });
            if (activeGoals.length > 0) {
                const progressSummary = activeGoals.map(g => {
                    const { progressText } = calculateGoalProgress(g);
                    return `- "${g.title}": ${progressText}`;
                }).join('\n');
                return { reply: `นี่คือภาพรวมความคืบหน้าของเป้าหมายที่กำลังดำเนินอยู่ของท่าน:\n${progressSummary}` };
            } else {
                return { reply: 'ยอดเยี่ยมครับ! ขณะนี้ท่านไม่มีเป้าหมายที่กำลังดำเนินอยู่หรือกำลังจะเริ่มเลยครับ' };
            }
        }
        case 'เช็คเป้าหมายใกล้เดดไลน์': {
            const nearDeadlineGoals = allGoals.filter(isGoalNearDeadline);
            if (nearDeadlineGoals.length > 0) {
                const summary = nearDeadlineGoals.map(g => {
                    const { percent, completed, target } = calculateGoalProgress(g);
                    const endDate = g.endDate ? new Date(g.endDate).toLocaleDateString('th-TH') : 'ไม่ระบุ';
                    return `- เป้าหมาย "${g.title}" เหลืออีกไม่กี่วัน (กำหนด ${endDate}) ท่านทำไปแล้ว ${percent.toFixed(0)}% (${completed} จาก ${target} ${g.isReadingGoal ? 'หน้า' : 'งาน'})`;
                }).join('\n');
                return { reply: `ผมพบเป้าหมายที่ใกล้ถึงกำหนดดังนี้ครับ:\n${summary}` };
            } else {
                return { reply: 'ขณะนี้ท่านไม่มีเป้าหมายระยะยาวที่ใกล้ถึงกำหนดแล้วครับ' };
            }
        }
        case 'เช็คงานที่กำลังจะถึงกำหนด': {
            let upcomingTasksSummary: string[] = [];
            allGoals.forEach(g => {
                if (g.tasks && g.tasks.length > 0) {
                    const tasksDueSoon = g.tasks.filter(t => {
                        if (t.dueDate && t.status !== 'done') {
                            const dueDate = new Date(t.dueDate);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const timeDiff = dueDate.getTime() - today.getTime();
                            const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                            return dayDiff >= 0 && dayDiff <= 7;
                        }
                        return false;
                    });
                    if (tasksDueSoon.length > 0) {
                        const taskList = tasksDueSoon.map(t => `- "${t.description}" (ในเป้าหมาย "${g.title}") กำหนดส่ง: ${new Date(t.dueDate!).toLocaleDateString('th-TH')}`).join('\n');
                        upcomingTasksSummary.push(taskList);
                    }
                }
            });

            if (upcomingTasksSummary.length > 0) {
                return { reply: `ผมพบงานที่กำลังจะถึงกำหนดในสัปดาห์นี้ครับ:\n${upcomingTasksSummary.join('\n\n')}` };
            } else {
                return { reply: 'ขณะนี้ท่านไม่มีงานที่ใกล้ถึงกำหนดในสัปดาห์นี้ครับ' };
            }
        }
        case 'เช็คความคืบหน้าการอ่าน': {
            const readingGoals = allGoals.filter(g => g.isReadingGoal);
            if (readingGoals.length > 0) {
                const summary = readingGoals.map(g => {
                    const { progressText } = calculateGoalProgress(g);
                    return progressText;
                }).join('\n');
                return { reply: `นี่คือความคืบหน้าของเป้าหมายการอ่านของท่าน:\n${summary}` };
            } else {
                return { reply: 'ท่านยังไม่ได้สร้างเป้าหมายการอ่านหนังสือครับ' };
            }
        }
        case 'ขยายเวลาเป้าหมายระยะยาว': {
            const nearestGoal = findNearestLongtermGoal(allGoals);
            if (nearestGoal) {
                return { reply: `ท่านต้องการขยายเวลาของเป้าหมาย "${nearestGoal.title}" ออกไปกี่วันครับ? กรุณาพิมพ์ตัวเลขจำนวนวัน`, nextMode: 'extending_goal', goal: nearestGoal };
            } else {
                return { reply: 'ขออภัยครับ ตอนนี้ท่านไม่มีเป้าหมายระยะยาวที่สามารถขยายเวลาได้' };
            }
        }
        case 'ประเมินโอกาสสำเร็จของเป้าหมาย': {
            const ongoingGoals = allGoals.filter(g => calculateGoalProgress(g).isOngoing);
            if (ongoingGoals.length === 0) {
                return { reply: 'ท่านยังไม่มีเป้าหมายที่กำลังดำเนินอยู่ให้ผมช่วยประเมินเลยครับ' };
            }
            if (ongoingGoals.length === 1) {
                const goal = ongoingGoals[0];
                return { reply: `เรามาประเมินโอกาสสำเร็จของเป้าหมาย "${goal.title}" กันครับ\n\nก่อนอื่น ถามว่าท่านตั้งใจและทุ่มเทกับเป้าหมายนี้มากแค่ไหนครับ? (1 = น้อยมาก, 10 = มากที่สุด)`, nextMode: 'predicting_chance_asking_effort', goal: goal };
            } else {
                const goalList = ongoingGoals.map((g, i) => `${i + 1}. "${g.title}"`).join('\n');
                return { reply: `ท่านมีเป้าหมายที่กำลังดำเนินอยู่หลายข้อครับ:\n${goalList}\n\nท่านต้องการให้ผมประเมินเป้าหมายข้อใดครับ? (พิมพ์ตัวเลขหรือชื่อเป้าหมาย)` , nextMode: 'predicting_chance_selecting_goal', goal: undefined};
            }
        }
        default:
            return { reply: 'ขออภัยครับ ผมไม่เข้าใจคำสั่งนี้ กรุณาเลือกจากตัวเลือกด้านล่าง หรือลองพิมพ์คำถามที่ชัดเจนขึ้นครับ' };
    }
};

const SuggestionButton = ({ title, onPress, isDarkMode }: { title: string; onPress: () => void; isDarkMode: boolean }) => (
    <TouchableOpacity
        style={[styles.suggestionButtonNoIcon, isDarkMode ? styles.suggestionButtonDark : styles.suggestionButtonLight]}
        onPress={onPress}
    >
        <Text style={[styles.suggestionText, isDarkMode ? styles.suggestionTextDark : styles.suggestionTextLight]}>
            {title}
        </Text>
    </TouchableOpacity>
);

const SuggestionSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
    const { isDarkMode } = useDarkMode();
    return (
        <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, isDarkMode ? styles.sectionTitleDark : styles.sectionTitleLight]}>{title}</Text>
            <View style={styles.suggestionsRow}>
                {children}
            </View>
        </View>
    );
};

export default function ChatbotScreen() {
    const { isDarkMode } = useDarkMode();
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [botMode, setBotMode] = useState<BotMode>('default');
    const [inputText, setInputText] = useState('');
    const [goalToExtend, setGoalToExtend] = useState<Goal | undefined>(undefined);
    const [goalForPrediction, setGoalForPrediction] = useState<Goal | undefined>(undefined);
    const [tempEffortForPrediction, setTempEffortForPrediction] = useState<number | undefined>(undefined); // NEW: State for tempEffort
    const flatListRef = useRef<FlatList<Message>>(null);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [isBotTyping, setIsBotTyping] = useState(false);


    const addMessage = (sender: 'user' | 'bot', text: string, isTyping: boolean = false) => {
        setMessages(prevMessages => [
            { id: Date.now().toString(), text, sender, isTyping },
            ...prevMessages,
        ]);
        if (flatListRef.current) {
            setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
        }
    };

    const fetchGoalsAndStartChat = async () => {
        setIsLoadingInitial(true);
        try {
            const allGoals = await loadGoals();
            setGoals(allGoals);

            let initialBotMessages: Message[] = [];
            const activeGoals = allGoals.filter(g => {
                const progress = calculateGoalProgress(g);
                return (progress.isOngoing || progress.isAhead);
            });
            const nearDeadlineGoals = allGoals.filter(isGoalNearDeadline);
            const goalsWithUpcomingTasks = allGoals.filter(g => g.tasks?.some(t => {
                if (t.dueDate && t.status !== 'done') {
                    const dueDate = new Date(t.dueDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const timeDiff = dueDate.getTime() - today.getTime();
                    const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                    return dayDiff >= 0 && dayDiff <= 3;
                }
                return false;
            }));

            if (activeGoals.length > 0) {
                initialBotMessages.push({
                    id: 'greeting_active',
                    text: `สวัสดีครับ! ท่านมีเป้าหมายที่กำลังดำเนินอยู่ถึง ${activeGoals.length} เป้าหมายเลยนะครับ!`,
                    sender: 'bot'
                });
            } else {
                initialBotMessages.push({
                    id: 'greeting_no_active',
                    text: `สวัสดีครับ! วันนี้ท่านยังไม่มีเป้าหมายที่กำลังดำเนินอยู่เลยครับ เยี่ยมมาก หรือท่านต้องการเริ่มเป้าหมายใหม่?`,
                    sender: 'bot'
                });
            }

            if (nearDeadlineGoals.length > 0) {
                const goalTitles = nearDeadlineGoals.map(g => `"${g.title}"`).join(', ');
                initialBotMessages.push({
                    id: 'deadline_alert',
                    text: `📢 แจ้งเตือน: เป้าหมาย ${goalTitles} ของท่านใกล้จะถึงกำหนดแล้วครับ!`,
                    sender: 'bot'
                });
            }

            if (goalsWithUpcomingTasks.length > 0) {
                const taskDescriptions = goalsWithUpcomingTasks.flatMap(g =>
                    g.tasks?.filter(t => {
                        if (t.dueDate && t.status !== 'done') {
                            const dueDate = new Date(t.dueDate);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const timeDiff = dueDate.getTime() - today.getTime();
                            const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                            return dayDiff >= 0 && dayDiff <= 3;
                        }
                        return false;
                    }).map(t => `"${t.description}" (ในเป้าหมาย "${g.title}")`) || []
                ).join(', ');
                initialBotMessages.push({
                    id: 'task_alert',
                    text: `🔔 ท่านมีงาน ${taskDescriptions} ที่กำลังจะถึงกำหนดใน 3 วันนี้ครับ!`,
                    sender: 'bot'
                });
            }

            initialBotMessages.push({
                id: 'prompt',
                text: 'ท่านต้องการให้ผมช่วยเรื่องใดครับ? ลองเลือกจากคำแนะนำด้านล่างได้เลยนะครับ',
                sender: 'bot'
            });

            setMessages(initialBotMessages.reverse());
        } catch (error) {
            console.error("Failed to load goals:", error);
            addMessage('bot', 'สวัสดีครับ! ขณะนี้ผมไม่สามารถโหลดเป้าหมายของท่านได้ แต่ผมพร้อมจะให้ความช่วยเหลือครับ!', false);
        } finally {
            setIsLoadingInitial(false);
        }
    };

    useEffect(() => {
        fetchGoalsAndStartChat();
    }, []);

    const handleAction = async (action: string) => {
        addMessage('user', action);
        setIsBotTyping(true);

        const { reply, nextMode, goal, tempEffort: returnedEffort } = await getBotResponse(action, goals, botMode, goalForPrediction, tempEffortForPrediction);
        setTimeout(() => {
            addMessage('bot', reply);
            if (nextMode) setBotMode(nextMode);
            if (goal) setGoalForPrediction(goal);
            if (returnedEffort !== undefined) setTempEffortForPrediction(returnedEffort);
            setIsBotTyping(false);
        }, 1000);
    };

    const handleInput = async () => {
        if (!inputText.trim()) return;

        addMessage('user', inputText);
        setIsBotTyping(true);
        setInputText('');

        if (botMode.startsWith('predicting_chance')) {
            if (botMode === 'predicting_chance_selecting_goal') {
                const selectedGoalIndex = parseInt(inputText, 10);
                const ongoingGoals = goals.filter(g => calculateGoalProgress(g).isOngoing);

                let targetGoal: Goal | undefined;
                if (!isNaN(selectedGoalIndex) && selectedGoalIndex > 0 && selectedGoalIndex <= ongoingGoals.length) {
                    targetGoal = ongoingGoals[selectedGoalIndex - 1];
                } else {
                    targetGoal = ongoingGoals.find(g => g.title.toLowerCase().includes(inputText.toLowerCase()));
                }

                if (targetGoal) {
                    setGoalForPrediction(targetGoal);
                    setTimeout(() => {
                        addMessage('bot', `รับทราบครับ เป้าหมาย "${targetGoal?.title}"\n\nก่อนอื่น ถามว่าท่านตั้งใจและทุ่มเทกับเป้าหมายนี้มากแค่ไหนครับ? (1 = น้อยมาก, 10 = มากที่สุด)`);
                        setBotMode('predicting_chance_asking_effort');
                        setIsBotTyping(false);
                    }, 1000);
                } else {
                    setTimeout(() => {
                        addMessage('bot', 'ขออภัยครับ ไม่พบเป้าหมายที่ท่านเลือก กรุณาป้อนตัวเลขหรือชื่อเป้าหมายที่ถูกต้อง');
                        setIsBotTyping(false);
                    }, 1000);
                }
            } else {
                const { reply, nextMode, goal, tempEffort: returnedEffort } = await getBotResponse(inputText, goals, botMode, goalForPrediction, tempEffortForPrediction);
                setTimeout(async () => {
                    addMessage('bot', reply);
                    if (nextMode) setBotMode(nextMode);
                    if (goal) setGoalForPrediction(goal);
                    if (returnedEffort !== undefined) setTempEffortForPrediction(returnedEffort);
                    setIsBotTyping(false);
                }, 1000);
            }
        }
        else if (botMode === 'extending_goal' && goalToExtend) {
            const days = parseInt(inputText, 10);
            if (isNaN(days) || days <= 0) {
                setTimeout(() => {
                    addMessage('bot', 'กรุณาป้อนตัวเลขจำนวนวันเป็นจำนวนเต็มบวกที่ถูกต้องครับ');
                    setIsBotTyping(false);
                }, 1000);
            } else {
                try {
                    const currentEndDate = goalToExtend.endDate ? new Date(goalToExtend.endDate) : new Date();
                    const newEndDate = new Date(currentEndDate);
                    newEndDate.setDate(currentEndDate.getDate() + days);

                    const updatedGoal = { ...goalToExtend, endDate: newEndDate.toISOString().split('T')[0] };
                    await updateGoal(updatedGoal);

                    setTimeout(() => {
                        addMessage('bot', `เป้าหมาย "${goalToExtend.title}" ของท่านถูกขยายเวลาออกไปอีก ${days} วันแล้วครับ! วันสิ้นสุดใหม่คือ ${newEndDate.toLocaleDateString('th-TH')}`);
                        setIsBotTyping(false);
                    }, 1000);

                    const updatedGoals = await loadGoals();
                    setGoals(updatedGoals);
                } catch (error) {
                    console.error("Error extending goal:", error);
                    setTimeout(() => {
                        addMessage('bot', 'ขออภัยครับ มีข้อผิดพลาดในการขยายเวลาเป้าหมาย กรุณาลองใหม่อีกครั้ง');
                        setIsBotTyping(false);
                    }, 1000);
                }
            }
            setBotMode('default');
            setGoalToExtend(undefined);
        } else {
            const { reply, nextMode } = await getBotResponse(inputText, goals, botMode, goalForPrediction, tempEffortForPrediction);
            setTimeout(async () => {
                addMessage('bot', reply);
                if (nextMode) setBotMode(nextMode);
                setIsBotTyping(false);
            }, 1000);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={[styles.messageRow, item.sender === 'user' ? styles.userMessageRow : styles.botMessageRow]}>
            {item.sender === 'bot' && (
                <>
                    <Image source={BotAvatar} style={styles.avatar} />
                    {item.isTyping ? (
                        <View style={[styles.messageBubble, styles.botMessage, styles.botBubbleCorners, { width: 50, height: 30, justifyContent: 'center', alignItems: 'center' }]}>
                            <ActivityIndicator size="small" color={isDarkMode ? '#000' : '#333'} />
                        </View>
                    ) : (
                        <View style={[styles.messageBubble, styles.botMessage, styles.botBubbleCorners]}>
                            <Text style={[styles.messageText, styles.botText]}>{item.text}</Text>
                        </View>
                    )}
                </>
            )}
            {item.sender === 'user' && (
                <>
                    <View style={[styles.messageBubble, styles.userMessage, styles.userBubbleCorners]}>
                        <Text style={[styles.messageText, styles.userText]}>{item.text}</Text>
                    </View>
                    <Image source={UserAvatar} style={styles.avatar} />
                </>
            )}
        </View>
    );

    const renderSuggestions = () => {
        const canExtendGoals = findNearestLongtermGoal(goals) !== undefined;
        const hasReadingGoals = goals.some(g => g.isReadingGoal);
        const hasOngoingGoals = goals.some(g => calculateGoalProgress(g).isOngoing);

        if (botMode === 'extending_goal' || botMode.startsWith('predicting_chance')) {
            return (
                <View style={[styles.suggestionsContainer, isDarkMode ? styles.suggestionsContainerDark : styles.suggestionsContainerLight]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScrollView}>
                        <SuggestionSection title="ยกเลิก">
                            <SuggestionButton
                                title="ยกเลิก"
                                onPress={() => {
                                    addMessage('user', 'ยกเลิก');
                                    setTimeout(() => {
                                        addMessage('bot', 'รับทราบครับ ยกเลิกคำสั่งเรียบร้อย หากต้องการทำอะไรต่อ บอกผมได้เลยครับ.');
                                        setBotMode('default');
                                        setGoalToExtend(undefined);
                                        setGoalForPrediction(undefined);
                                        setTempEffortForPrediction(undefined);
                                        setInputText('');
                                    }, 500);
                                }}
                                isDarkMode={isDarkMode}
                            />
                        </SuggestionSection>
                    </ScrollView>
                </View>
            );
        }


        return (
            <View style={[styles.suggestionsContainer, isDarkMode ? styles.suggestionsContainerDark : styles.suggestionsContainerLight]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScrollView}>

                    <SuggestionSection title="ภาพรวมเป้าหมาย">
                        <SuggestionButton
                            title="เช็คภาพรวมความคืบหน้า"
                            onPress={() => handleAction('เช็คภาพรวมความคืบหน้า')}
                            isDarkMode={isDarkMode}
                        />
                        <SuggestionButton
                            title="เช็คเป้าหมายใกล้เดดไลน์"
                            onPress={() => handleAction('เช็คเป้าหมายใกล้เดดไลน์')}
                            isDarkMode={isDarkMode}
                        />
                        <SuggestionButton
                            title="เช็คงานที่กำลังจะถึงกำหนด"
                            onPress={() => handleAction('เช็คงานที่กำลังจะถึงกำหนด')}
                            isDarkMode={isDarkMode}
                        />
                    </SuggestionSection>

                    {hasReadingGoals && (
                        <SuggestionSection title="เป้าหมายการอ่าน">
                            <SuggestionButton
                                title="เช็คความคืบหน้าการอ่าน"
                                onPress={() => handleAction('เช็คความคืบหน้าการอ่าน')}
                                isDarkMode={isDarkMode}
                            />
                        </SuggestionSection>
                    )}

                    <SuggestionSection title="การจัดการเป้าหมาย">
                        {canExtendGoals && (
                            <SuggestionButton
                                title="ขยายเวลาเป้าหมายระยะยาว"
                                onPress={() => handleAction('ขยายเวลาเป้าหมายระยะยาว')}
                                isDarkMode={isDarkMode}
                            />
                        )}
                        {hasOngoingGoals && (
                            <SuggestionButton
                                title="ประเมินโอกาสสำเร็จของเป้าหมาย"
                                onPress={() => handleAction('ประเมินโอกาสสำเร็จของเป้าหมาย')}
                                isDarkMode={isDarkMode}
                            />
                        )}
                    </SuggestionSection>

                    <SuggestionSection title="คำถามทั่วไป">
                        <SuggestionButton
                            title="สวัสดี"
                            onPress={() => handleAction('สวัสดี')}
                            isDarkMode={isDarkMode}
                        />
                        <SuggestionButton
                            title="ฉันทำอะไรได้บ้าง?"
                            onPress={() => handleAction('ฉันทำอะไรได้บ้าง?')}
                            isDarkMode={isDarkMode}
                        />
                        <SuggestionButton
                            title="ขอบคุณ"
                            onPress={() => handleAction('ขอบคุณ')}
                            isDarkMode={isDarkMode}
                        />
                    </SuggestionSection>

                </ScrollView>
            </View>
        );
    };

    const renderInput = () => (
        <View style={[styles.inputContainer, isDarkMode ? styles.inputContainerDark : styles.inputContainerLight]}>
            <TextInput
                style={[styles.textInput, isDarkMode ? styles.textInputDark : styles.textInputLight]}
                value={inputText}
                onChangeText={setInputText}
                placeholder={
                    botMode === 'extending_goal' ? "ป้อนจำนวนวัน..." :
                    botMode.startsWith('predicting_chance') ? "ป้อนตัวเลข (1-10)..." :
                    "พิมพ์ข้อความ หรือเลือกคำสั่งด้านล่าง..."
                }
                placeholderTextColor={isDarkMode ? '#888' : '#aaa'}
                keyboardType={(botMode === 'extending_goal' || botMode.startsWith('predicting_chance_asking')) ? "numeric" : "default"}
                returnKeyType="send"
                onSubmitEditing={handleInput}
                editable={!isBotTyping}
            />
            <TouchableOpacity onPress={handleInput} style={styles.sendButton} disabled={!inputText.trim() || isBotTyping}>
                <Image source={SendIcon} style={[styles.iconButtonImageSend, { tintColor: (!inputText.trim() || isBotTyping) ? '#BBB' : '#FFF' }]} />
            </TouchableOpacity>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={[styles.container, isDarkMode ? styles.bgDark : styles.bgLight]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 20}
        >
            <LinearGradient
                colors={['#F6A192', '#F7B394']}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Image source={BackIcon} style={styles.iconButtonImage} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: '#fff' }]}>ผู้ช่วย AI ส่วนตัว</Text>
            </LinearGradient>

            {isLoadingInitial ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={isDarkMode ? '#F7B394' : '#F6A192'} />
                    <Text style={[styles.loadingText, isDarkMode ? { color: '#bbb' } : null]}>กำลังโหลดข้อมูลเป้าหมาย...</Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.chatList}
                    inverted
                    keyboardShouldPersistTaps="handled"
                />
            )}
            {renderSuggestions()}
            {renderInput()}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    bgLight: {
        backgroundColor: '#F7F9FC',
    },
    bgDark: {
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        borderBottomWidth: 1,
        borderBottomColor: '#F7B394',
        minHeight: Platform.OS === 'ios' ? 90 : 70,
    },
    backButton: {
        position: 'absolute',
        left: 15,
        top: Platform.OS === 'ios' ? 50 : 30,
        zIndex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#34495E',
    },
    chatList: {
        paddingHorizontal: 10,
        paddingVertical: 10,
        flexGrow: 1,
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: 4,
        maxWidth: '100%',
    },
    userMessageRow: {
        justifyContent: 'flex-end',
    },
    botMessageRow: {
        justifyContent: 'flex-start',
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginHorizontal: 8,
        marginBottom: 5,
    },
    messageBubble: {
        padding: 10,
        borderRadius: 16,
        marginVertical: 4,
        maxWidth: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    userMessage: {
        backgroundColor: '#937BEF',
    },
    botMessage: {
        backgroundColor: '#E5E5EA',
    },
    userBubbleCorners: {
        borderBottomRightRadius: 8,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 16,
    },
    botBubbleCorners: {
        borderBottomLeftRadius: 8,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomRightRadius: 16,
    },
    messageText: {
        fontSize: 15,
    },
    userText: {
        color: '#FFFFFF',
    },
    botText: {
        color: '#000000',
    },
    suggestionsContainer: {
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 25 : 15,
        borderTopWidth: 1,
    },
    suggestionsContainerLight: {
        backgroundColor: '#F7F9FC',
        borderTopColor: '#E0E0E0',
    },
    suggestionsContainerDark: {
        backgroundColor: '#121212',
        borderTopColor: '#333',
    },
    suggestionsScrollView: {
        flexDirection: 'row',
        paddingHorizontal: 10,
        alignItems: 'flex-start',
        paddingVertical: 5,
    },
    sectionContainer: {
        marginRight: 10,
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 6,
        paddingLeft: 5,
    },
    sectionTitleLight: {
        color: '#7F8C8D',
    },
    sectionTitleDark: {
        color: '#95A5A6',
    },
    suggestionsRow: {
        flexDirection: 'column',
    },
    suggestionButtonNoIcon: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginVertical: 3,
        borderWidth: 1.5,
        justifyContent: 'center',
        minWidth: 150,
    },
    suggestionButtonLight: {
        backgroundColor: '#FFFFFF',
        borderColor: '#937BEF',
    },
    suggestionButtonDark: {
        backgroundColor: '#2E2E2E',
        borderColor: '#B9A6F7',
    },
    suggestionText: {
        fontSize: 13,
        fontWeight: 'bold',
        marginLeft: 0,
    },
    suggestionTextLight: {
        color: '#333',
    },
    suggestionTextDark: {
        color: '#B9A6F7',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderTopWidth: 1,
    },
    inputContainerLight: {
        backgroundColor: '#FFFFFF',
        borderTopColor: '#E0E0E0',
    },
    inputContainerDark: {
        backgroundColor: '#1E1E1E',
        borderTopColor: '#333',
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 22,
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        minHeight: 45,
    },
    textInputLight: {
        borderColor: '#E0E0E0',
        color: '#333',
    },
    textInputDark: {
        borderColor: '#333',
        color: '#fff',
    },
    sendButton: {
        backgroundColor: '#937BEF',
        borderRadius: 22,
        width: 45,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    iconButtonImage: {
        width: 24,
        height: 24,
        resizeMode: 'contain',
        tintColor: '#fff',
    },
    iconButtonImageSend: {
        width: 20,
        height: 20,
        resizeMode: 'contain',
        tintColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
});