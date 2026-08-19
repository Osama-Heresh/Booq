import React, { useState } from 'react';
import { Announcement } from '../../types';
import { WhatsAppFormatter } from '../../services/whatsapp/formatter';
import {
  X,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  Clock,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Sparkles,
  Flame,
  ShieldCheck,
  Navigation,
  Building2,
  Eye,
} from 'lucide-react';

interface AnnouncementDetailModalProps {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenModeration?: (announcement: Announcement) => void;
  isModerator?: boolean;
}

export const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  announcement,
  isOpen,
  onClose,
  onOpenModeration,
  isModerator = false,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWhatsAppText, setCopiedWhatsAppText] = useState(false);
  const [showWhatsAppPreview, setShowWhatsAppPreview] = useState(false);

  if (!isOpen || !announcement) return null;

  const { category, title, farhaDetails, tarhaDetails, fazaaDetails, contact, status } = announcement;
  const isFarha = category === 'farha';
  const isTarha = category === 'tarha';
  const isFazaa = category === 'fazaa';

  const fullWhatsAppMessage = WhatsAppFormatter.formatMessage(announcement);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#announcement-${announcement.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyWhatsAppText = () => {
    navigator.clipboard.writeText(fullWhatsAppMessage);
    setCopiedWhatsAppText(true);
    setTimeout(() => setCopiedWhatsAppText(false), 2500);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: announcement.title,
        text: fullWhatsAppMessage,
        url: `${window.location.origin}/#announcement-${announcement.id}`,
      }).catch(() => {});
    } else {
      handleCopyWhatsAppText();
    }
  };

  const handleDirectWhatsAppShare = () => {
    const encoded = encodeURIComponent(fullWhatsAppMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-[#E2E8F0] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            {isFarha && (
              <span className="px-3 py-1 bg-[#10B981]/10 text-[#10B981] font-bold text-xs rounded-full flex items-center gap-1 border border-[#10B981]/20">
                <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                فرحة
              </span>
            )}
            {isTarha && (
              <span className="px-3 py-1 bg-[#7B1D21] text-white font-bold text-xs rounded-full">
                ⚫ ترحة
              </span>
            )}
            {isFazaa && (
              <span
                className={`px-3 py-1 text-xs font-black rounded-full flex items-center gap-1 ${
                  fazaaDetails?.urgency === 'critical'
                    ? 'bg-[#EF4444] text-white animate-pulse'
                    : 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                {fazaaDetails?.urgency === 'critical' ? 'فزعة (عاجل جداً)' : 'فزعة'}
              </span>
            )}

            {status === 'pending_review' && (
              <span className="px-2.5 py-1 text-xs font-bold bg-[#F27D26]/10 text-[#F27D26] rounded-full border border-[#F27D26]/20">
                قيد المراجعة ⏳
              </span>
            )}
            {status === 'published' && (
              <span className="px-2.5 py-1 text-xs font-bold bg-[#10B981]/10 text-[#10B981] rounded-full border border-[#10B981]/20">
                منشور وموثق ✓
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-1.5 rounded-lg text-[#64748B] hover:bg-black/5 transition-colors hidden sm:flex cursor-pointer"
              title="طباعة الإعلان"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#64748B] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 text-right">
          
          {/* Main Title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] leading-tight">
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#64748B]">
              <span>مدينة قلقيلية</span>
              <span>•</span>
              <span>تاريخ النشر: {new Date(announcement.createdAt).toLocaleDateString('ar-EG', { dateStyle: 'long' })}</span>
              {announcement.publishedAt && (
                <>
                  <span>•</span>
                  <span className="text-[#10B981] font-semibold">بُث في مجموعة واتساب</span>
                </>
              )}
            </div>
          </div>

          {/* FARHA SPECIFIC DETAILS */}
          {isFarha && farhaDetails && (
            <div className="space-y-4">
              <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-2xl p-4 sm:p-5 space-y-3">
                {farhaDetails.honorees && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#10B981] shrink-0">أصحاب المناسبة:</span>
                    <span className="text-sm font-black text-[#0F172A]">{farhaDetails.honorees}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs text-[#1A2B3C]">
                    <Calendar className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span className="font-semibold">{farhaDetails.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#1A2B3C]">
                    <Clock className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span className="font-semibold">{farhaDetails.time}</span>
                  </div>
                </div>
              </div>

              {/* Location Card */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#10B981]" />
                    <span className="text-sm font-bold text-[#0F172A]">{farhaDetails.venueName}</span>
                  </div>
                  <a
                    href={farhaDetails.location.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-bold text-[#10B981] hover:text-[#0b865d] bg-[#10B981]/10 px-3 py-1 rounded-xl border border-[#10B981]/20 transition-colors"
                  >
                    <span>فتح في الخرائط</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {farhaDetails.location.address && (
                  <p className="text-xs text-[#64748B]">{farhaDetails.location.address}</p>
                )}
              </div>

              {farhaDetails.description && (
                <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] text-sm text-[#1A2B3C] leading-relaxed whitespace-pre-wrap">
                  {farhaDetails.description}
                </div>
              )}

              {farhaDetails.additionalNotes && (
                <p className="text-xs text-[#64748B] bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
                  📌 <strong>ملاحظة:</strong> {farhaDetails.additionalNotes}
                </p>
              )}
            </div>
          )}

          {/* TARHA SPECIFIC DETAILS (3 LOCATIONS) */}
          {isTarha && tarhaDetails && (
            <div className="space-y-4">
              <div className="bg-[#0F172A] text-white rounded-[24px] p-5 text-center space-y-2 shadow-sm border border-white/10 relative overflow-hidden">
                <div className="absolute -left-6 -top-6 w-24 h-24 bg-[#F27D26]/10 rounded-full blur-lg pointer-events-none" />
                <span className="text-xs tracking-widest text-[#F27D26] font-bold block">
                  إنا لله وإنا إليه راجعون
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  المرحوم/ة {tarhaDetails.deceasedName}
                </h2>
                <p className="text-xs text-white/70">تاريخ الوفاة: {tarhaDetails.deathDate}</p>
              </div>

              {/* THREE SEPARATE MAP LOCATIONS DISPLAY */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#7B1D21]" />
                  <span>المواقع والخرائط المعتمدة</span>
                </h3>

                {/* 1. Mosque */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#64748B] block">🕌 صلاة الجنازة:</span>
                    <p className="text-sm font-bold text-[#0F172A]">{tarhaDetails.mosqueName}</p>
                    <p className="text-xs text-[#64748B]">الموعد: {tarhaDetails.prayerTime}</p>
                  </div>
                  <a
                    href={tarhaDetails.mosqueLocation.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-bold text-[#0F172A] hover:text-[#F27D26] bg-white px-3 py-1.5 rounded-xl border border-[#E2E8F0] shadow-xs transition-colors"
                  >
                    <span>موقع المسجد</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* 2. Cemetery */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#64748B] block">⚰️ الدفن ومواراة الثرى:</span>
                    <p className="text-sm font-bold text-[#0F172A]">{tarhaDetails.cemeteryName}</p>
                  </div>
                  <a
                    href={tarhaDetails.cemeteryLocation.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-bold text-[#0F172A] hover:text-[#F27D26] bg-white px-3 py-1.5 rounded-xl border border-[#E2E8F0] shadow-xs transition-colors"
                  >
                    <span>موقع المقبرة</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* 3. Condolence Venue */}
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-[#64748B] block">🤝 استقبال التعازي:</span>
                    <p className="text-sm font-bold text-[#0F172A]">{tarhaDetails.condolenceVenue}</p>
                    <p className="text-xs text-[#64748B]">
                      {tarhaDetails.condolenceDuration} • {tarhaDetails.condolenceHours}
                    </p>
                  </div>
                  <a
                    href={tarhaDetails.condolenceLocation.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-bold text-[#0F172A] hover:text-[#F27D26] bg-white px-3 py-1.5 rounded-xl border border-[#E2E8F0] shadow-xs transition-colors"
                  >
                    <span>موقع العزاء</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {tarhaDetails.additionalNotes && (
                <p className="text-xs text-[#64748B] bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
                  📌 {tarhaDetails.additionalNotes}
                </p>
              )}
            </div>
          )}

          {/* FAZAA SPECIFIC DETAILS */}
          {isFazaa && fazaaDetails && (
            <div className="space-y-4">
              <div className="bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#EF4444]">نوع الفزعة: {fazaaDetails.fazaaType}</span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EF4444] text-white">
                    {fazaaDetails.urgency === 'critical' ? 'عاجل جداً' : 'عاجل'}
                  </span>
                </div>

                {fazaaDetails.bloodType && (
                  <div className="bg-white p-3.5 rounded-xl border border-[#EF4444]/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#64748B] block">فصيلة الدم المطلوبة:</span>
                      <span className="text-lg font-black text-[#EF4444] font-mono">{fazaaDetails.bloodType}</span>
                    </div>
                    {fazaaDetails.unitsNeeded && (
                      <div className="text-left">
                        <span className="text-xs text-[#64748B] block">العدد المطلوب:</span>
                        <span className="text-base font-bold text-[#0F172A]">{fazaaDetails.unitsNeeded} وحدات</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#1A2B3C] pt-1">
                  <div>
                    <span className="text-[#64748B]">المستفيد / الحالة: </span>
                    <span className="font-semibold">{fazaaDetails.targetPersonOrEntity || 'أحد أبناء المجتمع'}</span>
                  </div>
                  <div>
                    <span className="text-[#64748B]">الموعد: </span>
                    <span className="font-semibold">{fazaaDetails.requiredDate}</span>
                  </div>
                </div>
              </div>

              {/* Location Card */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#64748B] block">المستشفى أو مكان التجمع:</span>
                  <p className="text-sm font-bold text-[#0F172A]">{fazaaDetails.facilityOrLocationName}</p>
                </div>
                <a
                  href={fazaaDetails.location.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-[#EF4444] hover:text-[#dc2626] bg-[#EF4444]/10 px-3 py-1.5 rounded-xl border border-[#EF4444]/20 transition-colors"
                >
                  <span>فتح في الخرائط</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {fazaaDetails.description && (
                <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] text-sm text-[#1A2B3C] leading-relaxed whitespace-pre-wrap">
                  {fazaaDetails.description}
                </div>
              )}
            </div>
          )}

          {/* CONTACT & DIRECT ACTION BUTTONS */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wide">
              التواصل والتنسيق المباشر
            </h3>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#0F172A]">{contact.name}</p>
                <p className="text-xs text-[#64748B] font-mono">{contact.phone}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {contact.allowCalls && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0F172A] hover:bg-[#1e293b] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال هاتفي</span>
                  </a>
                )}
                {contact.allowWhatsapp && (
                  <a
                    href={`https://wa.me/${(contact.whatsappPhone || contact.phone).replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-[#10B981] hover:bg-[#0b865d] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>محادثة واتساب</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* WHATSAPP MESSAGE PREVIEW ACCORDION */}
          <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden bg-[#F8FAFC]">
            <button
              type="button"
              onClick={() => setShowWhatsAppPreview(!showWhatsAppPreview)}
              className="w-full p-3.5 text-right flex items-center justify-between text-xs font-bold text-[#0F172A] hover:bg-black/5 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#10B981]" />
                <span>معاينة نص رسالة واتساب الموجهة للمجموعة</span>
              </span>
              <span className="text-[#64748B]">{showWhatsAppPreview ? 'إخفاء ▲' : 'عرض ▼'}</span>
            </button>

            {showWhatsAppPreview && (
              <div className="p-4 bg-[#0F172A] text-white/90 text-xs font-mono whitespace-pre-wrap leading-relaxed border-t border-white/10 rounded-b-2xl">
                {fullWhatsAppMessage}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer (Share & Action options) */}
        <div className="p-4 sm:p-5 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDirectWhatsAppShare}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-[#10B981] hover:bg-[#0b865d] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>مشاركة عبر واتساب</span>
            </button>

            <button
              type="button"
              onClick={handleCopyWhatsAppText}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-black/5 text-[#0F172A] rounded-xl text-xs font-bold border border-[#E2E8F0] transition-colors cursor-pointer"
            >
              {copiedWhatsAppText ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedWhatsAppText ? 'تم نسخ الرسالة' : 'نسخ الرسالة كاملة'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2.5 bg-white hover:bg-black/5 text-[#0F172A] rounded-xl text-xs border border-[#E2E8F0] transition-colors cursor-pointer"
              title="نسخ رابط الإعلان"
            >
              {copiedLink ? <Check className="w-4 h-4 text-[#10B981]" /> : <Share2 className="w-4 h-4 text-[#64748B]" />}
            </button>
          </div>

          {isModerator && onOpenModeration && (
            <button
              type="button"
              onClick={() => onOpenModeration(announcement)}
              className="px-4 py-2.5 bg-[#0F172A] hover:bg-[#1e293b] text-[#F27D26] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>إدارة ومراجعة الإعلان</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
