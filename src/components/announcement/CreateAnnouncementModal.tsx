import React, { useState } from 'react';
import { CategoryType, ContactInfo, FarhaDetails, FazaaDetails, TarhaDetails } from '../../types';
import { useAuth } from '../../services/authContext';
import { StorageService } from '../../services/storage';
import { FarhaForm } from './FarhaForm';
import { TarhaForm } from './TarhaForm';
import { FazaaForm } from './FazaaForm';
import { Sparkles, HeartHandshake, Flame, CheckCircle2, ShieldCheck, X, ArrowRight, UserCheck, KeyRound } from 'lucide-react';
import { AuthModal } from '../auth/AuthModal';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: CategoryType;
  onAnnouncementCreated: () => void;
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  isOpen,
  onClose,
  initialCategory,
  onAnnouncementCreated,
}) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [category, setCategory] = useState<CategoryType | null>(initialCategory || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{ id: string; title: string; category: CategoryType } | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  if (!isOpen) return null;

  const handleFormSubmit = async (data: {
    title: string;
    details: FarhaDetails | TarhaDetails | FazaaDetails;
    contact: ContactInfo;
  }) => {
    if (!category) return;
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setIsSubmitting(true);

    try {
      const storage = StorageService.getInstance();
      const newAnn = await storage.createAnnouncement({
        category,
        title: data.title,
        city: 'قلقيلية',
        createdByUserId: currentUser.id,
        createdByUserName: currentUser.fullName,
        createdByUserPhone: currentUser.phone,
        contact: data.contact,
        farhaDetails: category === 'farha' ? (data.details as FarhaDetails) : undefined,
        tarhaDetails: category === 'tarha' ? (data.details as TarhaDetails) : undefined,
        fazaaDetails: category === 'fazaa' ? (data.details as FazaaDetails) : undefined,
      });

      setSuccessResult({
        id: newAnn.id,
        title: newAnn.title,
        category: newAnn.category,
      });
      onAnnouncementCreated();
    } catch (err) {
      console.error('Failed to submit announcement', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSuccessResult(null);
    setCategory(initialCategory || null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 text-right">
      <div className="bg-white rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-[#E2E8F0] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            {category && !successResult && (
              <button
                type="button"
                onClick={() => setCategory(null)}
                className="p-1.5 hover:bg-black/5 rounded-lg text-[#64748B] transition-colors ml-1 cursor-pointer"
                title="الرجوع لاختيار التصنيف"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">
                {successResult ? 'تم استلام الإعلان' : category ? 'تفاصيل الإعلان' : 'إضافة إعلان جديد في بوق البلد'}
              </h2>
              <p className="text-xs text-[#64748B]">
                {successResult
                  ? 'طلبك الآن قيد المراجعة والتدقيق'
                  : category
                  ? 'املأ النموذج بالمعلومات الدقيقة'
                  : 'اختر تصنيفاً واحداً لإعلانك (أفراحنا • أتراحنا • فزعتنا)'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#64748B] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {successResult ? (
            /* Success confirmation screen */
            <div className="text-center py-6 sm:py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <span className="inline-block px-3 py-1 bg-[#F27D26]/10 text-[#F27D26] rounded-full text-xs font-bold border border-[#F27D26]/20">
                  الحالة: قيد المراجعة ⏳
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#0F172A] pt-2">
                  تم تقديم إعلانك بنجاح!
                </h3>
                <p className="text-sm font-semibold text-[#0F172A] max-w-md mx-auto">
                  "{successResult.title}"
                </p>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 max-w-md mx-auto text-right text-xs text-[#64748B] space-y-2">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#10B981] mt-0.5 shrink-0" />
                  <p>
                    <strong className="text-[#0F172A]">خطوة المراجعة والتدقيق:</strong> يقوم مشرفو بوق البلد بمراجعة الإعلان والتأكد من البيانات قبل اعتماده.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#10B981] text-sm font-bold">✓</span>
                  <p>
                    <strong className="text-[#0F172A]">البث الفوري:</strong> فور الاعتماد، سيُنشر الإعلان على موقع بوق البلد وسيتم إرسال رسالة واتساب كاملة إلى المجموعة المخصصة لقلقيلية.
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-6 py-2.5 bg-[#0F172A] hover:bg-[#1e293b] text-white rounded-xl text-sm font-bold shadow-xs transition-all cursor-pointer"
                >
                  العودة للرئيسية ومتابعة الإعلانات
                </button>
              </div>
            </div>
          ) : !currentUser ? (
            /* Prompt user to authenticate first */
            <div className="text-center py-6 sm:py-8 space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <UserCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-[#0F172A]">تسجيل الدخول مطلوب لنشر الإعلانات</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                للحفاظ على مصداقية المنصة وحماية المجتمع من الإعلانات الوهمية، يرجى تسجيل الدخول بواسطة رقم هاتفك المحمول.
              </p>
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="w-full py-3 bg-[#F27D26] hover:bg-[#D96818] text-white font-bold rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                <KeyRound className="w-4 h-4" />
                <span>تسجيل الدخول عبر رقم الهاتف</span>
              </button>
            </div>
          ) : !category ? (
            /* Step 1: Category Selector (3 Choices only) */
            <div className="space-y-4 py-2">
              <div className="text-center mb-6">
                <h3 className="text-base font-black text-[#0F172A]">
                  ما هو تصنيف إعلانك؟
                </h3>
                <p className="text-xs text-[#64748B] mt-1">
                  اختر أحد التصنيفات المعتمدة حصراً لقلقيلية
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {/* 1. Farha */}
                <button
                  type="button"
                  onClick={() => setCategory('farha')}
                  className="group p-4 bg-white hover:bg-[#10B981]/5 border-2 border-[#E2E8F0] hover:border-[#10B981] rounded-2xl text-right flex items-center justify-between transition-all shadow-xs hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#10B981] text-white flex items-center justify-center font-black text-xl shadow-xs group-hover:scale-105 transition-transform">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-[#0F172A]">1. فرحة</span>
                        <span className="text-[11px] bg-[#10B981]/10 text-[#10B981] font-bold px-2 py-0.5 rounded-full">
                          أفراح وتهاني
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        زفاف، خطوبة، مولود جديد، تخرج، نجاح، ودعوات عامة
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#10B981] bg-[#10B981]/10 px-3 py-1 rounded-xl group-hover:bg-[#10B981] group-hover:text-white transition-colors">
                    اختيار ↵
                  </span>
                </button>

                {/* 2. Tarha */}
                <button
                  type="button"
                  onClick={() => setCategory('tarha')}
                  className="group p-4 bg-white hover:bg-[#7B1D21]/5 border-2 border-[#E2E8F0] hover:border-[#7B1D21] rounded-2xl text-right flex items-center justify-between transition-all shadow-xs hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#7B1D21] text-white flex items-center justify-center font-black text-xl shadow-xs group-hover:scale-105 transition-transform">
                      <HeartHandshake className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-[#0F172A]">2. ترحة</span>
                        <span className="text-[11px] bg-[#7B1D21]/10 text-[#7B1D21] font-bold px-2 py-0.5 rounded-full">
                          وفيات وتعازي
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        وفيات، مواعيد صلاة الجنازة والدفن، وبيوت العزاء في قلقيلية
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#7B1D21] bg-[#7B1D21]/10 px-3 py-1 rounded-xl group-hover:bg-[#7B1D21] group-hover:text-white transition-colors">
                    اختيار ↵
                  </span>
                </button>

                {/* 3. Fazaa */}
                <button
                  type="button"
                  onClick={() => setCategory('fazaa')}
                  className="group p-4 bg-white hover:bg-[#EF4444]/5 border-2 border-[#E2E8F0] hover:border-[#EF4444] rounded-2xl text-right flex items-center justify-between transition-all shadow-xs hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#EF4444] text-white flex items-center justify-center font-black text-xl shadow-xs group-hover:scale-105 transition-transform">
                      <Flame className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-[#0F172A]">3. فزعة</span>
                        <span className="text-[11px] bg-[#EF4444]/10 text-[#EF4444] font-bold px-2 py-0.5 rounded-full">
                          مساندة وإغاثة طارئة
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        تبرع بالدم، جاهات وصلح عشائري، إغاثة طارئة، وبحث عن مفقودين
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#EF4444] bg-[#EF4444]/10 px-3 py-1 rounded-xl group-hover:bg-[#EF4444] group-hover:text-white transition-colors">
                    اختيار ↵
                  </span>
                </button>
              </div>

              {currentUser && (
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] text-center text-xs text-[#64748B]">
                  الناشر المسجل: <span className="font-semibold text-[#0F172A]">{currentUser.fullName}</span> ({currentUser.phone || 'حساب مفعل'})
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Category Specific Form */
            <div>
              {category === 'farha' && (
                <FarhaForm
                  onSubmit={handleFormSubmit}
                  onCancel={() => setCategory(null)}
                  isSubmitting={isSubmitting}
                  initialContact={{
                    name: currentUser?.fullName || '',
                    phone: currentUser?.phone || '',
                    whatsappPhone: currentUser?.phone || '',
                    allowCalls: true,
                    allowWhatsapp: true,
                  }}
                />
              )}
              {category === 'tarha' && (
                <TarhaForm
                  onSubmit={handleFormSubmit}
                  onCancel={() => setCategory(null)}
                  isSubmitting={isSubmitting}
                  initialContact={{
                    name: currentUser?.fullName || '',
                    phone: currentUser?.phone || '',
                    whatsappPhone: currentUser?.phone || '',
                    allowCalls: true,
                    allowWhatsapp: true,
                  }}
                />
              )}
              {category === 'fazaa' && (
                <FazaaForm
                  onSubmit={handleFormSubmit}
                  onCancel={() => setCategory(null)}
                  isSubmitting={isSubmitting}
                  initialContact={{
                    name: currentUser?.fullName || '',
                    phone: currentUser?.phone || '',
                    whatsappPhone: currentUser?.phone || '',
                    allowCalls: true,
                    allowWhatsapp: true,
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {isAuthOpen && (
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      )}
    </div>
  );
};
