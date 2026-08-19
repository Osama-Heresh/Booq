import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { StorageService } from './storage';
import { INITIAL_USERS } from '../data/seedData';
import { testConnection } from './firebase/config';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  loginWithPhone: (phone: string, fullName?: string) => Promise<{ success: boolean; requiresOtp?: boolean; error?: string }>;
  verifyOtp: (phone: string, otpCode: string, fullName?: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
  switchUserPersona: (userId: string) => void;
  updateProfile: (fullName: string) => void;
  availableSeedUsers: User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'booq_current_user_id_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const storage = StorageService.getInstance();

  useEffect(() => {
    // Test Firebase connection on initial boot
    testConnection();

    const savedUserId = localStorage.getItem(AUTH_USER_KEY);
    if (savedUserId) {
      const user = storage.getUserById(savedUserId);
      if (user) {
        setCurrentUser(user);
        return;
      }
    }
    // Default to admin for seamless evaluation
    const defaultAdmin = storage.getUserById('user_admin_01') || INITIAL_USERS[0];
    setCurrentUser(defaultAdmin);
  }, []);

  // Subscribe to storage changes so if current user count changes, it updates
  useEffect(() => {
    const unsub = storage.subscribe(() => {
      if (currentUser) {
        const fresh = storage.getUserById(currentUser.id);
        if (fresh) {
          setCurrentUser(fresh);
        }
      }
    });
    return unsub;
  }, [currentUser]);

  const loginWithPhone = async (phone: string): Promise<{ success: boolean; requiresOtp?: boolean; error?: string }> => {
    if (!phone || phone.trim().length < 8) {
      return { success: false, error: 'يرجى إدخال رقم هاتف صحيح' };
    }
    return { success: true, requiresOtp: true };
  };

  const verifyOtp = async (phone: string, otpCode: string, fullName?: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    if (otpCode.length !== 4) {
      return { success: false, error: 'رمز التحقق يجب أن يتكون من 4 أرقام' };
    }

    const name = fullName?.trim() || 'مواطن كريم';
    const user = storage.registerOrLoginUser(name, phone);
    setCurrentUser(user);
    localStorage.setItem(AUTH_USER_KEY, user.id);

    return { success: true, user };
  };

  const switchUserPersona = (userId: string) => {
    const user = storage.getUserById(userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(AUTH_USER_KEY, user.id);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  const updateProfile = (fullName: string) => {
    if (currentUser) {
      const updated = storage.registerOrLoginUser(fullName, currentUser.phone);
      setCurrentUser(updated);
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const isModerator = currentUser?.role === 'moderator' || currentUser?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isAdmin,
        isModerator,
        loginWithPhone,
        verifyOtp,
        logout,
        switchUserPersona,
        updateProfile,
        availableSeedUsers: storage.getUsers(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
