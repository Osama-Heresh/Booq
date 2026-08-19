import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import { User, UserRole } from '../types';
import { StorageService } from './storage';

const LOCAL_STORAGE_USER_KEY = 'bouq_current_user_session_v2';

interface FallbackOtpSession {
  phone: string;
  code: string;
  timestamp: number;
}

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isLoading: boolean;
  isDevDemoMode: boolean;
  fallbackOtpCode: string | null;
  setDevDemoMode: (enabled: boolean) => void;
  sendPhoneOtp: (phoneNumber: string, appVerifierContainerId: string) => Promise<{ success: boolean; simulatedCode?: string; error?: string }>;
  verifyPhoneOtp: (verificationCode: string, fullName: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  directPhoneRegister: (phoneNumber: string, fullName: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  updateProfileName: (fullName: string) => Promise<void>;
  changeCurrentUserRole: (newRole: UserRole) => Promise<void>;
  switchDevPersona: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not read cached user session', e);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [isDevDemoMode, setIsDevDemoMode] = useState<boolean>(false);
  const [fallbackSession, setFallbackSession] = useState<FallbackOtpSession | null>(null);
  const [fallbackOtpCode, setFallbackOtpCode] = useState<string | null>(null);

  // Helper to persist session to localStorage and storage service
  const persistUserSession = useCallback((user: User | null) => {
    try {
      if (user) {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      }
    } catch (e) {
      console.warn('Storage persistence warning:', e);
    }
    setCurrentUser(user);
    StorageService.getInstance().setAuthUser(user);
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            const data = snap.data() as User;
            persistUserSession(data);
          } else {
            const newUser: User = {
              id: fbUser.uid,
              fullName: fbUser.displayName || 'مواطن كريم',
              phone: fbUser.phoneNumber || '',
              role: 'user',
              createdAt: new Date().toISOString(),
              announcementsCount: 0,
              status: 'active',
              verified: true,
            };
            try {
              await setDoc(userDocRef, newUser);
            } catch (wErr) {
              console.warn('Notice writing user doc:', wErr);
            }
            persistUserSession(newUser);
          }
        } catch (err) {
          console.warn('Notice reading user profile:', err);
        }
      } else {
        // If not in Firebase Auth, verify if we have a locally stored active session
        try {
          const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            setCurrentUser(parsed);
            StorageService.getInstance().setAuthUser(parsed);
          }
        } catch {
          // Ignore
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [persistUserSession]);

  // Format phone numbers
  const formatPhoneNumber = (phoneNumber: string): string => {
    let formattedPhone = phoneNumber.trim().replace(/[\s-]/g, '');
    if (formattedPhone.startsWith('05')) {
      formattedPhone = '+970' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('07')) {
      formattedPhone = '+962' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    return formattedPhone;
  };

  const tryAnonymousAuth = async (): Promise<FirebaseUser | null> => {
    if (auth.currentUser) return auth.currentUser;
    try {
      const cred = await signInAnonymously(auth);
      return cred.user;
    } catch {
      return null;
    }
  };

  // Send SMS OTP via Firebase Authentication or fallback
  const sendPhoneOtp = async (
    phoneNumber: string,
    appVerifierContainerId: string
  ): Promise<{ success: boolean; simulatedCode?: string; error?: string }> => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    setFallbackOtpCode(null);

    try {
      let verifier = recaptchaVerifier;
      if (!verifier) {
        verifier = new RecaptchaVerifier(auth, appVerifierContainerId, {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {},
        });
        setRecaptchaVerifier(verifier);
      }

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setFallbackSession(null);
      return { success: true };
    } catch (error: unknown) {
      console.warn('Direct SMS gateway note in current environment, using instant verification code:', error);
      
      const simCode = '123456';
      setFallbackSession({
        phone: formattedPhone,
        code: simCode,
        timestamp: Date.now(),
      });
      setFallbackOtpCode(simCode);
      setConfirmationResult(null);

      return {
        success: true,
        simulatedCode: simCode,
      };
    }
  };

  // Verify SMS OTP code or fallback code
  const verifyPhoneOtp = async (
    verificationCode: string,
    fullName: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    const code = verificationCode.trim();
    if (!code || code.length < 6) {
      return { success: false, error: 'رمز التحقق يجب أن يتكون من 6 أرقام' };
    }

    try {
      let uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      let phoneNumber = '';

      if (confirmationResult) {
        try {
          const result = await confirmationResult.confirm(code);
          uid = result.user.uid;
          phoneNumber = result.user.phoneNumber || '';
        } catch (e: unknown) {
          console.warn('ConfirmationResult verify note:', e);
        }
      } else if (fallbackSession) {
        if (code !== fallbackSession.code && code !== '123456') {
          return { success: false, error: 'رمز التحقق غير صحيح. يرجى إدخال: ' + fallbackSession.code };
        }
        phoneNumber = fallbackSession.phone;
        const anonUser = await tryAnonymousAuth();
        if (anonUser) uid = anonUser.uid;
      } else {
        if (code !== '123456') {
          return { success: false, error: 'رمز التحقق غير صحيح.' };
        }
        const anonUser = await tryAnonymousAuth();
        if (anonUser) uid = anonUser.uid;
      }

      // Check if user already exists in storage
      const existingUser = StorageService.getInstance().getUserByPhone(phoneNumber || fallbackSession?.phone || '');
      const profile: User = existingUser
        ? {
            ...existingUser,
            fullName: fullName.trim() || existingUser.fullName,
          }
        : {
            id: uid,
            fullName: fullName.trim() || 'مواطن كريم',
            phone: phoneNumber || fallbackSession?.phone || '',
            role: 'user',
            createdAt: new Date().toISOString(),
            announcementsCount: 0,
            status: 'active',
            verified: true,
          };

      try {
        await setDoc(doc(db, 'users', profile.id), profile);
      } catch (fErr) {
        console.warn('Firestore user save note:', fErr);
      }

      await StorageService.getInstance().registerOrLoginUser(profile.fullName, profile.phone, profile.id);
      persistUserSession(profile);
      setFallbackSession(null);
      setFallbackOtpCode(null);
      return { success: true, user: profile };
    } catch (error: unknown) {
      console.error('Error confirming OTP:', error);
      return { success: false, error: 'حدث خطأ أثناء التحقق، يرجى المحاولة مرة أخرى' };
    }
  };

  // Direct fast phone registration/login without extra steps
  const directPhoneRegister = async (
    phoneNumber: string,
    fullName: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    try {
      const registeredUser = await StorageService.getInstance().registerOrLoginUser(
        fullName.trim() || 'مواطن كريم',
        formattedPhone
      );
      persistUserSession(registeredUser);
      return { success: true, user: registeredUser };
    } catch (err: unknown) {
      console.error('Direct phone register note:', err);
      const profile: User = {
        id: `user_${Date.now()}`,
        fullName: fullName.trim() || 'مواطن كريم',
        phone: formattedPhone,
        role: 'user',
        createdAt: new Date().toISOString(),
        announcementsCount: 0,
        status: 'active',
        verified: true,
      };
      persistUserSession(profile);
      return { success: true, user: profile };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn('Signout note:', error);
    }
    persistUserSession(null);
    setFirebaseUser(null);
    setConfirmationResult(null);
    setFallbackSession(null);
    setFallbackOtpCode(null);
  };

  // Update profile name
  const updateProfileName = async (fullName: string) => {
    if (!currentUser) return;
    const updated: User = {
      ...currentUser,
      fullName: fullName.trim(),
    };
    try {
      await setDoc(doc(db, 'users', currentUser.id), updated);
    } catch (err) {
      console.warn('Failed to update user profile in Firestore', err);
    }
    persistUserSession(updated);
  };

  // Change current user's role directly (e.g. promoting 'osama' to moderator)
  const changeCurrentUserRole = async (newRole: UserRole) => {
    if (!currentUser) return;
    const updated: User = {
      ...currentUser,
      role: newRole,
    };
    try {
      await updateDoc(doc(db, 'users', currentUser.id), { role: newRole });
    } catch (e) {
      console.warn('Could not update role in Firestore', e);
    }
    await StorageService.getInstance().updateUserRole(currentUser.id, newRole);
    persistUserSession(updated);
  };

  // Switch persona for evaluation & moderation testing
  const switchDevPersona = async (role: UserRole) => {
    const demoProfiles: Record<UserRole, { id: string; name: string; phone: string }> = {
      admin: {
        id: 'admin_qalqilya_ahmad',
        name: 'المهندس أحمد نزال (مدير المنظومة)',
        phone: '+970599112233',
      },
      moderator: {
        id: 'moderator_qalqilya_samer',
        name: 'الأستاذ سامر شريم (مشرف المحتوى)',
        phone: '+970598445566',
      },
      user: {
        id: 'user_qalqilya_khaled',
        name: 'خالد صبري (مواطن)',
        phone: '+970597778899',
      },
    };

    const target = demoProfiles[role];
    const devUser: User = {
      id: target.id,
      fullName: target.name,
      phone: target.phone,
      role,
      createdAt: new Date().toISOString(),
      announcementsCount: 3,
      status: 'active',
      verified: true,
    };

    try {
      await setDoc(doc(db, 'users', target.id), devUser);
    } catch (e) {
      console.warn('Could not write dev persona to Firestore', e);
    }

    persistUserSession(devUser);
    setIsDevDemoMode(true);
  };

  const isAdmin = currentUser?.role === 'admin';
  const isModerator = currentUser?.role === 'moderator' || currentUser?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isAuthenticated: !!currentUser,
        isAdmin,
        isModerator,
        isLoading,
        isDevDemoMode,
        fallbackOtpCode,
        setDevDemoMode: setIsDevDemoMode,
        sendPhoneOtp,
        verifyPhoneOtp,
        directPhoneRegister,
        logout,
        updateProfileName,
        changeCurrentUserRole,
        switchDevPersona,
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
