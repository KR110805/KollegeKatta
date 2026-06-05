/**
 * Kollege Katta — College Selection & Katta Pass Validation Screen
 *
 * Onboarding Phase 1:
 * 1. Fetch colleges from Supabase on mount
 * 2. User selects college from dropdown
 * 3. User enters Katta Pass for validation
 * 4. On success → navigate to ProfileSetupScreen
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { supabase, College } from '../config/supabaseClient';
import { AuthStackParamList } from '../navigation/AppNavigator';
import {
  COLORS,
  SPACING,
  BORDER,
  FONT_SIZES,
  screenContainer,
  inputStyle,
  buttonStyle,
  buttonTextStyle,
  buttonDisabledStyle,
  headingStyle,
  subHeadingStyle,
  cardStyle,
  chipStyle,
  chipActiveStyle,
  chipTextStyle,
  chipActiveTextStyle,
  errorTextStyle,
  commonStyles,
} from '../styles/theme';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'CollegeSelect'>;

export default function CollegeSelectScreen() {
  const navigation = useNavigation<NavigationProp>();

  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [passKey, setPassKey] = useState<string>('');
  const [isLoadingColleges, setIsLoadingColleges] = useState<boolean>(true);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fetchError, setFetchError] = useState<string>('');

  // -----------------------------------------------------------------------
  // Fetch Colleges on Mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = useCallback(async (): Promise<void> => {
    setIsLoadingColleges(true);
    setFetchError('');
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        setFetchError('No colleges found. Contact admin.');
        return;
      }

      setColleges(data as College[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load colleges';
      setFetchError(message);
      console.error('[CollegeSelectScreen] Fetch colleges error:', err);
    } finally {
      setIsLoadingColleges(false);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Validate Katta Pass
  // -----------------------------------------------------------------------
  const handleValidatePass = useCallback(async (): Promise<void> => {
    if (!selectedCollege) {
      setErrorMessage('SELECT YOUR COLLEGE FIRST');
      return;
    }

    const trimmedKey = passKey.trim();
    if (!trimmedKey) {
      setErrorMessage('ENTER YOUR KATTA PASS');
      return;
    }

    setIsValidating(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('katta_passes')
        .select('*')
        .eq('pass_key', trimmedKey)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setErrorMessage('Invalid or Expired Katta Pass');
        return;
      }

      // Verify the pass belongs to the selected college
      if (data.kollege_id !== selectedCollege.id) {
        setErrorMessage('This pass does not belong to your selected college');
        return;
      }

      // Success → Navigate to ProfileSetup
      navigation.navigate('ProfileSetup', {
        kollegeId: selectedCollege.id,
        kollegeName: selectedCollege.name,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Validation failed';
      setErrorMessage(message);
      console.error('[CollegeSelectScreen] Pass validation error:', err);
    } finally {
      setIsValidating(false);
    }
  }, [selectedCollege, passKey, navigation]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <View style={screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>{'{ KK }'}</Text>
          <Text style={headingStyle}>KOLLEGE KATTA</Text>
          <Text style={subHeadingStyle}>YOUR ANONYMOUS CAMPUS ZONE</Text>
        </View>

        {/* College Selection */}
        <View style={[cardStyle, styles.section]}>
          <Text style={styles.sectionTitle}>SELECT YOUR COLLEGE</Text>

          {isLoadingColleges ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loaderText}>LOADING COLLEGES...</Text>
            </View>
          ) : fetchError ? (
            <View>
              <Text style={errorTextStyle}>{fetchError}</Text>
              <TouchableOpacity
                style={[buttonStyle, styles.retryButton]}
                onPress={fetchColleges}
                activeOpacity={0.7}
              >
                <Text style={buttonTextStyle}>RETRY</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={commonStyles.rowWrap}>
              {colleges.map((college) => {
                const isSelected = selectedCollege?.id === college.id;
                return (
                  <TouchableOpacity
                    key={college.id}
                    style={isSelected ? chipActiveStyle : chipStyle}
                    onPress={() => {
                      setSelectedCollege(college);
                      setErrorMessage('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={isSelected ? chipActiveTextStyle : chipTextStyle}>
                      {college.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Katta Pass Input */}
        <View style={[cardStyle, styles.section]}>
          <Text style={styles.sectionTitle}>ENTER KATTA PASS</Text>
          <TextInput
            style={inputStyle}
            placeholder="YOUR SECRET PASS KEY"
            placeholderTextColor={COLORS.textMuted}
            value={passKey}
            onChangeText={(text) => {
              setPassKey(text);
              setErrorMessage('');
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isValidating}
          />

          {errorMessage ? (
            <Text style={errorTextStyle}>{errorMessage}</Text>
          ) : null}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={isValidating || !selectedCollege ? buttonDisabledStyle : buttonStyle}
          onPress={handleValidatePass}
          disabled={isValidating || !selectedCollege}
          activeOpacity={0.7}
        >
          {isValidating ? (
            <View style={commonStyles.row}>
              <ActivityIndicator size="small" color={COLORS.textDark} />
              <Text style={[buttonTextStyle, { marginLeft: SPACING.sm }]}>
                VALIDATING...
              </Text>
            </View>
          ) : (
            <Text style={buttonTextStyle}>UNLOCK THE KATTA</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: SPACING.xxl,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoText: {
    color: COLORS.primary,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: SPACING.sm,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.tertiary,
    fontSize: FONT_SIZES.md,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
  },
  loaderBox: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  loaderText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
    marginTop: SPACING.sm,
    letterSpacing: 2,
  },
  retryButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.secondary,
  },
});
