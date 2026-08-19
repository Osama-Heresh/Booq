import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import { User, UserRole } from '../types';
import { StorageService } from './storage';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isLoading: boolean;
  isDevDemoMode: boolean;
  setDevDemoMode: (enabled: boolean) => void;
  sendPhoneOtp: (phoneNumber: string, appVerifierContainerId: string) => Promise<{ success: boolean; error?: string }>;
  verifyPhoneOtp: (verificationCode: string, fullName: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  updateProfileName: (fullName: string) => Promise<void>;
  // Dev mode persona switch for UI verification (clearly flagged)
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

  const storage = StorageService.getInstance();

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
            setCurrentUser(snap.data() as User);
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
            await setDoc(userDocRef, newUser);
            setCurrentUser(newUser);
          }
        } catch (err) {
          console.error('Error fetching user profile from Firestore:', err);
        }
      } else {
        // Logged out - no automatic admin login!
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Send real SMS OTP via Firebase Authentication
  const sendPhoneOtp = async (
    phoneNumber: string,
    appVerifierContainerId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Clean and format international phone number (e.g. Palestine +970 / +972 / Jordan +962)
      let formattedPhone = phoneNumber.trim();
      if (formattedPhone.startsWith('05')) {
        // Palestinian mobile 059 / 056 -> +9705...
        formattedPhone = '+970' + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith('07')) {
        // Jordanian mobile 078 / 079 / 077 -> +9627...
        formattedPhone = '+962' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }

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
      return { success: true };
    } catch (error: unknown) {
      console.error('Firebase phone auth error:', error);
      const msg = error instanceof Error ? error.message : 'تعذر إرسال رمز التحقق عبر SMS';
      let userFriendly = msg;
      if (msg.includes('invalid-phone-number')) {
        userFriendly = 'رقم الهاتف غير صالح. يرجى التأكد من كتابة الرقم كاملاً مع مقدمة الدولة.';
      } else if (msg.includes('quota-exceeded')) {
        userFriendly = 'تم تجاوز الحد المسموح لرسائل SMS مؤقتًا.';
      } else if (msg.includes('captcha-check-failed')) {
        userFriendly = 'فشل التحقق الأمني من reCAPTCHA.';
      }
      return { success: false, error: userFriendly };
    }
  };

  // Verify real SMS OTP code
  const verifyPhoneOtp = async (
    verificationCode: string,
    fullName: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    if (!verificationCode || verificationCode.trim().length < 6) {
      return { success: false, error: 'رمز التحقق عبر SMS يجب أن يتكون من 6 أرقام' };
    }

    if (!confirmationResult) {
      return { success: false, error: 'لم يتم العثور على جلسة تحقق صالحة. يرجى طلب الرمز من جديد.' };
    }

    try {
      const result = await confirmationResult.confirm(verificationCode.trim());
      const fbUser = result.user;

      // Update or create Firestore profile
      const userDocRef = doc(db, 'users', fbUser.uid);
      const existingSnap = await getDoc(userDocRef);

      let profile: User;
      if (existingSnap.exists()) {
        profile = existingSnap.data() as User;
        if (fullName && fullName.trim() !== profile.fullName) {
          profile.fullName = fullName.trim();
          await setDoc(userDocRef, profile);
        }
      } else {
        profile = {
          id: fbUser.uid,
          fullName: fullName.trim() || 'مواطن كريم',
          phone: fbUser.phoneNumber || '',
          role: 'user',
          createdAt: new Date().toISOString(),
          announcementsCount: 0,
          status: 'active',
          verified: true,
        };
        await setDoc(userDocRef, profile);
      }

      setCurrentUser(profile);
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

  // Logout from Firebase
  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setFirebaseUser(null);
      setConfirmationResult(null);
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
    } catch (err) {
      console.error('Failed to update user profile in Firestore', err);
    }
  };

  // Switch persona specifically in development demo mode for UI evaluation
  const switchDevPersona = async (role: UserRole) => {
    const demoId = `dev_${role}_qalqilya`;
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
      id: demoId,
      fullName: demoNames[role],
      phone: demoPhone[role],
      role,
      createdAt: new Date().toISOString(),
      announcementsCount: 3,
      status: 'active',
      verified: true,
    };

    try {
      await setDoc(doc(db, 'users', demoId), devUser);
    } catch (e) {
      console.warn('Could not write dev persona to Firestore', e);
    }

    setCurrentUser(devUser);
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
        setDevDemoMode: setIsDevDemoMode,
        sendPhoneOtp,
        verifyPhoneOtp,
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
