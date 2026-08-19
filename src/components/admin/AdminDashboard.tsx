import React, { useState } from 'react';
import { Announcement, AnnouncementStatus, CategoryType, WhatsAppConfig } from '../../types';
import { StorageService } from '../../services/storage';
import { WhatsAppService } from '../../services/whatsapp/whatsappService';
import { useAuth } from '../../services/authContext';
import { ModerationModal } from './ModerationModal';
import {
  LayoutDashboard,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  MessageSquare,
  Settings,
  Users,
  ShieldCheck,
  Send,
  RefreshCw,
  AlertTriangle,
  Flame,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  RotateCcw,
  Search,
  Filter,
} from 'lucide-react';

type AdminTab =
  | 'overview'
  | 'pending'
  | 'published'
  | 'completed'
  | 'rejected'
  | 'whatsapp_logs'
  | 'whatsapp_settings'
  | 'users'
  | 'audit';

interface AdminDashboardProps {
  onSelectAnnouncement: (announcement: Announcement) => void;
  onRefreshData?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSelectAnnouncement,
  onRefreshData,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('pending');
  const [selectedForModeration, setSelectedForModeration] = useState<Announcement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [testNumberInput, setTestNumberInput] = useState('+962788019331');
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);
  const [resetConfirmed, setResetConfirmed] = useState(false);

  const storage = StorageService.getInstance();
  const waService = WhatsAppService.getInstance();

  const announcements = storage.getAnnouncements();
  const users = storage.getUsers();
  const auditLogs = storage.getAuditLogs();
  const waLogs = waService.getDeliveryLogs();
  const waConfig = waService.getConfig();
  const stats = storage.getStatistics();

  const [editableConfig, setEditableConfig] = useState<WhatsAppConfig>(waConfig);

  const filterList = (statusList: AnnouncementStatus[]) => {
    return announcements
      .filter((a) => statusList.includes(a.status))
      .filter((a) => {
        if (!searchTerm.trim()) return true;
        return (
          a.title.includes(searchTerm) ||
          a.createdByUserName.includes(searchTerm) ||
          a.category.includes(searchTerm)
        );
      });
  };

  const pendingList = filterList(['pending_review', 'needs_modification']);
  const publishedList = filterList(['published']);
  const completedList = filterList(['completed', 'expired']);
  const rejectedList = filterList(['rejected']);

  const handleTestWhatsAppPing = async () => {
    setIsTestingWhatsApp(true);
    setTestResult(null);
    try {
      const res = await waService.sendTestMessage(testNumberInput);
      setTestResult({
        success: true,
        msg: `تم إرسال رسالة الاختبار بنجاح إلى الرقم: ${testNumberInput}`,
      });
    } catch (err: unknown) {
      setTestResult({
        success: false,
        msg: err instanceof Error ? err.message : 'فشل إرسال رسالة الاختبار',
      });
    } finally {
      setIsTestingWhatsApp(false);
    }
  };

  const handleSaveWhatsAppConfig = () => {
    waService.saveConfig(editableConfig);
    alert('تم حفظ إعدادات مجموعات واتساب بنجاح.');
  };

  const handleResetData = () => {
    storage.resetToSeedData();
    setResetConfirmed(true);
    if (onRefreshData) onRefreshData();
    setTimeout(() => setResetConfirmed(false), 3000);
  };

  return (
    <div className="space-y-6 text-right">
      
      {/* Top Banner */}
      <div className="bg-[#0F172A] text-white p-6 sm:p-7 rounded-[32px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md border border-white/10 relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-[#F27D26]/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F27D26] text-white flex items-center justify-center font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black">لوحة إدارة وإشراف "بوق البلد"</h1>
              <p className="text-xs text-white/70 mt-0.5">
                إدارة تدقيق الإعلانات • التحكم في بث WhatsApp • مراجعة الطلبات لمدينة قلقيلية
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          <button
            type="button"
            onClick={handleResetData}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            title="إعادة تعيين البيانات الافتراضية"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#F27D26]" />
            <span>{resetConfirmed ? 'تمت استعادة البيانات!' : 'استعادة بيانات العرض'}</span>
          </button>
        </div>
      </div>

      {/* STATISTICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div
          onClick={() => setActiveTab('overview')}
          className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs cursor-pointer hover:border-[#0F172A] transition-colors"
        >
          <span className="text-[11px] font-bold text-[#64748B] block">إجمالي الإعلانات</span>
          <span className="text-xl font-black text-[#0F172A]">{stats.total}</span>
        </div>

        <div
          onClick={() => setActiveTab('pending')}
          className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs cursor-pointer hover:border-[#F27D26] transition-colors relative"
        >
          <span className="text-[11px] font-bold text-[#F27D26] block">قيد المراجعة ⏳</span>
          <span className="text-xl font-black text-[#F27D26]">{stats.pendingCount}</span>
          {stats.pendingCount > 0 && (
            <span className="absolute top-2 left-2 w-2.5 h-2.5 bg-[#EF4444] rounded-full animate-ping" />
          )}
        </div>

        <div
          onClick={() => setActiveTab('published')}
          className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs cursor-pointer hover:border-[#10B981] transition-colors"
        >
          <span className="text-[11px] font-bold text-[#10B981] block">المنشورة بالموقع ✓</span>
          <span className="text-xl font-black text-[#10B981]">{stats.publishedCount}</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#10B981] transition-colors">
          <span className="text-[11px] font-bold text-[#10B981] block">🟢 أفراحنا (فرحة)</span>
          <span className="text-xl font-black text-[#10B981]">{stats.farhaCount}</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#7B1D21] transition-colors">
          <span className="text-[11px] font-bold text-[#7B1D21] block">⚫ أتراحنا (ترحة)</span>
          <span className="text-xl font-black text-[#7B1D21]">{stats.tarhaCount}</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#EF4444] transition-colors">
          <span className="text-[11px] font-bold text-[#EF4444] block">🔴 فزعتنا (فزعة)</span>
          <span className="text-xl font-black text-[#EF4444]">{stats.fazaaCount}</span>
        </div>

        <div className="bg-red-50/50 p-3.5 rounded-2xl border border-red-200 shadow-xs">
          <span className="text-[11px] font-bold text-[#EF4444] block">🚨 فزعات عاجلة</span>
          <span className="text-xl font-black text-[#EF4444]">{stats.urgentFazaaCount}</span>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#E2E8F0]">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-[#F27D26] text-white shadow-xs'
              : 'bg-white text-[#1A2B3C] border border-[#E2E8F0] hover:bg-black/5'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>طلبات قيد المراجعة ({pendingList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('published')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'published'
              ? 'bg-[#0F172A] text-white shadow-xs'
              : 'bg-white text-[#1A2B3C] border border-[#E2E8F0] hover:bg-black/5'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>المنشورة ({publishedList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('whatsapp_logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'whatsapp_logs'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>سجل WhatsApp والبث ({waLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('whatsapp_settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'whatsapp_settings'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>إعدادات مجموعات WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'completed'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>المنتهية والمكتملة ({completedList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'rejected'
              ? 'bg-red-700 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>المرفوضة ({rejectedList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>سجل الرقابة ({auditLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>المستخدمون ({users.length})</span>
        </button>
      </div>

      {/* TAB 1: PENDING REVIEW QUEUE */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-slate-900">
              إعلانات بانتظار قرار المشرف ({pendingList.length})
            </h2>
            <div className="w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في الطلبات..."
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {pendingList.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-800">لا توجد إعلانات معلقة قيد المراجعة حالياً!</p>
              <p className="text-xs mt-1">جميع الطلبات المقدمة تمت مراجعتها واعتمادها.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pendingList.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-amber-300/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-100 text-amber-900">
                        {ann.category === 'farha' ? '🟢 فرحة' : ann.category === 'tarha' ? '⚫ ترحة' : '🔴 فزعة'}
                      </span>
                      <span className="text-xs text-slate-400">
                        قُدّم بتاريخ: {new Date(ann.createdAt).toLocaleString('ar-EG')}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900">{ann.title}</h3>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                      <span>الناشر: <strong>{ann.createdByUserName}</strong> ({ann.createdByUserPhone})</span>
                      <span>•</span>
                      <span>جهة التواصل: {ann.contact.name} ({ann.contact.phone})</span>
                    </div>

                    {ann.moderationReason && (
                      <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        ملاحظة المشرف السابقة: {ann.moderationReason}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedForModeration(ann)}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>تدقيق واتخاذ القرار</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PUBLISHED ANNOUNCEMENTS */}
      {activeTab === 'published' && (
        <div className="space-y-4">
          <h2 className="font-bold text-base text-slate-900">
            الإعلانات المنشورة حالياً في بوق البلد ({publishedList.length})
          </h2>

          <div className="grid grid-cols-1 gap-3">
            {publishedList.map((ann) => (
              <div
                key={ann.id}
                className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800">
                      {ann.category === 'farha' ? '🟢 فرحة' : ann.category === 'tarha' ? '⚫ ترحة' : '🔴 فزعة'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      نُشر: {new Date(ann.publishedAt || ann.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                      تم البث في WhatsApp ✓
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">{ann.title}</h4>
                  <p className="text-xs text-slate-500">المشرف المعتمد: {ann.moderatorName || 'مشرف النظام'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectAnnouncement(ann)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    عرض التفاصيل
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedForModeration(ann)}
                    className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    تعديل / إنهاء
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: WHATSAPP LOGS & SIMULATOR */}
      {activeTab === 'whatsapp_logs' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-700" />
                <span>نظام التوزيع والبث التلقائي عبر WhatsApp</span>
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                الوضع الحالي: <strong className="font-mono">{waConfig.mode === 'mock' ? 'MOCK SIMULATION (تجريبي محاكى)' : 'PRODUCTION META CLOUD API'}</strong> • إجمالي الرسائل المسجلة: {waLogs.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() => waService.clearLogs()}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer"
            >
              مسح السجل
            </button>
          </div>

          {waLogs.length === 0 ? (
            <div className="p-8 text-center bg-white border rounded-2xl text-xs text-slate-500">
              لا توجد رسائل واتساب مسجلة حتى الآن.
            </div>
          ) : (
            <div className="space-y-3">
              {waLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded">
                        {log.groupName}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString('ar-EG')}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        log.status === 'delivered' || log.status === 'simulated'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {log.status === 'simulated' ? 'محاكاة ناجحة ✓' : log.status === 'delivered' ? 'تم التسليم ✓' : 'فشل الإرسال ✗'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto text-slate-800">
                    {log.messageBody}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: WHATSAPP CONFIGURATION & THREE GROUPS */}
      {activeTab === 'whatsapp_settings' && (
        <div className="space-y-5">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b pb-2">
              إعدادات مجموعات WhatsApp الثلاث المخصصة
            </h3>
            <p className="text-xs text-slate-600">
              لكل تصنيف مجموعة واتساب واحدة فقط معتمدة. عند اعتماد أي إعلان، يرسل النظام الرسالة الكاملة إلى المجموعة المناسبة مباشرة.
            </p>

            {/* Mode selector */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">وضع الإرسال (WhatsApp Mode)</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="wa_mode"
                    checked={editableConfig.mode === 'mock'}
                    onChange={() => setEditableConfig({ ...editableConfig, mode: 'mock' })}
                    className="text-emerald-600"
                  />
                  <span>MOCK (محاكاة داخلية آمنة بدون Meta API)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="wa_mode"
                    checked={editableConfig.mode === 'production'}
                    onChange={() => setEditableConfig({ ...editableConfig, mode: 'production' })}
                    className="text-emerald-600"
                  />
                  <span>Production (Meta WhatsApp Cloud API)</span>
                </label>
              </div>
            </div>

            {/* Test number */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                رقم الاختبار الافتراضي (Test WhatsApp Number)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testNumberInput}
                  onChange={(e) => setTestNumberInput(e.target.value)}
                  placeholder="+962788019331"
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestWhatsAppPing}
                  disabled={isTestingWhatsApp}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isTestingWhatsApp ? 'جاري الإرسال...' : 'إرسال رسالة اختبار'}</span>
                </button>
              </div>
              {testResult && (
                <p className={`text-xs font-bold ${testResult.success ? 'text-emerald-700' : 'text-red-600'}`}>
                  {testResult.msg}
                </p>
              )}
            </div>

            {/* Group 1: Farha */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
              <span className="text-xs font-black text-emerald-950 block">1. مجموعة واتساب لأخبار الفرح (فرحة)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">اسم المجموعة</label>
                  <input
                    type="text"
                    value={editableConfig.groups.farha.name}
                    onChange={(e) =>
                      setEditableConfig({
                        ...editableConfig,
                        groups: {
                          ...editableConfig.groups,
                          farha: { ...editableConfig.groups.farha, name: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">معرّف المجموعة (Group ID)</label>
                  <input
                    type="text"
                    value={editableConfig.groups.farha.id}
                    onChange={(e) =>
                      setEditableConfig({
                        ...editableConfig,
                        groups: {
                          ...editableConfig.groups,
                          farha: { ...editableConfig.groups.farha, id: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white border rounded text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Group 2: Tarha */}
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-2">
              <span className="text-xs font-black text-slate-900 block">2. مجموعة واتساب للوفيات والتعازي (ترحة)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">اسم المجموعة</label>
                  <input
                    type="text"
                    value={editableConfig.groups.tarha.name}
                    onChange={(e) =>
                      setEditableConfig({
                        ...editableConfig,
                        groups: {
                          ...editableConfig.groups,
                          tarha: { ...editableConfig.groups.tarha, name: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">معرّف المجموعة (Group ID)</label>
                  <input
                    type="text"
                    value={editableConfig.groups.tarha.id}
                    onChange={(e) =>
                      setEditableConfig({
                        ...editableConfig,
                        groups: {
                          ...editableConfig.groups,
                          tarha: { ...editableConfig.groups.tarha, id: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white border rounded text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Group 3: Fazaa */}
            <div className="p-4 bg-red-50/50 border border-red-200 rounded-xl space-y-2">
              <span className="text-xs font-black text-red-950 block">3. مجموعة واتساب للفزعات والنداءات (فزعة)</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">اسم المجموعة</label>
                  <input
                    type="text"
                    value={editableConfig.groups.fazaa.name}
                    onChange={(e) =>
                      setEditableConfig({
                        ...editableConfig,
                        groups: {
                          ...editableConfig.groups,
                          fazaa: { ...editableConfig.groups.fazaa, name: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1">معرّف المجموعة (Group ID)</label>
                  <input
                    type="text"
                    value={editableConfig.groups.fazaa.id}
                    onChange={(e) =>
                      setEditableConfig({
                        ...editableConfig,
                        groups: {
                          ...editableConfig.groups,
                          fazaa: { ...editableConfig.groups.fazaa, id: e.target.value },
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white border rounded text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveWhatsAppConfig}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              حفظ وتطبيق الإعدادات
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <h2 className="font-bold text-base text-slate-900">سجل عمليات وقرارات المشرفين (Audit Log)</h2>
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center bg-white border rounded-xl text-xs text-slate-500">
              لا توجد إجراءات رقابية مسجلة بعد.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b text-slate-500 font-bold">
                  <tr>
                    <th className="p-3">الوقت</th>
                    <th className="p-3">الإعلان</th>
                    <th className="p-3">الإجراء</th>
                    <th className="p-3">المشرف</th>
                    <th className="p-3">السبب / الملاحظة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleString('ar-EG')}
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{log.announcementTitle}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'approve'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action === 'reject'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.action === 'approve'
                            ? 'اعتماد ونشر'
                            : log.action === 'reject'
                            ? 'رفض'
                            : 'طلب تعديل'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">{log.moderatorName}</td>
                      <td className="p-3 text-slate-500">{log.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <h2 className="font-bold text-base text-slate-900">المستخدمون المسجلون ({users.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {users.map((u) => (
              <div key={u.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-slate-900">{u.fullName}</p>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                      {u.role === 'admin' ? 'مدير عام' : u.role === 'moderator' ? 'مشرف' : 'مواطن'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{u.phone}</p>
                  <p className="text-[11px] text-slate-400">إجمالي الإعلانات: {u.announcementsCount || 0}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  نشط ✓
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Moderation Modal popup */}
      {selectedForModeration && (
        <ModerationModal
          announcement={selectedForModeration}
          isOpen={!!selectedForModeration}
          onClose={() => setSelectedForModeration(null)}
          onActionComplete={() => {
            setSelectedForModeration(null);
            if (onRefreshData) onRefreshData();
          }}
        />
      )}
    </div>
  );
};
