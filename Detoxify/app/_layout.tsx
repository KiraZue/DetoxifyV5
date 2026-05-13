import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationProvider } from '../components/NotificationProvider';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { supabase } from '../supabase';
import { Session } from '@supabase/supabase-js';

function MainLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { colors, isDarkMode } = useTheme();

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setInitialized(true);
      
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/reset-password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);


    useEffect(() => {
      if (session) {
        const checkBanStatus = async () => {
          const { data } = await supabase
            .from('profiles')
            .select('is_banned')
            .eq('id', session.user.id)
            .single();
          
          if (data?.is_banned) {
            await supabase.auth.signOut();
            alert('Your account has been suspended for violating community guidelines.');
            router.replace('/signin');
          }
        };
        checkBanStatus();
      }
    }, [session]);

    useEffect(() => {
      if (!initialized || !navigationState?.key) return;

      const inAuthGroup = segments.length > 0 && segments[0] === '(auth)';
      const isResetPassword = segments.some((segment) => segment === 'reset-password');

      if (!session && !inAuthGroup && segments.length > 0) {
        router.replace('/signin');
      } else if (session && inAuthGroup && !isResetPassword) {
        router.replace('/(tabs)');
      }
    }, [session, initialized, segments, navigationState?.key]);

  if (!initialized) return null;

  return (
    <NotificationProvider>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background, flex: 1 },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </NotificationProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainLayout />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
