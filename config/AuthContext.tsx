import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './supabaseClient';

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (kollegeId: number, userId: string, aliasName: string, kollegeName: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const [storedKollegeId, storedUserId] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.KOLLEGE_ID),
        AsyncStorage.getItem(STORAGE_KEYS.USER_ID),
      ]);
      if (storedKollegeId && storedUserId) {
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('[AuthContext] Session check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(kollegeId: number, userId: string, aliasName: string, kollegeName: string) {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.KOLLEGE_ID, String(kollegeId)),
      AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId),
      AsyncStorage.setItem(STORAGE_KEYS.ALIAS_NAME, aliasName),
      AsyncStorage.setItem(STORAGE_KEYS.KOLLEGE_NAME, kollegeName),
    ]);
    setIsAuthenticated(true);
  }

  async function logout() {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.KOLLEGE_ID),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_ID),
      AsyncStorage.removeItem(STORAGE_KEYS.ALIAS_NAME),
      AsyncStorage.removeItem(STORAGE_KEYS.KOLLEGE_NAME),
    ]);
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
