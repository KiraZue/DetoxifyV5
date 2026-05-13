import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius } from './theme';
import { getPasswordStrength } from '../utils/passwordStrength';

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** When true, shows segmented strength meter under the field */
  showStrengthMeter?: boolean;
};

const STRENGTH_COLORS: Record<number, string> = {
  1: colors.error,
  2: colors.warning,
  3: colors.primaryLight,
  4: colors.primaryDark,
};

export function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  showStrengthMeter = false,
}: Props) {
  const [visible, setVisible] = useState(false);
  const strength = useMemo(() => getPasswordStrength(value), [value]);

  const barColor =
    strength.level > 0 ? STRENGTH_COLORS[strength.level] ?? colors.border : colors.border;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons
            name={visible ? 'eye-outline' : 'eye-off-outline'}
            size={22}
            color={colors.textLight}
          />
        </TouchableOpacity>
      </View>

      {showStrengthMeter && value.length > 0 && (
        <View style={styles.meter}>
          <View style={styles.bars}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  i <= strength.filled
                    ? { backgroundColor: barColor }
                    : { backgroundColor: colors.border },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.strengthLabel, { color: barColor }]}>{strength.label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  eyeBtn: {
    padding: spacing.sm,
  },
  meter: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  bars: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.xs,
  },
});
