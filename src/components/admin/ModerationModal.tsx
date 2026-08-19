import React, { useState } from 'react';
import { Announcement } from '../../types';
import { StorageService } from '../../services/storage';
import { WhatsAppFormatter } from '../../services/whatsapp/formatter';
import { WhatsAppService } from '../../services/whatsapp/whatsappService';
import { useAuth } from '../../services/authContext';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  MessageSquare,
  Sparkles,
  MapPin,
  Clock,
  Calendar,
  Eye,
  RefreshCw,
  Archive,
} from 'lucide-react';

interface ModerationModalProps {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
  onActionComplete: () => void;
}

export const ModerationModal: React.FC<ModerationModalProps> = ({
  announcement,
  isOpen,
  onClose,
  onActionComplete,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'whatsapp_preview' | 'actions'>('actions');
  const [rejectReason, setRejectReason] = useState('');
  const [modificationReason, setModificationReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !announcement) return null;

  const storage = StorageService.getInstance();
  const waService = WhatsAppService.getInstance();
  const waConfig = waService.getConfig();
  const destination = waService.getDestinationForCategory(announcement.category);
  const whatsappPreview = WhatsAppFormatter.formatMessage(announcement);

  const handleApprove = async () => {
    if (!currentUser) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const result = await storage.approveAndPublishAnnouncement(
        announcement.id,
        currentUser.id,
        currentUser.fullName
      );

      if (result.whatsappSuccess) {
        if (waConfig.mode === 'mock') {
          setActionSuccessMessage(
            'تم اعتماد الإعلان ونشره على الموقع بنجاح. (ملاحظة: وضع المحاكاة التجريبي — تم تسجيل محاكاة البث في سجل WhatsApp).'
          );
        } else {
          setActionSuccessMessage(
            'تم اعتماد الإعلان ونشره على الموقع، وتم إرسال الرسالة بنجاح عبر Meta WhatsApp API إلى المجموعة الرسمية.'
          );
        }
      } else {
        setActionSuccessMessage(
          `تم نشر الإعلان على الموقع بأمان. تنبيه WhatsApp: ${
            result.whatsappError || 'تكامل WhatsApp الإنتاجي غير مهيأ بعد.'
          }`
        );
      }

      setTimeout(() => {
        onActionComplete();
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ أثناء الاعتماد');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!currentUser) return;
    if (!rejectReason.trim()) {
      setErrorMsg('يرجى كتابة سبب الرفض');
      return;
    }
    setIsProcessing(true);
    try {
      await storage.rejectAnnouncement(
        announcement.id,
        currentUser.id,
        currentUser.fullName,
        rejectReason.trim()
      );
      setActionSuccessMessage('تم رفض الإعلان وتوثيق السبب في السجل الرقابي.');
      setTimeout(() => {
        onActionComplete();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ أثناء الرفض');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestModification = async () => {
    if (!currentUser) return;
    if (!modificationReason.trim()) {
      setErrorMsg('يرجى تحديد التعديل المطلوب من صاحب الإعلان');
      return;
    }
    setIsProcessing(true);
    try {
      await storage.requestModification(
        announcement.id,
        currentUser.id,
        currentUser.fullName,
        modificationReason.trim()
      );
      setActionSuccessMessage('تمت إعادة الإعلان إلى حالة "يحتاج تعديل" وتوثيق الملاحظات.');
      setTimeout(() => {
        onActionComplete();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ أثناء طلب التعديل');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkStatus = async (status: 'completed' | 'expired') => {
    if (!currentUser) return;
    setIsProcessing(true);
    try {
      await storage.markStatus(announcement.id, status, currentUser.id, currentUser.fullName);
      setActionSuccessMessage(
        status === 'completed' ? 'تم تحويل الإعلان إلى مكتمل.' : 'تم تحويل الإعلان إلى منتهي في الأرشيف.'
      );
      setTimeout(() => {
        onActionComplete();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0F172A]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 text-right">
      <div className="bg-white rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-[#E2E8F0] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#0F172A] text-white">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#F27D26]" />
            <div>
              <h2 className="text-base font-black text-white">لوحة تدقيق ومراجعة الإعلان</h2>
              <p className="text-xs text-white/70">
                المشرف: {currentUser?.fullName} • التصنيف: {announcement.category}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Status Messages */}
        {actionSuccessMessage && (
          <div className="p-3.5 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Navigation Tabs inside modal */}
        <div className="flex border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'actions'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>إجراءات المشرف</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp_preview')}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'whatsapp_preview'
                ? 'border-[#10B981] text-[#10B981]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>معاينة رسالة WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-[#0F172A] text-[#0F172A]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>تفاصيل الطلب الكاملة</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: ACTIONS */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              {/* Main Primary Action: Approve */}
              {announcement.status !== 'published' ? (
                <div className="p-4 sm:p-5 bg-emerald-950 text-white rounded-2xl space-y-3 shadow-sm border border-emerald-800/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="font-black text-sm">اعتماد ونشر في الموقع وواتساب</span>
                    </div>
                    <span className="text-[10px] bg-emerald-800/80 px-2.5 py-1 rounded-lg text-emerald-200 font-mono">
                      {waConfig.mode === 'mock' ? 'Mock Mode' : 'Meta Production'}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/90 leading-relaxed">
                    بمجرد الضغط على اعتماد، سيُنشر الإعلان على منصة "بوق البلد" لقلقيلية وسيتم إرسال الرسالة إلى المجموعة الرسمية: <strong>{destination.name}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="w-full py-3 bg-[#F27D26] hover:bg-[#D96818] text-white rounded-xl text-xs font-black shadow transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{isProcessing ? 'جاري الاعتماد والإرسال...' : 'اعتماد ونشر الإعلان الآن'}</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">حالة النشر والبث:</span>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                      منشور على الموقع ✓
                    </span>
                  </div>
                  {announcement.whatsappDeliveryStatus === 'failed' && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                      <p className="text-xs text-rose-800 font-medium">
                        ⚠️ فشل إرسال رسالة الواتساب السابقة: {announcement.whatsappError || 'لم يتم التسليم'}
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!currentUser) return;
                          setIsProcessing(true);
                          setErrorMsg(null);
                          const res = await storage.retryWhatsAppDelivery(announcement.id, currentUser.id, currentUser.fullName);
                          setIsProcessing(false);
                          if (res.success) {
                            setActionSuccessMessage('تمت إعادة إرسال رسالة الواتساب بنجاح!');
                          } else {
                            setErrorMsg(res.error || 'تعذرت إعادة الإرسال');
                          }
                        }}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                        <span>إعادة محاولة إرسال واتساب</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Action 2: Request Modification */}
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-[#0F172A]">
                  طلب تعديل من صاحب الإعلان
                </label>
                <input
                  type="text"
                  value={modificationReason}
                  onChange={(e) => setModificationReason(e.target.value)}
                  placeholder="مثال: يرجى تحديد وقت صلاة الجنازة بدقة أو تعديل اسم القاعة..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-xl text-xs outline-none focus:border-[#F27D26]"
                />
                <button
                  type="button"
                  onClick={handleRequestModification}
                  disabled={isProcessing || !modificationReason.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  إرسال طلب التعديل
                </button>
              </div>

              {/* Action 3: Reject */}
              <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-rose-900">
                  رفض الإعلان
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="مثال: إعلان تجاري غير مسموح به أو بيانات غير موثقة..."
                  className="w-full px-3.5 py-2.5 bg-white border border-rose-300 rounded-xl text-xs outline-none focus:border-rose-500"
                />
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isProcessing || !rejectReason.trim()}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  رفض الإعلان وحفظ السبب
                </button>
              </div>

              {/* Action 4: Archive / Mark Completed */}
              {announcement.status === 'published' && (
                <div className="flex gap-2 pt-2 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => handleMarkStatus('completed')}
                    className="flex-1 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] rounded-xl text-xs font-bold border border-[#E2E8F0] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تحويل إلى مكتمل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkStatus('expired')}
                    className="flex-1 py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] rounded-xl text-xs font-bold border border-[#E2E8F0] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>نقل للأرشيف (منتهي)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WHATSAPP MESSAGE PREVIEW */}
          {activeTab === 'whatsapp_preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>معاينة دقيقة لرسالة واتساب كما ستصل للمواطنين:</span>
                <span className="font-bold text-emerald-800">المجموعة: {destination.name}</span>
              </div>

              {/* WhatsApp styled chat bubble */}
              <div className="bg-[#e5ddd5] p-4 rounded-2xl shadow-inner border border-[#CBD5E1] max-h-[350px] overflow-y-auto">
                <div className="bg-white rounded-xl p-3.5 shadow-xs max-w-lg mr-auto text-xs font-mono whitespace-pre-wrap leading-relaxed border border-[#E2E8F0] text-[#0F172A]">
                  {whatsappPreview}
                  <div className="text-[10px] text-[#64748B] text-left mt-2 flex items-center justify-end gap-1">
                    <span>{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-emerald-500 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-3 text-xs text-[#334155]">
              <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0] space-y-1.5">
                <p><strong>العنوان:</strong> {announcement.title}</p>
                <p><strong>التصنيف:</strong> {announcement.category}</p>
                <p><strong>تاريخ التقديم:</strong> {new Date(announcement.createdAt).toLocaleString('ar-EG')}</p>
                <p><strong>صاحب الطلب:</strong> {announcement.createdByUserName} ({announcement.createdByUserPhone})</p>
                <p><strong>جهة التواصل:</strong> {announcement.contact.name} - {announcement.contact.phone}</p>
              </div>

              {announcement.tarhaDetails && (
                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-1.5">
                  <p><strong>اسم المتوفى:</strong> {announcement.tarhaDetails.deceasedName}</p>
                  <p><strong>المسجد وموقع الصلاة:</strong> {announcement.tarhaDetails.mosqueName} ({announcement.tarhaDetails.prayerTime})</p>
                  <p><strong>المقبرة:</strong> {announcement.tarhaDetails.cemeteryName}</p>
                  <p><strong>مكان التعازي:</strong> {announcement.tarhaDetails.condolenceVenue}</p>
                  <p><strong>المدة والساعات:</strong> {announcement.tarhaDetails.condolenceDuration} - {announcement.tarhaDetails.condolenceHours}</p>
                  <p><strong>إقرار المسؤولية:</strong> {announcement.tarhaDetails.declarationConfirmed ? '✓ نعم، تم الإقرار' : '✗ لم يتم'}</p>
                </div>
              )}

              {announcement.farhaDetails && (
                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-1.5">
                  <p><strong>نوع المناسبة:</strong> {announcement.farhaDetails.occasionType}</p>
                  <p><strong>أسماء أصحاب المناسبة:</strong> {announcement.farhaDetails.honorees}</p>
                  <p><strong>التاريخ والوقت:</strong> {announcement.farhaDetails.date} ({announcement.farhaDetails.time})</p>
                  <p><strong>المكان:</strong> {announcement.farhaDetails.venueName}</p>
                </div>
              )}

              {announcement.fazaaDetails && (
                <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] space-y-1.5">
                  <p><strong>نوع الفزعة:</strong> {announcement.fazaaDetails.fazaaType}</p>
                  <p><strong>درجة الاستعجال:</strong> {announcement.fazaaDetails.urgency}</p>
                  <p><strong>الجهة / الشخص المحتاج:</strong> {announcement.fazaaDetails.targetPersonOrEntity}</p>
                  <p><strong>المكان / المستشفى:</strong> {announcement.fazaaDetails.facilityOrLocationName}</p>
                  {announcement.fazaaDetails.bloodType && (
                    <p><strong>فصيلة الدم المطلوبة:</strong> {announcement.fazaaDetails.bloodType} ({announcement.fazaaDetails.unitsNeeded || 1} وحدات)</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#E2E8F0] hover:bg-[#CBD5E1] text-[#0F172A] rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
