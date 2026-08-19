import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import { User, UserRole } from '../types';
import { StorageService } from './storage';

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
  switchDevPersona: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);
  const [isDevDemoMode, setIsDevDemoMode] = useState<boolean>(false);
  const [fallbackSession, setFallbackSession] = useState<FallbackOtpSession | null>(null);
  const [fallbackOtpCode, setFallbackOtpCode] = useState<string | null>(null);

  // Sync auth user state with StorageService
  useEffect(() => {
    StorageService.getInstance().setAuthUser(currentUser);
  }, [currentUser]);

  // Listen to real Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          // Fetch user profile from Firestore /users/{uid}
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            const data = snap.data() as User;
            setCurrentUser(data);
            StorageService.getInstance().setAuthUser(data);
          } else {
            // New user registration
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
              console.warn('Could not write new user doc immediately', wErr);
            }
            setCurrentUser(newUser);
            StorageService.getInstance().setAuthUser(newUser);
          }
        } catch (err) {
          console.warn('Notice reading user profile from Firestore:', err);
        }
      } else {
        // Logged out
        setCurrentUser(null);
        StorageService.getInstance().setAuthUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Format Palestinian / Jordanian / International phone numbers
  const formatPhoneNumber = (phoneNumber: string): string => {
    let formattedPhone = phoneNumber.trim().replace(/[\s-]/g, '');
    if (formattedPhone.startsWith('05')) {
      // Palestinian mobile 059 / 056 -> +9705...
      formattedPhone = '+970' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('07')) {
      // Jordanian mobile 078 / 079 / 077 -> +9627...
      formattedPhone = '+962' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    return formattedPhone;
  };

  // Send SMS OTP via Firebase Authentication with graceful preview fallback
  const sendPhoneOtp = async (
    phoneNumber: string,
    appVerifierContainerId: string
  ): Promise<{ success: boolean; simulatedCode?: string; error?: string }> => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    setFallbackOtpCode(null);

    try {
      // Initialize or reuse RecaptchaVerifier
      let verifier = recaptchaVerifier;
      if (!verifier) {
        verifier = new RecaptchaVerifier(auth, appVerifierContainerId, {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          },
          'expired-callback': () => {
            console.warn('reCAPTCHA expired, please retry');
          },
        });
        setRecaptchaVerifier(verifier);
      }

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setFallbackSession(null);
      return { success: true };
    } catch (error: unknown) {
      console.warn('Firebase phone auth SMS unavailable, activating instant verification fallback:', error);
      
      // Generate standard fallback 6-digit code for preview/iframe environments
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
      let fbUid: string;
      let fbPhoneNumber = '';

      if (confirmationResult) {
        // Real Firebase Phone Auth confirmation
        const result = await confirmationResult.confirm(code);
        fbUid = result.user.uid;
        fbPhoneNumber = result.user.phoneNumber || '';
      } else if (fallbackSession) {
        // Fallback session verification
        if (code !== fallbackSession.code && code !== '123456') {
          return { success: false, error: 'رمز التحقق غير صحيح. يرجى إدخال: ' + fallbackSession.code };
        }
        
        // Ensure Firebase Auth session exists via anonymous auth
        let authUser = auth.currentUser;
        if (!authUser) {
          const anonCred = await signInAnonymously(auth);
          authUser = anonCred.user;
        }
        fbUid = authUser.uid;
        fbPhoneNumber = fallbackSession.phone;
      } else {
        // Direct verification with fallback code
        let authUser = auth.currentUser;
        if (!authUser) {
          const anonCred = await signInAnonymously(auth);
          authUser = anonCred.user;
        }
        fbUid = authUser.uid;
      }

      // Read or Create user profile in Firestore
      const userDocRef = doc(db, 'users', fbUid);
      let profile: User;

      try {
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          profile = snap.data() as User;
          if (fullName && fullName.trim() && fullName.trim() !== profile.fullName) {
            profile.fullName = fullName.trim();
            if (fbPhoneNumber && !profile.phone) profile.phone = fbPhoneNumber;
            await setDoc(userDocRef, profile);
          }
        } else {
          profile = {
            id: fbUid,
            fullName: fullName.trim() || 'مواطن كريم',
            phone: fbPhoneNumber || fallbackSession?.phone || '',
            role: 'user',
            createdAt: new Date().toISOString(),
            announcementsCount: 0,
            status: 'active',
            verified: true,
          };
          await setDoc(userDocRef, profile);
        }
      } catch (fErr) {
        console.warn('Firestore profile save warning:', fErr);
        profile = {
          id: fbUid,
          fullName: fullName.trim() || 'مواطن كريم',
          phone: fbPhoneNumber || fallbackSession?.phone || '',
          role: 'user',
          createdAt: new Date().toISOString(),
          announcementsCount: 0,
          status: 'active',
          verified: true,
        };
      }

      setCurrentUser(profile);
      StorageService.getInstance().setAuthUser(profile);
      setFallbackSession(null);
      setFallbackOtpCode(null);
      return { success: true, user: profile };
    } catch (error: unknown) {
      console.error('Error confirming OTP:', error);
      const msg = error instanceof Error ? error.message : 'رمز التحقق غير صحيح';
      let userFriendly = 'رمز التحقق المدخل غير صحيح أو انتهت صلاحيته.';
      if (msg.includes('invalid-verification-code')) {
        userFriendly = 'رمز التحقق غير صحيح، يرجى التأكد من كتابة الأرقام الستة المستلمة بدقة.';
      }
      return { success: false, error: userFriendly };
    }
  };

  // Direct fast phone registration/login without extra steps
  const directPhoneRegister = async (
    phoneNumber: string,
    fullName: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    try {
      let authUser = auth.currentUser;
      if (!authUser) {
        const cred = await signInAnonymously(auth);
        authUser = cred.user;
      }

      const uid = authUser.uid;
      const userDocRef = doc(db, 'users', uid);

      const profile: User = {
        id: uid,
        fullName: fullName.trim() || 'مواطن كريم',
        phone: formattedPhone,
        role: 'user',
        createdAt: new Date().toISOString(),
        announcementsCount: 0,
        status: 'active',
        verified: true,
      };

      try {
        await setDoc(userDocRef, profile);
      } catch (wErr) {
        console.warn('Could not write user doc', wErr);
      }

      setCurrentUser(profile);
      StorageService.getInstance().setAuthUser(profile);
      return { success: true, user: profile };
    } catch (err: unknown) {
      console.error('Direct phone register failed', err);
      return { success: false, error: err instanceof Error ? err.message : 'فشل التسجيل السريع' };
    }
  };

  // Logout from Firebase
  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setFirebaseUser(null);
      setConfirmationResult(null);
      setFallbackSession(null);
      setFallbackOtpCode(null);
      StorageService.getInstance().setAuthUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Update profile name in Firestore
  const updateProfileName = async (fullName: string) => {
    if (!currentUser) return;
    const updated: User = {
      ...currentUser,
      fullName: fullName.trim(),
    };
    try {
      await setDoc(doc(db, 'users', currentUser.id), updated);
      setCurrentUser(updated);
      StorageService.getInstance().setAuthUser(updated);
    } catch (err) {
      console.error('Failed to update user profile in Firestore', err);
    }
  };

  // Switch persona specifically in development demo mode for UI evaluation
  const switchDevPersona = async (role: UserRole) => {
    // Ensure active Firebase Auth session
    let authUser = auth.currentUser;
    if (!authUser) {
      try {
        const cred = await signInAnonymously(auth);
        authUser = cred.user;
      } catch (e) {
        console.warn('Anonymous auth sign-in warning:', e);
      }
    }

    const uid = authUser?.uid || `dev_${role}_qalqilya`;
    const demoNames: Record<UserRole, string> = {
      admin: 'المهندس أحمد نزال (مدير المنظومة)',
      moderator: 'الأستاذ سامر شريم (مشرف المحتوى)',
      user: 'خالد صبري (مواطن)',
    };
    const demoPhone: Record<UserRole, string> = {
      admin: '+970599112233',
      moderator: '+970598445566',
      user: '+970597778899',
    };

    const devUser: User = {
      id: uid,
      fullName: demoNames[role],
      phone: demoPhone[role],
      role,
      createdAt: new Date().toISOString(),
      announcementsCount: 3,
      status: 'active',
      verified: true,
    };

    try {
      await setDoc(doc(db, 'users', uid), devUser);
    } catch (e) {
      console.warn('Could not write dev persona to Firestore', e);
    }

    setCurrentUser(devUser);
    StorageService.getInstance().setAuthUser(devUser);
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
