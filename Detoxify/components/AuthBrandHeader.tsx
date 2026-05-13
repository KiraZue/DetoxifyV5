import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors, spacing, fontSize, fontWeight } from './theme';

type Props = {
  title: string;
  subtitle: string;
};

export function AuthBrandHeader({ title, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      <Image
        source={require('../assets/images/icon.png')}
        style={styles.logo}
        contentFit="contain"
        accessibilityRole="image"
        accessibilityLabel="Detoxify logo"
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
