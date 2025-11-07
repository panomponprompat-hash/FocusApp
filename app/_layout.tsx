import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { DarkModeProvider } from '../context/DarkModeContext';
import * as SecureStore from 'expo-secure-store';
import { loadDarkMode } from '../lib/storage'; 

export default function RootLayout() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await loadDarkMode();
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  if (!isReady) {
    return null; 
  }

  return (
    <DarkModeProvider>
      <Stack>
        <Stack.Screen name="goals" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="goals/new" options={{ title: 'สร้างเป้าหมายใหม่' , headerShown: false}} />
        <Stack.Screen name="goals/manageTasks/[id]" options={{ title: 'จัดการ Tasks' , headerShown: false}} />
        <Stack.Screen name="Pomodoro" options={{ headerShown: false }} />
        <Stack.Screen name="MonthlySummary" options={{ title: 'สรุปผลรายเดือน' ,  headerShown: false }} />
        <Stack.Screen name="ChatbotScreen" options={{ headerShown: false }} />
        <Stack.Screen name="backup" options={{ headerShown: false }} />
      </Stack>
    </DarkModeProvider>
  );
}