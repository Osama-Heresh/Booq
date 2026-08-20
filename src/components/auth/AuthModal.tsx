import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import { X, UserCheck, Phone, ShieldCheck, KeyRound, LogOut, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

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
  } = useAuth();

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMsg('يرجى كتابة رقم هاتف صالح (مثال: 0599123456 أو 0568123456)');
      return;
    }

    setIsSubmitting(true);
    const res = await sendPhoneOtp(cleanPhone, 'recaptcha-auth-container');
    setIsSubmitting(false);

    if (res.success) {
      setStep('otp');
      setOtpCode('');
      setInfoMsg('تم إرسال رمز التحقق عبر رسالة نصية SMS إلى رقمك.');
    } else {
      setErrorMsg(res.error || 'تعذر إرسال رمز التحقق. يرجى التأكد من إعداد خدمة التحقق عبر الهاتف في Firebase.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg('يرجى إدخال رمز التحقق المكون من 6 أرقام والمستلم عبر رسالة SMS');
      return;
    }

    setIsSubmitting(true);
    const res = await verifyPhoneOtp(cleanOtp, fullName);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'رمز التحقق غير صحيح أو منتهي الصلاحية');
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
              {currentUser ? 'حساب المستخدم' : 'تسجيل الدخول عبر رقم الهاتف'}
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
          {/* Logged in state */}
          {currentUser && (
            <div className="bg-[#FDFBF7] border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#64748B] font-bold block">المستخدم الحالي المسجل:</span>
                  <h4 className="font-black text-base text-[#0F172A]">{currentUser.fullName}</h4>
                  <p className="text-xs text-[#64748B] font-mono">{currentUser.phone || 'بدون رقم'}</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#0F172A] text-white">
                  {currentUser.role === 'admin'
                    ? 'مدير عام 👑'
                    : currentUser.role === 'moderator'
                    ? 'مشرف معتمد 🛡️'
                    : 'مواطن'}
                </span>
              </div>

              <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                <span className="text-[#64748B]">إجمالي إعلاناتك: {currentUser.announcementsCount || 0}</span>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setStep('phone');
                    setOtpCode('');
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
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-2xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {infoMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-2xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-semibold">{infoMsg}</span>
                </div>
              )}

              {step === 'phone' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                      الاسم الكامل <span className="text-[#64748B] font-normal">(اختياري للمستخدمين الجدد)</span>
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
                      يدعم أرقام فلسطين (059/056) والأردن (+962) وكافة المقدمات الدولية
                    </p>
                  </div>

                  {/* Hidden container for Firebase RecaptchaVerifier */}
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
                        <span>إرسال رمز التحقق SMS عبر Firebase</span>
                        <KeyRound className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
                    <p className="font-bold">تم إرسال رمز التحقق SMS إلى الرقم:</p>
                    <p className="font-mono text-sm text-[#0F172A]" dir="ltr">
                      {phone}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                      رمز التحقق المستلم (6 أرقام) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder=""
                      autoFocus
                      required
                      className="w-full bg-[#F8FAFC] border border-[#CBD5E1] focus:border-[#F27D26] rounded-xl px-3.5 py-3 text-center text-xl tracking-widest font-mono outline-none transition-colors"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('phone');
                        setOtpCode('');
                        setErrorMsg(null);
                        setInfoMsg(null);
                      }}
                      className="w-1/3 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      تغيير الرقم
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || otpCode.length !== 6}
                      className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تأكيد الرمز وتسجيل الدخول</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
