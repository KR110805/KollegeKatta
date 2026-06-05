/**
 * Kollege Katta — Neo-Brutalism Dark Mode Design System
 * All style tokens and reusable style factories.
 */

import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

export const COLORS = {
  background: '#000000',
  surface: '#111111',
  surfaceElevated: '#1A1A1A',
  border: '#FFFFFF',
  borderMuted: '#333333',
  primary: '#00FF41',       // Matrix green
  secondary: '#FF3366',     // Hot pink
  tertiary: '#FFDD00',      // Bright yellow
  info: '#00BFFF',          // Deep sky blue
  textPrimary: '#FFFFFF',
  textMuted: '#888888',
  textDark: '#000000',
  danger: '#FF4444',
  success: '#00FF41',
  overlay: 'rgba(0, 0, 0, 0.85)',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BORDER = {
  width: 3,
  radius: 0,
  shadowOffset: { width: 4, height: 4 },
} as const;

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 28,
  hero: 36,
} as const;

/** Neo-Brutalism card style */
export const cardStyle: ViewStyle = {
  backgroundColor: COLORS.surface,
  borderWidth: BORDER.width,
  borderColor: COLORS.border,
  borderRadius: BORDER.radius,
  padding: SPACING.md,
  shadowColor: COLORS.border,
  shadowOffset: BORDER.shadowOffset,
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 8,
};

/** Neo-Brutalism button style */
export const buttonStyle: ViewStyle = {
  backgroundColor: COLORS.primary,
  borderWidth: BORDER.width,
  borderColor: COLORS.textPrimary,
  borderRadius: BORDER.radius,
  paddingVertical: SPACING.sm + 4,
  paddingHorizontal: SPACING.lg,
  shadowColor: COLORS.textPrimary,
  shadowOffset: BORDER.shadowOffset,
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 6,
  alignItems: 'center',
  justifyContent: 'center',
};

export const buttonTextStyle: TextStyle = {
  color: COLORS.textDark,
  fontSize: FONT_SIZES.lg,
  fontWeight: '900',
  textTransform: 'uppercase',
  letterSpacing: 2,
};

export const buttonDisabledStyle: ViewStyle = {
  ...buttonStyle,
  backgroundColor: COLORS.borderMuted,
  shadowOpacity: 0,
  elevation: 0,
};

/** Screen container */
export const screenContainer: ViewStyle = {
  flex: 1,
  backgroundColor: COLORS.background,
  padding: SPACING.md,
};

/** Input field style */
export const inputStyle: ViewStyle & TextStyle = {
  backgroundColor: COLORS.surface,
  borderWidth: BORDER.width,
  borderColor: COLORS.border,
  borderRadius: BORDER.radius,
  color: COLORS.textPrimary,
  fontSize: FONT_SIZES.lg,
  fontWeight: '700',
  paddingVertical: SPACING.sm + 4,
  paddingHorizontal: SPACING.md,
};

/** Section heading */
export const headingStyle: TextStyle = {
  color: COLORS.primary,
  fontSize: FONT_SIZES.xxl,
  fontWeight: '900',
  textTransform: 'uppercase',
  letterSpacing: 3,
};

/** Sub heading */
export const subHeadingStyle: TextStyle = {
  color: COLORS.textMuted,
  fontSize: FONT_SIZES.md,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginTop: SPACING.xs,
};

/** Chip (selectable tag) */
export const chipStyle: ViewStyle = {
  borderWidth: 2,
  borderColor: COLORS.border,
  borderRadius: BORDER.radius,
  paddingVertical: SPACING.xs + 2,
  paddingHorizontal: SPACING.md,
  marginRight: SPACING.sm,
  marginBottom: SPACING.sm,
};

export const chipActiveStyle: ViewStyle = {
  ...chipStyle,
  backgroundColor: COLORS.primary,
  borderColor: COLORS.primary,
};

export const chipTextStyle: TextStyle = {
  color: COLORS.textPrimary,
  fontSize: FONT_SIZES.sm,
  fontWeight: '800',
  textTransform: 'uppercase',
  letterSpacing: 1,
};

export const chipActiveTextStyle: TextStyle = {
  ...chipTextStyle,
  color: COLORS.textDark,
};

/** Error text */
export const errorTextStyle: TextStyle = {
  color: COLORS.danger,
  fontSize: FONT_SIZES.md,
  fontWeight: '800',
  textTransform: 'uppercase',
  marginTop: SPACING.sm,
};

/** Common stylesheet fragments */
export const commonStyles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  separator: {
    height: 2,
    backgroundColor: COLORS.borderMuted,
    marginVertical: SPACING.md,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
});
