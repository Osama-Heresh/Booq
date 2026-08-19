import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import { UserRole } from '../../types';
import { X, UserCheck, Phone, ShieldCheck, KeyRound, Sparkles, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    sendPhoneOtp,
    verifyPhoneOtp,
    logout,
    switchDevPersona,
    isDevDemoMode,
  } = useAuth();

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!phone || phone.trim().length < 8) {
      setErrorMsg('يرجى كتابة رقم هاتف صالح (مثال: 0599123456 أو +970599123456)');
      return;
    }
    setIsSubmitting(true);
    const res = await sendPhoneOtp(phone, 'recaptcha-auth-container');
    setIsSubmitting(false);
    if (res.success) {
      setStep('otp');
    } else {
      setErrorMsg(res.error || 'تعذر إرسال رمز التحقق عبر Firebase Phone Auth');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!otpCode || otpCode.trim().length < 6) {
      setErrorMsg('يرجى إدخال رمز التحقق المكون من 6 أرقام المستلم عبر SMS');
      return;
    }
    setIsSubmitting(true);
    const res = await verifyPhoneOtp(otpCode, fullName);
    setIsSubmitting(false);
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'رمز التحقق غير صحيح');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full border border-[#E2E8F0] overflow-hidden text-right animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#F27D26]" />
            <h3 className="font-bold text-base text-[#0F172A]">
              {currentUser ? 'حساب المستخدم والإشراف' : 'تسجيل الدخول / إنشاء حساب'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#64748B] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Currently Logged-in User Profile */}
          {currentUser && (
            <div className="bg-[#FDFBF7] border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#64748B] font-bold block">المستخدم الحالي المسجل:</span>
                  <h4 className="font-black text-base text-[#0F172A]">{currentUser.fullName}</h4>
                  <p className="text-xs text-[#64748B] font-mono">{currentUser.phone || 'حساب بدون رقم'}</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#0F172A] text-white">
                  {currentUser.role === 'admin'
                    ? 'مدير عام 👑'
                    : currentUser.role === 'moderator'
                    ? 'مشرف معتمد 🛡️'
                    : 'مواطن'}
                </span>
              </div>

              {isDevDemoMode && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2.5 rounded-xl flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>أنت تتصفح الآن في <strong>وضع المعاينة التجريبي</strong> (بيئة التطوير).</span>
                </div>
              )}

              <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                <span className="text-[#64748B]">إجمالي إعلاناتك: {currentUser.announcementsCount || 0}</span>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setStep('phone');
                  }}
                  className="text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          )}

          {/* Login / Registration Form */}
          {!currentUser && (
            <>
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {step === 'phone' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                      الاسم الكامل <span className="text-[#64748B] font-normal">(مطلوب عند أول تسجيل)</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: أحمد عبد الله نزال"
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#F27D26] rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                      رقم الهاتف المحمول <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        dir="ltr"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0599123456"
                        required
                        className="w-full bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#F27D26] rounded-xl pl-3.5 pr-10 py-2.5 text-sm outline-none font-mono text-right transition-colors"
                      />
                      <Phone className="w-4 h-4 text-[#64748B] absolute right-3 top-3 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      سيتم إرسال رسالة نصية SMS تحوي رمز التحقق الرسمي من Firebase
                    </p>
                  </div>

                  {/* Hidden/invisible container for Firebase Recaptcha */}
                  <div id="recaptcha-auth-container" className="my-1"></div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#F27D26] hover:bg-[#D96818] text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    ) : (
                      <>
                        <span>إرسال رمز التحقق SMS</span>
                        <KeyRound className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
                    <p className="font-bold">تم إرسال رمز التحقق إلى الرقم:</p>
                    <p className="font-mono text-sm text-[#0F172A]" dir="ltr">
                      {phone}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                      رمز التحقق (6 أرقام) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      required
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#F27D26] rounded-xl px-3.5 py-3 text-center text-xl tracking-widest font-mono outline-none transition-colors"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep('phone')}
                      className="w-1/3 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      تغيير الرقم
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تأكيد وتسجيل الدخول</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* Explicit Development Persona Switcher (For Evaluation & Inspection) */}
          <div className="pt-4 border-t border-[#E2E8F0] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748B] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                تبديل الأدوار للمعاينة والاختبار (Demo Personas):
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                وضع تجريبي
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  switchDevPersona('admin');
                  onClose();
                }}
                className="p-2.5 rounded-xl border border-[#E2E8F0] bg-[#FDFBF7] hover:border-[#0F172A] hover:bg-[#F1F5F9] text-right transition-all cursor-pointer"
              >
                <span className="block font-black text-xs text-[#0F172A]">👑 مدير عام</span>
                <span className="text-[10px] text-[#64748B] block mt-0.5">صلاحيات كاملة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDevPersona('moderator');
                  onClose();
                }}
                className="p-2.5 rounded-xl border border-[#E2E8F0] bg-[#FDFBF7] hover:border-[#0F172A] hover:bg-[#F1F5F9] text-right transition-all cursor-pointer"
              >
                <span className="block font-black text-xs text-[#0F172A]">🛡️ مشرف</span>
                <span className="text-[10px] text-[#64748B] block mt-0.5">تدقيق ونشر</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDevPersona('user');
                  onClose();
                }}
                className="p-2.5 rounded-xl border border-[#E2E8F0] bg-[#FDFBF7] hover:border-[#0F172A] hover:bg-[#F1F5F9] text-right transition-all cursor-pointer"
              >
                <span className="block font-black text-xs text-[#0F172A]">👤 مواطن</span>
                <span className="text-[10px] text-[#64748B] block mt-0.5">نشر إعلانات</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
