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
        setActionSuccessMessage('تم اعتماد الإعلان بنجاح، ونشره على الموقع، وإرسال الرسالة إلى مجموعة واتساب.');
      } else {
        setActionSuccessMessage(
          'تم نشر الإعلان على الموقع، ولكن تعذر إرسال رسالة WhatsApp. يمكنك إعادة الإرسال لاحقاً من سجل الواتساب.'
        );
      }

      setTimeout(() => {
        onActionComplete();
        onClose();
      }, 1800);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ أثناء الاعتماد');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    if (!currentUser) return;
    if (!rejectReason.trim()) {
      setErrorMsg('يرجى كتابة سبب الرفض');
      return;
    }
    setIsProcessing(true);
    try {
      storage.rejectAnnouncement(announcement.id, currentUser.id, currentUser.fullName, rejectReason.trim());
      setActionSuccessMessage('تم رفض الإعلان وحفظ السبب.');
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

  const handleRequestModification = () => {
    if (!currentUser) return;
    if (!modificationReason.trim()) {
      setErrorMsg('يرجى تحديد التعديل المطلوب من الناشر');
      return;
    }
    setIsProcessing(true);
    try {
      storage.requestModification(
        announcement.id,
        currentUser.id,
        currentUser.fullName,
        modificationReason.trim()
      );
      setActionSuccessMessage('تمت إعادة الإعلان إلى حالة "يحتاج تعديل" وإشعار الناشر.');
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

  const handleMarkStatus = (status: 'completed' | 'expired') => {
    if (!currentUser) return;
    setIsProcessing(true);
    try {
      storage.markStatus(announcement.id, status, currentUser.id, currentUser.fullName);
      setActionSuccessMessage(status === 'completed' ? 'تم تحويل الإعلان إلى مكتمل.' : 'تم تحويل الإعلان إلى منتهي في الأرشيف.');
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">لوحة تدقيق ومراجعة الإعلان</h2>
              <p className="text-xs text-slate-300">
                المشرف: {currentUser?.fullName} • التصنيف: {announcement.category}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer ${
              activeTab === 'actions'
                ? 'border-emerald-600 text-emerald-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ⚖️ قرار المشرف والاعتماد
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('whatsapp_preview')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer ${
              activeTab === 'whatsapp_preview'
                ? 'border-emerald-600 text-emerald-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            💬 معاينة رسالة واتساب
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer ${
              activeTab === 'details'
                ? 'border-emerald-600 text-emerald-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📋 تفاصيل الطلب
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-right space-y-4">
          
          {actionSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{actionSuccessMessage}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-900 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Announcement Summary Header */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-400 block mb-1">عنوان الإعلان المقدم:</span>
            <h3 className="text-base font-bold text-slate-900">{announcement.title}</h3>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              <span>الناشر: {announcement.createdByUserName} ({announcement.createdByUserPhone})</span>
              <span>الحالة الحالية: <strong className="text-slate-800">{announcement.status}</strong></span>
            </div>
          </div>

          {/* TAB 1: ACTIONS */}
          {activeTab === 'actions' && (
            <div className="space-y-5">
              
              {/* Destination group reminder */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2">
                <Send className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">المجموعة المستهدفة للإرسال الفوري:</p>
                  <p className="text-emerald-800">{destination.name} ({destination.id})</p>
                </div>
              </div>

              {/* Primary Action 1: Approve & Publish */}
              <div className="p-4 bg-emerald-900 text-white rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="font-black text-sm">اعتماد ونشر في الموقع وواتساب</span>
                  </div>
                  <span className="text-[10px] bg-emerald-800 px-2 py-0.5 rounded text-emerald-200">
                    نشر فوري + بث WhatsApp
                  </span>
                </div>
                <p className="text-xs text-emerald-100">
                  بمجرد الضغط على اعتماد، سيُنشر الإعلان على منصة بوق البلد وسيتم إرسال الرسالة الكاملة فوراً إلى مجموعة واتساب المخصصة لقلقيلية.
                </p>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isProcessing ? 'جاري الاعتماد والإرسال...' : 'اعتماد ونشر الإعلان الآن'}</span>
                </button>
              </div>

              {/* Secondary Action 2: Request Modification */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  طلب تعديل من صاحب الإعلان
                </label>
                <input
                  type="text"
                  value={modificationReason}
                  onChange={(e) => setModificationReason(e.target.value)}
                  placeholder="مثال: يرجى تحديد وقت صلاة الجنازة بدقة أو تعديل اسم القاعة..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleRequestModification}
                  disabled={isProcessing || !modificationReason.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  إرسال طلب التعديل
                </button>
              </div>

              {/* Action 3: Reject */}
              <div className="p-4 bg-red-50/60 border border-red-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-red-900">
                  رفض الإعلان
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="مثال: إعلان تجاري غير مسموح به أو بيانات غير موثقة..."
                  className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isProcessing || !rejectReason.trim()}
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  رفض الإعلان وحفظ السبب
                </button>
              </div>

              {/* Action 4: Archive / Mark Completed */}
              {announcement.status === 'published' && (
                <div className="flex gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => handleMarkStatus('completed')}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تحويل إلى مكتمل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkStatus('expired')}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>نقل للأرشيف (منتهي)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WHATSAPP MESSAGE PREVIEW */}
          {activeTab === 'whatsapp_preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>معاينة دقيقة لرسالة واتساب كما ستصل للمواطنين:</span>
                <span className="font-semibold text-emerald-800">المجموعة: {destination.name}</span>
              </div>

              {/* WhatsApp styled chat bubble */}
              <div className="bg-[#e5ddd5] p-4 rounded-2xl shadow-inner border border-slate-300 max-h-[350px] overflow-y-auto">
                <div className="bg-white rounded-xl p-3.5 shadow-xs max-w-lg mr-auto text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-200 text-slate-800">
                  {whatsappPreview}
                  <div className="text-[10px] text-slate-400 text-left mt-2 flex items-center justify-end gap-1">
                    <span>{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-emerald-500 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-3 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <p><strong>التصنيف:</strong> {announcement.category}</p>
                <p><strong>تاريخ التقديم:</strong> {new Date(announcement.createdAt).toLocaleString('ar-EG')}</p>
                <p><strong>صاحب الطلب:</strong> {announcement.createdByUserName} ({announcement.createdByUserPhone})</p>
                <p><strong>جهة التواصل:</strong> {announcement.contact.name} - {announcement.contact.phone}</p>
              </div>

              {announcement.tarhaDetails && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <p><strong>المتوفى:</strong> {announcement.tarhaDetails.deceasedName}</p>
                  <p><strong>المسجد:</strong> {announcement.tarhaDetails.mosqueName} ({announcement.tarhaDetails.prayerTime})</p>
                  <p><strong>المقبرة:</strong> {announcement.tarhaDetails.cemeteryName}</p>
                  <p><strong>مكان العزاء:</strong> {announcement.tarhaDetails.condolenceVenue}</p>
                  <p><strong>إقرار المسؤولية:</strong> {announcement.tarhaDetails.declarationConfirmed ? '✓ نعم، تم الإقرار' : '✗ لم يتم'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
