import React, { useState } from 'react';
import { useAuth } from '../../services/authContext';
import { User } from '../../types';
import { X, UserCheck, Phone, ShieldCheck, KeyRound, Sparkles, LogOut, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, loginWithPhone, verifyOtp, logout, switchUserPersona, availableSeedUsers } = useAuth();
  
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
      setErrorMsg('يرجى كتابة رقم هاتف صحيح');
      return;
    }
    setIsSubmitting(true);
    const res = await loginWithPhone(phone, fullName);
    setIsSubmitting(false);
    if (res.success) {
      setStep('otp');
    } else {
      setErrorMsg(res.error || 'حدث خطأ');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await verifyOtp(phone, otpCode, fullName);
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
                  <p className="text-xs text-[#64748B] font-mono">{currentUser.phone}</p>
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
                  }}
                  className="text-[#EF4444] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Demo Persona Switcher (For easy evaluation) */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#0F172A] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#F27D26]" />
                <span>التبديل السريع للحسابات التجريبية:</span>
              </span>
              <span className="text-[10px] text-[#64748B]">للاختبار والمراجعة</span>
            </div>

            <div className="space-y-1.5">
              {availableSeedUsers.map((u) => {
                const isSelected = currentUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      switchUserPersona(u.id);
                      onClose();
                    }}
                    className={`w-full text-right p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0F172A] text-white border-[#0F172A] font-bold shadow-xs'
                        : 'bg-white text-[#1A2B3C] border-[#E2E8F0] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div>
                      <p className="font-bold">{u.fullName}</p>
                      <p className="text-[10px] opacity-75 font-mono">{u.phone}</p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isSelected ? 'bg-[#F27D26] text-white' : 'bg-slate-100 text-[#64748B]'
                      }`}
                    >
                      {u.role === 'admin' ? 'مدير' : u.role === 'moderator' ? 'مشرف' : 'مواطن'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* New Login Form if user wants to enter custom phone */}
          {!currentUser && (
            <div className="space-y-4 pt-2 border-t border-[#E2E8F0]">
              <h4 className="text-xs font-bold text-[#0F172A]">أو سجل برقم هاتفك الشخصي:</h4>

              {errorMsg && (
                <div className="p-2.5 bg-red-50 text-red-800 rounded-xl text-xs font-bold border border-red-200">
                  {errorMsg}
                </div>
              )}

              {step === 'phone' ? (
                <form onSubmit={handleSendOtp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#64748B] mb-1">الاسم الكامل</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: خليل إبراهيم نزال"
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#64748B] mb-1">رقم الهاتف المحمول</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0599000000"
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#0F172A]"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-[#F27D26] hover:bg-[#e06b17] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {isSubmitting ? 'جاري الإرسال...' : 'إرسال رمز التحقق (OTP) ↵'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                    رمز التحقق التجريبي هو: <strong className="font-mono text-sm">1234</strong>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#64748B] mb-1">أدخل رمز التحقق (4 أرقام)</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="1234"
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-center text-lg font-mono tracking-widest text-[#0F172A]"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-[#0F172A] hover:bg-[#1e293b] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    تأكيد وتسجيل الدخول
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
