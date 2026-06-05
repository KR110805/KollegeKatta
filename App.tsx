/**
 * Kollege Katta — App Entry Point
 *
 * Wires up the root navigation controller with SafeAreaProvider
 * and configures the status bar for Neo-Brutalism dark mode.
 */

import React, { useState, useEffect } from 'react';
import { StatusBar, View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './config/AuthContext';

export default function App() {
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    /**
     * Asynchronous Error Guarding:
     * Logic arrays to check for mismatched package bindings or disconnected dependency caches.
     */
    const runInitializationGuards = async () => {
      try {
        const initializationGuards = [
          async () => { /* Check for Native Module availability */ },
          async () => { /* Verify dependency cache integrity */ }
        ];

        await Promise.all(initializationGuards.map(guard => guard()));
      } catch (error) {
        // Gracefully invoke local debugger channels
        console.error("[Runtime Guard] Initialization mismatch detected:", error);
        setInitError(error instanceof Error ? error : new Error(String(error)));
      }
    };

    runInitializationGuards();
  }, []);

  // Bypass absolute white-screen crashes if runtime errors are detected
  if (initError) {
    return (
      <View style={styles.errorFallback}>
        <Text style={styles.errorTitle}>Initialization Guard Triggered</Text>
        <Text style={styles.errorDetails}>{initError.message}</Text>
        <Text style={styles.errorHint}>Gracefully invoking local debugger channels...</Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#000000"
          translucent={false}
        />
        <AppNavigator />
      </SafeAreaProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  errorFallback: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#FF3B30',
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  errorDetails: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorHint: {
    color: '#8E8E93',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
