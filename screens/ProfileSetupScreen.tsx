/**
 * Kollege Katta — Profile Setup Screen (Stealth Onboarding)
 *
 * Onboarding Phase 2:
 * 1. Alias Name input with random dice-roll generator
 * 2. College Year chip selector (FE/SE/TE/BE/PG)
 * 3. Relationship Status chip selector
 * 4. Submit → Insert user into Supabase → Persist to AsyncStorage → Navigate to Dashboard
 */

import React, { useState, useCallback } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import { useAuth } from '../config/AuthContext';
import { supabase } from '../config/supabaseClient';
import { AuthStackParamList } from '../navigation/AppNavigator';
import {
  COLORS,
  SPACING,
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RANDOM_ALIASES: string[] = [
  'Backbench_Elon',
  'Crying_Before_Viva',
  'Chai_Pe_Charcha_King',
  'Sessional_Survivor',
  'Proxy_Champion',
  'Canteen_CEO',
  'Last_Bench_Legend',
  'Bunk_Minister',
  'CGPA_Warrior',
  'Redbull_Rager',
  'Xerox_Ka_Raja',
  'WiFi_Thief_Pro',
  'Attendance_Dodger',
  'Maggi_Connoisseur',
  'Placement_Dreamer',
];

const COLLEGE_YEARS = ['FE', 'SE', 'TE', 'BE', 'PG'] as const;
const RELATIONSHIP_STATUSES = ['Single', 'Taken', 'Complicated', 'Focused'] as const;

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ProfileSetup'>;
type RouteType = RouteProp<AuthStackParamList, 'ProfileSetup'>;

export default function ProfileSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { kollegeId, kollegeName } = route.params;
  const { login } = useAuth();

  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  const [aliasName, setAliasName] = useState<string>('');
  const [kollegeYear, setKollegeYear] = useState<string>('');
  const [relationshipStatus, setRelationshipStatus] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // -----------------------------------------------------------------------
  // Alias Rolling Engine (Dice Tap)
  // -----------------------------------------------------------------------
  const rollRandomAlias = useCallback((): void => {
    const randomIndex = Math.floor(Math.random() * RANDOM_ALIASES.length);
    setAliasName(RANDOM_ALIASES[randomIndex]);
    setErrorMessage('');
  }, []);

  // -----------------------------------------------------------------------
  // Form Validation
  // -----------------------------------------------------------------------
  const isFormValid = (): boolean => {
    return aliasName.trim().length > 0 && kollegeYear.length > 0 && relationshipStatus.length > 0;
  };

  // -----------------------------------------------------------------------
  // Submit Profile
  // -----------------------------------------------------------------------
  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!isFormValid()) {
      setErrorMessage('FILL ALL FIELDS TO ENTER THE KATTA');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            kollege_id: kollegeId,
            alias_name: aliasName.trim(),
            kollege_year: kollegeYear,
            relationship_status: relationshipStatus,
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error('User creation returned no data');
      }

      // Persist session data & reactively route to MainTabs automatically
      await login(kollegeId, data.id, data.alias_name, kollegeName);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Profile creation failed';
      setErrorMessage(message);
      console.error('[ProfileSetupScreen] Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [aliasName, kollegeYear, relationshipStatus, kollegeId, kollegeName, login]);

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
          <Text style={headingStyle}>BUILD YOUR IDENTITY</Text>
          <Text style={subHeadingStyle}>{kollegeName}</Text>
        </View>

        {/* Alias Name */}
        <View style={[cardStyle, styles.section]}>
          <Text style={styles.sectionTitle}>YOUR ALIAS</Text>
          <View style={commonStyles.row}>
            <TextInput
              style={[inputStyle, commonStyles.flex1]}
              placeholder="ENTER ALIAS NAME"
              placeholderTextColor={COLORS.textMuted}
              value={aliasName}
              onChangeText={(text) => {
                setAliasName(text);
                setErrorMessage('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
              maxLength={30}
            />
            <TouchableOpacity
              style={styles.diceButton}
              onPress={rollRandomAlias}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.diceText}>🎲</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hintText}>
            TAP THE DICE FOR A RANDOM ALIAS
          </Text>
        </View>

        {/* College Year */}
        <View style={[cardStyle, styles.section]}>
          <Text style={styles.sectionTitle}>COLLEGE YEAR</Text>
          <View style={commonStyles.rowWrap}>
            {COLLEGE_YEARS.map((year) => {
              const isSelected = kollegeYear === year;
              return (
                <TouchableOpacity
                  key={year}
                  style={isSelected ? chipActiveStyle : chipStyle}
                  onPress={() => {
                    setKollegeYear(year);
                    setErrorMessage('');
                  }}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={isSelected ? chipActiveTextStyle : chipTextStyle}>
                    {year}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Relationship Status */}
        <View style={[cardStyle, styles.section]}>
          <Text style={styles.sectionTitle}>RELATIONSHIP STATUS</Text>
          <View style={commonStyles.rowWrap}>
            {RELATIONSHIP_STATUSES.map((status) => {
              const isSelected = relationshipStatus === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={isSelected ? [chipActiveStyle, { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary }] : chipStyle}
                  onPress={() => {
                    setRelationshipStatus(status);
                    setErrorMessage('');
                  }}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={isSelected ? chipActiveTextStyle : chipTextStyle}>
                    {status}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Error Message */}
        {errorMessage ? (
          <Text style={[errorTextStyle, { textAlign: 'center', marginBottom: SPACING.md }]}>
            {errorMessage}
          </Text>
        ) : null}

        {/* Submit Button */}
        <TouchableOpacity
          style={isSubmitting || !isFormValid() ? buttonDisabledStyle : [buttonStyle, { backgroundColor: COLORS.secondary }]}
          onPress={handleSubmit}
          disabled={isSubmitting || !isFormValid()}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <View style={commonStyles.row}>
              <ActivityIndicator size="small" color={COLORS.textPrimary} />
              <Text style={[buttonTextStyle, { color: COLORS.textPrimary, marginLeft: SPACING.sm }]}>
                CREATING IDENTITY...
              </Text>
            </View>
          ) : (
            <Text style={[buttonTextStyle, { color: COLORS.textPrimary }]}>
              ENTER THE KATTA
            </Text>
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
  diceButton: {
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.tertiary,
    borderWidth: 3,
    borderColor: COLORS.border,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.border,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  diceText: {
    fontSize: 24,
  },
  hintText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: SPACING.xs,
    textTransform: 'uppercase',
  },
});
