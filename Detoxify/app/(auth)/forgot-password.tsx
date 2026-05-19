import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { supabase } from '../../supabase';
import { Button } from '../../components/Button';
import { spacing, fontSize, fontWeight, borderRadius } from '../../components/theme';
import { useTheme } from '../../components/ThemeContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { colors } = useTheme();

  async function handleResetPassword() {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    
    // Dynamically create the redirect URL so it works in Expo Go and production
    const redirectTo = Linking.createURL('reset-password');
    console.log('Redirecting to:', redirectTo);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Check Your Email',
        'We have sent a password reset link to your email address. Please click the link to return to the app and set your new password.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]}>Forgot Password</Text>
        <Text style={[styles.subtitle, { color: colors.textLight }]}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter your email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <Button
            title="Send Reset Link"
            onPress={handleResetPassword}
            loading={loading}
            style={styles.button}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    zIndex: 10,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  form: {
    gap: spacing.lg,
  },
  inputContainer: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginLeft: spacing.xs,
  },
  input: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    fontSize: fontSize.md,
    borderWidth: 1,
  },
  button: {
    marginTop: spacing.md,
  },
});
