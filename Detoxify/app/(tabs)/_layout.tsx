import { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { supabase } from '../../supabase';
import { API_URL } from '../../config';
import { spacing, fontSize, fontWeight, borderRadius } from '../../components/theme';
import { useTheme } from '../../components/ThemeContext';

const HeaderRight = () => {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const { colors } = useTheme();

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (user.user_metadata?.avatar_url) {
        setAvatarUrl(user.user_metadata.avatar_url);
      }
      
      try {
        const response = await fetch(`${API_URL}/api/streaks/${user.id}`);
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setStreak(data.current_streak || 0);
        } else {
          const text = await response.text();
          console.error(`Unexpected response in HeaderRight (${response.status}):`, text.substring(0, 100));
        }
      } catch (error) {
        console.error('HeaderRight streak fetch error:', error);
      }
    }
  };

  useEffect(() => {
    fetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.user_metadata?.avatar_url) {
        setAvatarUrl(session.user.user_metadata.avatar_url);
      } else {
        setAvatarUrl(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <View style={styles.headerRight}>
      <View style={[styles.streakContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="leaf" size={18} color={colors.primary} />
        <Text style={[styles.streakText, { color: colors.primary }]}>{streak}</Text>
      </View>
      <TouchableOpacity 
        style={styles.userButton}
        onPress={() => router.push('/profile')}
      >
        {avatarUrl ? (
          <Image 
            source={{ uri: avatarUrl }} 
            style={[styles.avatar, { borderColor: colors.primary }]} 
          />
        ) : (
          <Ionicons name="person-circle" size={32} color={colors.primary} />
        )}
      </TouchableOpacity>
    </View>
  );
};

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          height: Platform.OS === 'ios' ? 140 : 120,
        },
        headerTitleStyle: {
          fontSize: 24,
          fontWeight: '700',
          color: colors.text,
          paddingTop: Platform.OS === 'ios' ? 45 : 25,
        },
        headerTitleAlign: 'left',
        headerRight: () => <HeaderRight />,
        headerRightContainerStyle: {
          paddingTop: Platform.OS === 'ios' ? 45 : 25,
          paddingRight: spacing.sm,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 70,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 5,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'ios' ? 6 : 8,
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="routine"
        options={{
          title: 'Routine',
          tabBarLabel: 'Routine',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkbox" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarLabel: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="newspaper" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    gap: spacing.sm,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  streakText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  userButton: {
    padding: spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
  },
});
