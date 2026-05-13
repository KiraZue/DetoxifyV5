import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { API_URL } from '../../config';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, fontWeight, borderRadius } from '../../components/theme';
import { useTheme } from '../../components/ThemeContext';
import { Card } from '../../components/Card';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('Friend');
  const [streak, setStreak] = useState(0);
  const { colors } = useTheme();

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      if (user.user_metadata?.username) {
        setUsername(user.user_metadata.username);
      }
      
      try {
        const response = await fetch(`${API_URL}/api/streaks/${user.id}`);
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setStreak(data.current_streak || 0);
        } else {
          const text = await response.text();
          console.error(`Unexpected response from streak API (${response.status}):`, text.substring(0, 100));
          setStreak(0);
        }
      } catch (error) {
        console.error('Network error fetching streak:', error);
      }
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const RoutineItem = ({ icon, title, subtitle, color, onPress }: { icon: any, title: string, subtitle: string, color: string, onPress: () => void }) => (
    <TouchableOpacity style={styles.routineRow} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.routineTextContainer}>
        <Text style={[styles.routineTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.routineSubtitle, { color: colors.textLight }]}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.content}>
          {/* Greeting Section */}
          <View style={styles.greetingHeader}>
            <View>
              <Text style={[styles.greeting, { color: colors.text }]}>Hi {username}!</Text>
              <Text style={[styles.encouragement, { color: colors.textLight }]}>A fresh start to your journey today. Keep going!</Text>
            </View>
          </View>

          {/* Streak Dashboard */}
          <Card style={[styles.streakCard, { backgroundColor: colors.primary }]}>
            <View style={styles.streakHeader}>
              <View>
                <Text style={[styles.streakLabel, { color: colors.secondary }]}>Current Streak</Text>
                <View style={styles.streakValueRow}>
                  <Text style={[styles.streakValue, { color: colors.secondary }]}>{streak}</Text>
                  <Text style={[styles.streakUnit, { color: colors.secondary }]}>Days</Text>
                </View>
              </View>
              <View style={styles.streakIconContainer}>
                <Ionicons name="leaf" size={40} color={colors.secondary} />
              </View>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${(streak % 7) / 7 * 100}%`, backgroundColor: colors.secondary }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.secondary }]}>{streak % 7} / 7 days to your next milestone!</Text>
          </Card>

          {/* Routines Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily Routines</Text>
          </View>
          
          <Card style={[styles.routinesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <RoutineItem 
              icon="sunny-outline" 
              title="Morning Routine" 
              subtitle="Start with mindfulness"
              color="#F59E0B"
              onPress={() => router.push({ pathname: '/routine', params: { category: 'Morning' } })}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <RoutineItem 
              icon="partly-sunny-outline" 
              title="Afternoon Routine" 
              subtitle="Stay productive & focused"
              color="#3B82F6"
              onPress={() => router.push({ pathname: '/routine', params: { category: 'Afternoon' } })}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <RoutineItem 
              icon="moon-outline" 
              title="Evening Routine" 
              subtitle="Reflect and wind down"
              color="#6366F1"
              onPress={() => router.push({ pathname: '/routine', params: { category: 'Evening' } })}
            />
          </Card>

          {/* Encouragement Quote */}
          <View style={[styles.quoteCard, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
            <Ionicons name="chatbox-ellipses" size={24} color={colors.primary + '40'} />
            <Text style={[styles.quoteText, { color: colors.text }]}>
              "The secret of getting ahead is getting started."
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  greeting: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  encouragement: {
    fontSize: fontSize.md,
    marginTop: 4,
    maxWidth: '85%',
  },
  streakCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  streakLabel: {
    fontSize: fontSize.md,
    opacity: 0.9,
  },
  streakValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  streakValue: {
    fontSize: 42,
    fontWeight: fontWeight.bold,
  },
  streakUnit: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  streakIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: fontSize.xs,
    opacity: 0.8,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  routinesCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    borderWidth: 1,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  routineTextContainer: {
    flex: 1,
  },
  routineTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  routineSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.md,
  },
  quoteCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  quoteText: {
    fontSize: fontSize.md,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
});
