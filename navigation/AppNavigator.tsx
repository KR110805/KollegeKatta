/**
 * Kollege Katta — Root Navigation Controller
 *
 * AuthStack: CollegeSelectScreen -> ProfileSetupScreen
 * MainTabs:  DashboardFeed | HotlistScreen | BazaarScreen
 *
 * Root switcher checks AsyncStorage for persisted session on boot.
 */

import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../config/AuthContext';
import { COLORS, BORDER, FONT_SIZES, SPACING } from '../styles/theme';

import CollegeSelectScreen from '../screens/CollegeSelectScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import DashboardFeed from '../screens/DashboardFeed';
import HotlistScreen from '../screens/HotlistScreen';
import BazaarScreen from '../screens/BazaarScreen';

// ---------------------------------------------------------------------------
// Navigator Type Definitions
// ---------------------------------------------------------------------------

export type AuthStackParamList = {
  CollegeSelect: undefined;
  ProfileSetup: { kollegeId: number; kollegeName: string };
};

export type MainTabsParamList = {
  Feed: undefined;
  Hotlist: undefined;
  Bazaar: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

// ---------------------------------------------------------------------------
// Auth Stack
// ---------------------------------------------------------------------------

function AuthStack() {
  return (
    <AuthStackNav.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <AuthStackNav.Screen name="CollegeSelect" component={CollegeSelectScreen} />
      <AuthStackNav.Screen name="ProfileSetup" component={ProfileSetupScreen} />
    </AuthStackNav.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Main Tabs — Neo-Brutalism Tab Bar
// ---------------------------------------------------------------------------

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tab.Screen
        name="Feed"
        component={DashboardFeed}
        options={{ tabBarLabel: '📢 FEED' }}
      />
      <Tab.Screen
        name="Hotlist"
        component={HotlistScreen}
        options={{ tabBarLabel: '🔥 HOTLIST' }}
      />
      <Tab.Screen
        name="Bazaar"
        component={BazaarScreen}
        options={{ tabBarLabel: '🛒 BAZAAR' }}
      />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Root Navigator — Session Switcher
// ---------------------------------------------------------------------------

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthStack} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    backgroundColor: COLORS.background,
    borderTopWidth: BORDER.width,
    borderTopColor: COLORS.border,
    height: 64,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.sm,
  },
  tabLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
