import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import { User, UserRole } from '../types';
import { StorageService } from './storage';

const LOCAL_STORAGE_USER_KEY = 'bouq_current_user_session_v2';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isLoading: boolean;
  sendPhoneOtp: (phoneNumber: string, appVerifierContainerId: string) => Promise<{ success: boolean; error?: string }>;
  verifyPhoneOtp: (verificationCode: string, fullName: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => Promise<void>;
  updateProfileName: (fullName: string) => Promise<void>;
  changeCurrentUserRole: (newRole: UserRole) => Promise<void>;
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
            // New user defaults strictly to "user" role
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
              console.warn('Notice writing user doc to Firestore:', wErr);
            }
            persistUserSession(newUser);
          }
        } catch (err) {
          console.warn('Notice reading user profile:', err);
        }
      } else {
        persistUserSession(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [persistUserSession]);

  // Clean up recaptcha verifier on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (e) {
          console.warn('Recaptcha clear notice:', e);
        }
      }
    };
  }, [recaptchaVerifier]);

  // Format Palestinian and international phone numbers into E.164
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

  const getFirebasePhoneErrorMessage = (err: unknown): string => {
    if (!err || typeof err !== 'object') {
      return 'تعذر إرسال رمز التحقق. يرجى التأكد من إعداد خدمة التحقق عبر الهاتف في Firebase.';
    }
    const errorObj = err as { code?: string; message?: string };
    const code = errorObj.code || '';

    switch (code) {
      case 'auth/invalid-phone-number':
        return 'رقم الهاتف المدخل غير صالح. يرجى التأكد من كتابة الرقم بشكل صحيح (مثال: 0599123456).';
      case 'auth/missing-phone-number':
        return 'يرجى إدخال رقم الهاتف.';
      case 'auth/quota-exceeded':
        return 'تم تجاوز الحصة المخصصة لرسائل SMS اليومية. يرجى المحاولة في وقت لاحق.';
      case 'auth/captcha-check-failed':
        return 'فشل التحقق الأمني (reCAPTCHA). يرجى إعادة المحاولة.';
      case 'auth/too-many-requests':
        return 'تم إجراء محاولات كثيرة جداً خلال وقت قصير. يرجى الانتظار بضع دقائق ثم المحاولة مرة أخرى.';
      case 'auth/app-not-authorized':
      case 'auth/operation-not-allowed':
        return 'خدمة التحقق عبر الهاتف (Phone Authentication) غير مفعلة في مشروع Firebase. يرجى تفعيلها من لوحة تحكم Firebase.';
      case 'auth/network-request-failed':
        return 'تعذر الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.';
      default:
        return 'تعذر إرسال رمز التحقق. يرجى التأكد من إعداد خدمة التحقق عبر الهاتف في Firebase.';
    }
  };

  const getFirebaseVerifyErrorMessage = (err: unknown): string => {
    if (!err || typeof err !== 'object') {
      return 'رمز التحقق غير صحيح أو حدث خطأ أثناء التحقق.';
    }
    const errorObj = err as { code?: string; message?: string };
    const code = errorObj.code || '';

    switch (code) {
      case 'auth/invalid-verification-code':
        return 'رمز التحقق المدخل غير صحيح. يرجى مراجعة الرسالة النصية وإعادة المحاولة.';
      case 'auth/code-expired':
        return 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.';
      case 'auth/session-expired':
        return 'انتهت صلاحية جلسة التحقق. يرجى إعادة إدخال رقم الهاتف.';
      default:
        return 'حدث خطأ أثناء تأكيد رمز التحقق. يرجى المحاولة مجدداً.';
    }
  };

  /**
   * Genuine Firebase Phone Authentication:
   * 1. Initializes RecaptchaVerifier
   * 2. Calls Firebase signInWithPhoneNumber()
   * 3. Stores ConfirmationResult
   * 4. Firebase dispatches genuine SMS OTP to the user's phone
   */
  const sendPhoneOtp = async (
    phoneNumber: string,
    appVerifierContainerId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const formattedPhone = formatPhoneNumber(phoneNumber);

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
      return { success: true };
    } catch (error: unknown) {
      console.error('Firebase signInWithPhoneNumber error:', error);
      // Clean up verifier to allow fresh retry
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch {
          // Ignore
        }
        setRecaptchaVerifier(null);
      }
      setConfirmationResult(null);
      return {
        success: false,
        error: getFirebasePhoneErrorMessage(error),
      };
    }
  };

  /**
   * Verify Phone OTP:
   * Calls confirmationResult.confirm(code) directly with Firebase Auth.
   * If confirmation succeeds, fetches or initializes user profile with role='user'.
   */
  const verifyPhoneOtp = async (
    verificationCode: string,
    fullName: string
  ): Promise<{ success: boolean; user?: User; error?: string }> => {
    const code = verificationCode.trim();
    if (!code || code.length < 6) {
      return { success: false, error: 'رمز التحقق يجب أن يتكون من 6 أرقام' };
    }

    if (!confirmationResult) {
      return {
        success: false,
        error: 'انتهت صلاحية جلسة التحقق. يرجى إعادة طلب رمز التحقق برقم هاتفك.',
      };
    }

    try {
      const result = await confirmationResult.confirm(code);
      const fbUser = result.user;
      const userDocRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userDocRef);

      let profile: User;

      if (snap.exists()) {
        profile = snap.data() as User;
        if (fullName.trim() && fullName.trim() !== profile.fullName) {
          profile = { ...profile, fullName: fullName.trim() };
          try {
            await updateDoc(userDocRef, { fullName: fullName.trim() });
          } catch (uErr) {
            console.warn('Notice updating full name:', uErr);
          }
        }
      } else {
        // New user strictly created as role 'user'
        profile = {
          id: fbUser.uid,
          fullName: fullName.trim() || fbUser.displayName || 'مواطن كريم',
          phone: fbUser.phoneNumber || '',
          role: 'user',
          createdAt: new Date().toISOString(),
          announcementsCount: 0,
          status: 'active',
          verified: true,
        };

        try {
          await setDoc(userDocRef, profile);
        } catch (sErr) {
          console.warn('Notice saving user to Firestore:', sErr);
        }
      }

      await StorageService.getInstance().registerOrLoginUser(profile.fullName, profile.phone, profile.id);
      persistUserSession(profile);
      setConfirmationResult(null);

      return { success: true, user: profile };
    } catch (error: unknown) {
      console.error('Error confirming Firebase OTP:', error);
      return {
        success: false,
        error: getFirebaseVerifyErrorMessage(error),
      };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn('Firebase signOut note:', error);
    }
    persistUserSession(null);
    setFirebaseUser(null);
    setConfirmationResult(null);
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

  // Change current user's role in Firestore and memory (by Admin or user management)
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
        sendPhoneOtp,
        verifyPhoneOtp,
        logout,
        updateProfileName,
        changeCurrentUserRole,
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
