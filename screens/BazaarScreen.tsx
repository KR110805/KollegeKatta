/**
 * Kollege Katta — Bazaar Marketplace Screen
 *
 * Peer-to-Peer Campus Marketplace:
 * - Relational fetch with user alias join
 * - Item cards with seller info
 * - "PING SELLER" deep link handler
 * - Add listing modal
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
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase, BazaarListing, STORAGE_KEYS } from '../config/supabaseClient';
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

export default function BazaarScreen() {
  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------
  const [listings, setListings] = useState<BazaarListing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string>('');
  const [kollegeId, setKollegeId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string>('');

  // Add listing modal state
  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [newContactLink, setNewContactLink] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addError, setAddError] = useState<string>('');

  // -----------------------------------------------------------------------
  // Load session & data
  // -----------------------------------------------------------------------
  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (kollegeId) {
      fetchListings();
    }
  }, [kollegeId]);

  const loadSession = useCallback(async (): Promise<void> => {
    try {
      const [storedKollegeId, storedUserId] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.KOLLEGE_ID),
        AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
      ]);

      if (storedKollegeId) setKollegeId(Number(storedKollegeId));
      if (storedUserId) setUserId(storedUserId);
    } catch (err) {
      console.error('[BazaarScreen] Session load error:', err);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Fetch Listings (Relational Join)
  // -----------------------------------------------------------------------
  const fetchListings = useCallback(async (): Promise<void> => {
    if (!kollegeId) return;

    setFetchError('');
    try {
      const { data, error } = await supabase
        .from('bazaar_listings')
        .select('*, users(alias_name)')
        .eq('kollege_id', kollegeId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setListings((data as BazaarListing[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load bazaar';
      setFetchError(message);
      console.error('[BazaarScreen] Fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [kollegeId]);

  const handleRefresh = useCallback((): void => {
    setIsRefreshing(true);
    fetchListings();
  }, [fetchListings]);

  // -----------------------------------------------------------------------
  // Ping Seller (Deep Link)
  // -----------------------------------------------------------------------
  const handlePingSeller = useCallback(async (contactLink: string): Promise<void> => {
    try {
      const canOpen = await Linking.canOpenURL(contactLink);
      if (!canOpen) {
        Alert.alert(
          'EXECUTION FAILURE',
          'Unable to establish communication route link. The URL may be invalid.'
        );
        return;
      }
      await Linking.openURL(contactLink);
    } catch (err: unknown) {
      console.error('[BazaarScreen] Ping seller error:', err);
      Alert.alert(
        'EXECUTION FAILURE',
        'Unable to establish communication route link.'
      );
    }
  }, []);

  // -----------------------------------------------------------------------
  // Add New Listing
  // -----------------------------------------------------------------------
  const handleAddListing = useCallback(async (): Promise<void> => {
    const trimmedTitle = newTitle.trim();
    const trimmedPrice = newPrice.trim();
    const trimmedLink = newContactLink.trim();

    if (!trimmedTitle) {
      setAddError('ITEM TITLE IS REQUIRED');
      return;
    }
    if (!trimmedPrice) {
      setAddError('PRICE IS REQUIRED');
      return;
    }
    if (!trimmedLink) {
      setAddError('CONTACT LINK IS REQUIRED');
      return;
    }

    // Basic URL validation
    if (!trimmedLink.startsWith('http://') && !trimmedLink.startsWith('https://')) {
      setAddError('CONTACT LINK MUST START WITH HTTP:// OR HTTPS://');
      return;
    }

    setIsAdding(true);
    setAddError('');

    try {
      const { data, error } = await supabase
        .from('bazaar_listings')
        .insert([
          {
            user_id: userId,
            kollege_id: kollegeId,
            item_title: trimmedTitle,
            price: trimmedPrice,
            contact_link: trimmedLink,
          },
        ])
        .select('*, users(alias_name)')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        setListings((prev) => [data as BazaarListing, ...prev]);
      }

      // Reset modal
      setNewTitle('');
      setNewPrice('');
      setNewContactLink('');
      setIsAddModalVisible(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create listing';
      setAddError(message);
      console.error('[BazaarScreen] Add listing error:', err);
    } finally {
      setIsAdding(false);
    }
  }, [newTitle, newPrice, newContactLink, userId, kollegeId]);

  // -----------------------------------------------------------------------
  // Render Listing Item
  // -----------------------------------------------------------------------
  const renderListing = useCallback(
    ({ item }: { item: BazaarListing }) => {
      const timeAgo = getTimeAgo(item.created_at);

      return (
        <View style={[cardStyle, styles.listingCard]}>
          {/* Header Row */}
          <View style={[commonStyles.row, { justifyContent: 'space-between' }]}>
            <Text style={styles.sellerAlias}>
              @{item.users?.alias_name ?? 'Anonymous'}
            </Text>
            <Text style={styles.listingTime}>{timeAgo}</Text>
          </View>

          {/* Item Details */}
          <Text style={styles.itemTitle}>{item.item_title}</Text>

          {/* Price Badge */}
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>₹{item.price}</Text>
          </View>

          {/* Ping Seller Button */}
          <TouchableOpacity
            style={styles.pingButton}
            onPress={() => handlePingSeller(item.contact_link)}
            activeOpacity={0.7}
          >
            <Text style={styles.pingButtonText}>📨 PING SELLER</Text>
          </TouchableOpacity>
        </View>
      );
    },
    [handlePingSeller]
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <View style={screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={headingStyle}>🛒 BAZAAR</Text>
        <Text style={styles.subtitle}>CAMPUS MARKETPLACE</Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={[commonStyles.flex1, commonStyles.center]}>
          <ActivityIndicator size="large" color={COLORS.tertiary} />
          <Text style={styles.loadingText}>LOADING BAZAAR...</Text>
        </View>
      ) : fetchError ? (
        <View style={[commonStyles.flex1, commonStyles.center]}>
          <Text style={errorTextStyle}>{fetchError}</Text>
          <TouchableOpacity
            style={[buttonStyle, { marginTop: SPACING.md, backgroundColor: COLORS.secondary }]}
            onPress={fetchListings}
            activeOpacity={0.7}
          >
            <Text style={buttonTextStyle}>RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          renderItem={renderListing}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.tertiary}
              colors={[COLORS.tertiary]}
            />
          }
          ListEmptyComponent={
            <View style={[commonStyles.center, { paddingVertical: SPACING.xxl * 2 }]}>
              <Text style={styles.emptyEmoji}>🏪</Text>
              <Text style={styles.emptyText}>BAZAAR IS EMPTY</Text>
              <Text style={styles.emptySubText}>LIST SOMETHING FOR SALE</Text>
            </View>
          }
        />
      )}

      {/* Add Listing FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsAddModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Listing Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={[commonStyles.row, { justifyContent: 'space-between', marginBottom: SPACING.md }]}>
              <Text style={[headingStyle, { fontSize: FONT_SIZES.xl }]}>NEW LISTING</Text>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Item Title */}
            <Text style={styles.modalLabel}>ITEM TITLE</Text>
            <TextInput
              style={[inputStyle, styles.modalInput]}
              placeholder="WHAT ARE YOU SELLING?"
              placeholderTextColor={COLORS.textMuted}
              value={newTitle}
              onChangeText={(text) => {
                setNewTitle(text);
                setAddError('');
              }}
              editable={!isAdding}
              maxLength={200}
            />

            {/* Price */}
            <Text style={styles.modalLabel}>PRICE (₹)</Text>
            <TextInput
              style={[inputStyle, styles.modalInput]}
              placeholder="500"
              placeholderTextColor={COLORS.textMuted}
              value={newPrice}
              onChangeText={(text) => {
                setNewPrice(text);
                setAddError('');
              }}
              keyboardType="numeric"
              editable={!isAdding}
              maxLength={20}
            />

            {/* Contact Link */}
            <Text style={styles.modalLabel}>CONTACT LINK</Text>
            <TextInput
              style={[inputStyle, styles.modalInput]}
              placeholder="https://wa.me/91XXXXXXXXXX"
              placeholderTextColor={COLORS.textMuted}
              value={newContactLink}
              onChangeText={(text) => {
                setNewContactLink(text);
                setAddError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!isAdding}
            />

            {addError ? (
              <Text style={[errorTextStyle, { marginBottom: SPACING.sm }]}>{addError}</Text>
            ) : null}

            <TouchableOpacity
              style={isAdding ? [buttonDisabledStyle, { marginTop: SPACING.sm }] : [buttonStyle, { marginTop: SPACING.sm, backgroundColor: COLORS.tertiary }]}
              onPress={handleAddListing}
              disabled={isAdding}
              activeOpacity={0.7}
            >
              {isAdding ? (
                <View style={commonStyles.row}>
                  <ActivityIndicator size="small" color={COLORS.textDark} />
                  <Text style={[buttonTextStyle, { marginLeft: SPACING.sm }]}>LISTING...</Text>
                </View>
              ) : (
                <Text style={buttonTextStyle}>LIST ON BAZAAR 🛒</Text>
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
  listContent: {
    paddingBottom: 100,
  },
  listingCard: {
    marginBottom: SPACING.md,
  },
  sellerAlias: {
    color: COLORS.info,
    fontSize: FONT_SIZES.sm,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'lowercase',
  },
  listingTime: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  itemTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
    marginTop: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  priceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.tertiary,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  priceText: {
    color: COLORS.textDark,
    fontSize: FONT_SIZES.lg,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pingButton: {
    backgroundColor: COLORS.primary,
    borderWidth: BORDER.width,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    marginTop: SPACING.md,
    shadowColor: COLORS.border,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  pingButtonText: {
    color: COLORS.textDark,
    fontSize: FONT_SIZES.md,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
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
    backgroundColor: COLORS.tertiary,
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
  modalLabel: {
    color: COLORS.tertiary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
    textTransform: 'uppercase',
  },
  modalInput: {
    marginBottom: SPACING.xs,
  },
});
