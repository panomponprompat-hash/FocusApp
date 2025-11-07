import { Stack } from 'expo-router';

export default function GoalsLayout() {
  return (
    <Stack>
      <Stack.Screen name="goals" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'สร้างเป้าหมายใหม่' , headerShown: false }} />
      <Stack.Screen name="manageTasks/[id]" options={{ title: 'จัดการ Tasks' , headerShown: false}} />
    </Stack>
  );
}