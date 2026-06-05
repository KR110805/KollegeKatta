/**
 * Kollege Katta — Hotlist / Crush Meter Screen
 *
 * Displays crush meter profiles in a grid layout ordered by likes.
 * Implements optimistic UI update on tap with rollback on failure.
 * Uses Supabase RPC `increment_likes` for atomic counter updates.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase, HotlistProfile, STORAGE_KEYS } from '../config/supabaseClient';
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
  cardStyle,
  errorTextStyle,
  commonStyles,
} from '../styles/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = SPACING.md;
const GRID_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - SPACING.md * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

export default function HotlistScreen() {
  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  const [profiles, setProfiles] = useState<HotlistProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string>('');
  const [kollegeId, setKollegeId] = useState<number | null>(null);

  // Add crush modal state
  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
  const [newInstaId, setNewInstaId] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addError, setAddError] = useState<string>('');

  // Track in-flight taps to prevent double-tap
  const inFlightTaps = useRef<Set<number>>(new Set());

  // -----------------------------------------------------------------------
  // Load session & data
  // -----------------------------------------------------------------------
  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (kollegeId) {
      fetchProfiles();
    }
  }, [kollegeId]);

  const loadSession = useCallback(async (): Promise<void> => {
    try {
      const storedKollegeId = await AsyncStorage.getItem(STORAGE_KEYS.KOLLEGE_ID);
      if (storedKollegeId) setKollegeId(Number(storedKollegeId));
    } catch (err) {
      console.error('[HotlistScreen] Session load error:', err);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Fetch Profiles
  // -----------------------------------------------------------------------
  const fetchProfiles = useCallback(async (): Promise<void> => {
    if (!kollegeId) return;

    setFetchError('');
    try {
      const { data, error } = await supabase
        .from('crush_meter')
        .select('*')
        .eq('kollege_id', kollegeId)
        .order('anonymous_likes_count', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setProfiles((data as HotlistProfile[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load hotlist';
      setFetchError(message);
      console.error('[HotlistScreen] Fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [kollegeId]);

  const handleRefresh = useCallback((): void => {
    setIsRefreshing(true);
    fetchProfiles();
  }, [fetchProfiles]);

  // -----------------------------------------------------------------------
  // Optimistic Like Handler with Rollback
  // -----------------------------------------------------------------------
  const handleLike = useCallback(async (targetProfileId: number): Promise<void> => {
    // Guard against concurrent taps on the same profile
    if (inFlightTaps.current.has(targetProfileId)) return;
    inFlightTaps.current.add(targetProfileId);

    // Step 1: Find the current profile and save the previous count
    const profileIndex = profiles.findIndex((p) => p.id === targetProfileId);
    if (profileIndex === -1) {
      inFlightTaps.current.delete(targetProfileId);
      return;
    }

    const previousCount = profiles[profileIndex].anonymous_likes_count;
    const newCount = previousCount + 1;

    // Step 2: Optimistic UI update — instant +1
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === targetProfileId
          ? { ...p, anonymous_likes_count: newCount }
          : p
      )
    );

    // Step 3: Fire the real database mutation
    try {
      const { error: rpcError } = await supabase.rpc('increment_likes', {
        row_id: targetProfileId,
      });

      if (rpcError) {
        // Fallback: try direct update if RPC is not available
        const { error: updateError } = await supabase
          .from('crush_meter')
          .update({ anonymous_likes_count: newCount })
          .eq('id', targetProfileId);

        if (updateError) {
          throw new Error(updateError.message);
        }
      }
    } catch (err: unknown) {
      // Step 4: ROLLBACK — revert the optimistic update
      console.error('[HotlistScreen] Like failed, rolling back:', err);
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === targetProfileId
            ? { ...p, anonymous_likes_count: previousCount }
            : p
        )
      );
    } finally {
      inFlightTaps.current.delete(targetProfileId);
    }
  }, [profiles]);

  // -----------------------------------------------------------------------
  // Add New Crush
  // -----------------------------------------------------------------------
  const handleAddCrush = useCallback(async (): Promise<void> => {
    const trimmedId = newInstaId.trim().replace(/^@/, '');
    if (!trimmedId) {
      setAddError('ENTER AN INSTAGRAM HANDLE');
      return;
    }

    setIsAdding(true);
    setAddError('');

    try {
      const { data, error } = await supabase
        .from('crush_meter')
        .insert([
          {
            kollege_id: kollegeId,
            target_insta_id: trimmedId,
            anonymous_likes_count: 1,
          },
        ])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Duplicate — profile already exists, just like it
          setAddError('ALREADY ON THE HOTLIST — GO LIKE THEM!');
          return;
        }
        throw new Error(error.message);
      }

      if (data) {
        setProfiles((prev) => [data as HotlistProfile, ...prev]);
      }

      setNewInstaId('');
      setIsAddModalVisible(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add crush';
      setAddError(message);
      console.error('[HotlistScreen] Add crush error:', err);
    } finally {
      setIsAdding(false);
    }
  }, [newInstaId, kollegeId]);

  // -----------------------------------------------------------------------
  // Render Grid Item
  // -----------------------------------------------------------------------
  const renderProfile = useCallback(
    ({ item, index }: { item: HotlistProfile; index: number }) => {
      const isTop3 = index < 3;
      const rankEmoji = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔥';
      const borderColor = index === 0 ? COLORS.tertiary : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : COLORS.border;

      return (
        <TouchableOpacity
          style={[styles.profileCard, { borderColor, width: CARD_WIDTH }]}
          onPress={() => handleLike(item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.rankEmoji}>{rankEmoji}</Text>
          <Text style={styles.rankNumber}>#{index + 1}</Text>
          <Text style={styles.instaHandle} numberOfLines={1}>
            @{item.target_insta_id}
          </Text>
          <View style={styles.likesContainer}>
            <Text style={[styles.likesCount, isTop3 && { color: COLORS.secondary }]}>
              {item.anonymous_likes_count}
            </Text>
            <Text style={styles.likesLabel}>LIKES</Text>
          </View>
          <Text style={styles.tapHint}>TAP TO ❤️</Text>
        </TouchableOpacity>
      );
    },
    [handleLike]
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <View style={screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={headingStyle}>🔥 HOTLIST</Text>
        <Text style={styles.subtitle}>ANONYMOUS CRUSH METER</Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={[commonStyles.flex1, commonStyles.center]}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
          <Text style={styles.loadingText}>LOADING HOTLIST...</Text>
        </View>
      ) : fetchError ? (
        <View style={[commonStyles.flex1, commonStyles.center]}>
          <Text style={errorTextStyle}>{fetchError}</Text>
          <TouchableOpacity
            style={[buttonStyle, { marginTop: SPACING.md, backgroundColor: COLORS.secondary }]}
            onPress={fetchProfiles}
            activeOpacity={0.7}
          >
            <Text style={buttonTextStyle}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={profiles}
          renderItem={renderProfile}
          keyExtractor={(item) => String(item.id)}
          numColumns={GRID_COLUMNS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.secondary}
              colors={[COLORS.secondary]}
            />
          }
          ListEmptyComponent={
            <View style={[commonStyles.center, { paddingVertical: SPACING.xxl * 2 }]}>
              <Text style={styles.emptyEmoji}>💘</Text>
              <Text style={styles.emptyText}>NO CRUSHES YET</Text>
              <Text style={styles.emptySubText}>ADD SOMEONE TO THE HOTLIST</Text>
            </View>
          }
        />
      )}

      {/* Add Crush FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsAddModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.fabText}>💘</Text>
      </TouchableOpacity>

      {/* Add Crush Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[commonStyles.row, { justifyContent: 'space-between', marginBottom: SPACING.md }]}>
              <Text style={[headingStyle, { fontSize: FONT_SIZES.xl }]}>ADD CRUSH</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>INSTAGRAM HANDLE</Text>
            <TextInput
              style={inputStyle}
              placeholder="@their_handle"
              placeholderTextColor={COLORS.textMuted}
              value={newInstaId}
              onChangeText={(text) => {
                setNewInstaId(text);
                setAddError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isAdding}
              maxLength={30}
            />

            {addError ? (
              <Text style={[errorTextStyle, { marginTop: SPACING.sm }]}>{addError}</Text>
            ) : null}

            <TouchableOpacity
              style={isAdding ? [buttonDisabledStyle, { marginTop: SPACING.lg }] : [buttonStyle, { marginTop: SPACING.lg, backgroundColor: COLORS.secondary }]}
              onPress={handleAddCrush}
              disabled={isAdding}
              activeOpacity={0.7}
            >
              {isAdding ? (
                <View style={commonStyles.row}>
                  <ActivityIndicator size="small" color={COLORS.textPrimary} />
                  <Text style={[buttonTextStyle, { color: COLORS.textPrimary, marginLeft: SPACING.sm }]}>
                    ADDING...
                  </Text>
                </View>
              ) : (
                <Text style={[buttonTextStyle, { color: COLORS.textPrimary }]}>
                  ADD TO HOTLIST 🔥
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  header: {
    paddingTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: SPACING.xs,
    textTransform: 'uppercase',
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: GRID_GAP,
  },
  listContent: {
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderWidth: BORDER.width,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: COLORS.border,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  rankEmoji: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  rankNumber: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '900',
    letterSpacing: 2,
  },
  instaHandle: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: SPACING.sm,
    textTransform: 'lowercase',
  },
  likesContainer: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  likesCount: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
  },
  likesLabel: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '800',
    letterSpacing: 2,
  },
  tapHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    marginTop: SPACING.sm,
    letterSpacing: 1,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: SPACING.md,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
    letterSpacing: 2,
  },
  emptySubText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: SPACING.xs,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    width: 60,
    height: 60,
    backgroundColor: COLORS.secondary,
    borderWidth: BORDER.width,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.border,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
  },
  fabText: {
    fontSize: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopWidth: BORDER.width,
    borderLeftWidth: BORDER.width,
    borderRightWidth: BORDER.width,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  closeButton: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
  },
  modalLabel: {
    color: COLORS.tertiary,
    fontSize: FONT_SIZES.md,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
});
