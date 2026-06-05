/**
 * Kollege Katta — Dashboard Feed Screen
 *
 * Primary campus channel with 3-tab segmented control:
 * - Rants
 * - Ideas
 * - Gossips
 *
 * Fetches posts filtered by user's college_id.
 * Includes post creation modal.
 */

import React, { useEffect, useState, useCallback } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase, Post, STORAGE_KEYS } from '../config/supabaseClient';
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type PostCategory = 'rants' | 'ideas' | 'gossips';

const CATEGORIES: { key: PostCategory; label: string; emoji: string; color: string }[] = [
  { key: 'rants', label: 'RANTS', emoji: '🤬', color: COLORS.secondary },
  { key: 'ideas', label: 'IDEAS', emoji: '💡', color: COLORS.tertiary },
  { key: 'gossips', label: 'GOSSIPS', emoji: '👀', color: COLORS.info },
];

export default function DashboardFeed() {
  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeCategory, setActiveCategory] = useState<PostCategory>('rants');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string>('');
  const [kollegeId, setKollegeId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [kollegeName, setKollegeName] = useState<string>('');

  // Compose modal state
  const [isComposeVisible, setIsComposeVisible] = useState<boolean>(false);
  const [composeContent, setComposeContent] = useState<string>('');
  const [composeCategory, setComposeCategory] = useState<PostCategory>('rants');
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [composeError, setComposeError] = useState<string>('');

  // -----------------------------------------------------------------------
  // Load session & initial data
  // -----------------------------------------------------------------------
  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (kollegeId) {
      fetchPosts();
    }
  }, [kollegeId, activeCategory]);

  const loadSession = useCallback(async (): Promise<void> => {
    try {
      const [storedKollegeId, storedUserId, storedKollegeName] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.KOLLEGE_ID),
        AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
        AsyncStorage.getItem(STORAGE_KEYS.KOLLEGE_NAME),
      ]);

      if (storedKollegeId) setKollegeId(Number(storedKollegeId));
      if (storedUserId) setUserId(storedUserId);
      if (storedKollegeName) setKollegeName(storedKollegeName);
    } catch (err) {
      console.error('[DashboardFeed] Session load error:', err);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Fetch Posts
  // -----------------------------------------------------------------------
  const fetchPosts = useCallback(async (): Promise<void> => {
    if (!kollegeId) return;

    setFetchError('');
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, users(alias_name)')
        .eq('kollege_id', kollegeId)
        .eq('category', activeCategory)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(error.message);
      }

      setPosts((data as Post[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load posts';
      setFetchError(message);
      console.error('[DashboardFeed] Fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [kollegeId, activeCategory]);

  const handleRefresh = useCallback((): void => {
    setIsRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  // -----------------------------------------------------------------------
  // Create Post
  // -----------------------------------------------------------------------
  const handleCreatePost = useCallback(async (): Promise<void> => {
    const trimmed = composeContent.trim();
    if (!trimmed) {
      setComposeError('POST CONTENT CANNOT BE EMPTY');
      return;
    }

    if (trimmed.length > 1000) {
      setComposeError('MAX 1000 CHARACTERS ALLOWED');
      return;
    }

    setIsPosting(true);
    setComposeError('');

    try {
      const { error } = await supabase.from('posts').insert([
        {
          user_id: userId,
          kollege_id: kollegeId,
          content: trimmed,
          category: composeCategory,
        },
      ]);

      if (error) {
        throw new Error(error.message);
      }

      // Reset compose state and refresh
      setComposeContent('');
      setIsComposeVisible(false);

      // If current tab matches the posted category, refresh
      if (composeCategory === activeCategory) {
        fetchPosts();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create post';
      setComposeError(message);
      console.error('[DashboardFeed] Post creation error:', err);
    } finally {
      setIsPosting(false);
    }
  }, [composeContent, composeCategory, userId, kollegeId, activeCategory, fetchPosts]);

  // -----------------------------------------------------------------------
  // Get active category config
  // -----------------------------------------------------------------------
  const activeCategoryConfig = CATEGORIES.find((c) => c.key === activeCategory)!;

  // -----------------------------------------------------------------------
  // Render Post Item
  // -----------------------------------------------------------------------
  const renderPost = useCallback(
    ({ item }: { item: Post }) => {
      const categoryConfig = CATEGORIES.find((c) => c.key === item.category);
      const timeAgo = getTimeAgo(item.created_at);

      return (
        <View style={[cardStyle, styles.postCard]}>
          <View style={[commonStyles.row, { justifyContent: 'space-between' }]}>
            <Text style={[styles.postAlias, { color: categoryConfig?.color ?? COLORS.primary }]}>
              @{item.users?.alias_name ?? 'Anonymous'}
            </Text>
            <Text style={styles.postTime}>{timeAgo}</Text>
          </View>
          <Text style={styles.postContent}>{item.content}</Text>
          <View style={[styles.categoryBadge, { borderColor: categoryConfig?.color ?? COLORS.primary }]}>
            <Text style={[styles.categoryBadgeText, { color: categoryConfig?.color ?? COLORS.primary }]}>
              {categoryConfig?.emoji} {item.category.toUpperCase()}
            </Text>
          </View>
        </View>
      );
    },
    []
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <View style={screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={headingStyle}>📢 FEED</Text>
        <Text style={styles.collegeBadge}>{kollegeName}</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.tab,
                isActive && { backgroundColor: cat.color, borderColor: cat.color },
              ]}
              onPress={() => {
                setActiveCategory(cat.key);
                setIsLoading(true);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive && { color: COLORS.textDark },
                ]}
              >
                {cat.emoji} {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={[commonStyles.flex1, commonStyles.center]}>
          <ActivityIndicator size="large" color={activeCategoryConfig.color} />
          <Text style={styles.loadingText}>LOADING {activeCategoryConfig.label}...</Text>
        </View>
      ) : fetchError ? (
        <View style={[commonStyles.flex1, commonStyles.center]}>
          <Text style={errorTextStyle}>{fetchError}</Text>
          <TouchableOpacity
            style={[buttonStyle, { marginTop: SPACING.md, backgroundColor: COLORS.secondary }]}
            onPress={fetchPosts}
            activeOpacity={0.7}
          >
            <Text style={buttonTextStyle}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={activeCategoryConfig.color}
              colors={[activeCategoryConfig.color]}
            />
          }
          ListEmptyComponent={
            <View style={[commonStyles.center, { paddingVertical: SPACING.xxl * 2 }]}>
              <Text style={styles.emptyEmoji}>{activeCategoryConfig.emoji}</Text>
              <Text style={styles.emptyText}>NO {activeCategoryConfig.label} YET</Text>
              <Text style={styles.emptySubText}>BE THE FIRST TO POST</Text>
            </View>
          }
        />
      )}

      {/* Compose FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setComposeCategory(activeCategory);
          setIsComposeVisible(true);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Compose Modal */}
      <Modal
        visible={isComposeVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsComposeVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={[commonStyles.row, { justifyContent: 'space-between', marginBottom: SPACING.md }]}>
              <Text style={[headingStyle, { fontSize: FONT_SIZES.xl }]}>NEW POST</Text>
              <TouchableOpacity onPress={() => setIsComposeVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Category selector for compose */}
            <View style={[commonStyles.rowWrap, { marginBottom: SPACING.md }]}>
              {CATEGORIES.map((cat) => {
                const isSelected = composeCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.composeCategoryChip,
                      isSelected && { backgroundColor: cat.color, borderColor: cat.color },
                    ]}
                    onPress={() => setComposeCategory(cat.key)}
                    disabled={isPosting}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.composeCategoryText,
                        isSelected && { color: COLORS.textDark },
                      ]}
                    >
                      {cat.emoji} {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[inputStyle, styles.composeInput]}
              placeholder="WHAT'S ON YOUR MIND?"
              placeholderTextColor={COLORS.textMuted}
              value={composeContent}
              onChangeText={(text) => {
                setComposeContent(text);
                setComposeError('');
              }}
              multiline
              maxLength={1000}
              editable={!isPosting}
              textAlignVertical="top"
            />

            <Text style={styles.charCount}>
              {composeContent.length}/1000
            </Text>

            {composeError ? (
              <Text style={[errorTextStyle, { marginBottom: SPACING.sm }]}>{composeError}</Text>
            ) : null}

            <TouchableOpacity
              style={isPosting ? buttonDisabledStyle : [buttonStyle, { backgroundColor: activeCategoryConfig.color }]}
              onPress={handleCreatePost}
              disabled={isPosting}
              activeOpacity={0.7}
            >
              {isPosting ? (
                <View style={commonStyles.row}>
                  <ActivityIndicator size="small" color={COLORS.textDark} />
                  <Text style={[buttonTextStyle, { marginLeft: SPACING.sm }]}>POSTING...</Text>
                </View>
              ) : (
                <Text style={buttonTextStyle}>POST IT</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function getTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'JUST NOW';
  if (diffMin < 60) return `${diffMin}M AGO`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}H AGO`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}D AGO`;
  return `${Math.floor(diffDay / 7)}W AGO`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingTop: SPACING.lg,
  },
  collegeBadge: {
    color: COLORS.textDark,
    backgroundColor: COLORS.primary,
    fontSize: FONT_SIZES.xs,
    fontWeight: '900',
    letterSpacing: 1,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    borderWidth: BORDER.width,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  tabText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xs,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingBottom: 100,
  },
  postCard: {
    marginBottom: SPACING.md,
  },
  postAlias: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  postTime: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  postContent: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
  },
  categoryBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '900',
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
    backgroundColor: COLORS.primary,
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
    color: COLORS.textDark,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 34,
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
  composeCategoryChip: {
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  composeCategoryText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xs,
    fontWeight: '900',
    letterSpacing: 1,
  },
  composeInput: {
    height: 140,
    textAlignVertical: 'top',
    marginBottom: SPACING.xs,
  },
  charCount: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: SPACING.md,
  },
});
