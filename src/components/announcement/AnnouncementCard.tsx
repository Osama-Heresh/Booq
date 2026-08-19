import React from 'react';
import { Announcement } from '../../types';
import { Sparkles, MapPin, Calendar, Phone, MessageSquare, Flame, Clock, Share2, ExternalLink } from 'lucide-react';

interface AnnouncementCardProps {
  announcement: Announcement;
  onSelect: (announcement: Announcement) => void;
  onShare?: (announcement: Announcement) => void;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement,
  onSelect,
  onShare,
}) => {
  const { category, title, farhaDetails, tarhaDetails, fazaaDetails, contact, status } = announcement;

  // Visual Theme per Category
  const isFarha = category === 'farha';
  const isTarha = category === 'tarha';
  const isFazaa = category === 'fazaa';

  const categoryBadge = () => {
    if (isFarha) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#10B981]/10 text-[#10B981]">
          <Sparkles className="w-3 h-3 text-[#10B981]" />
          فرحة
        </span>
      );
    }
    if (isTarha) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#7B1D21]/10 text-[#7B1D21]">
          ⚫ ترحة
        </span>
      );
    }
    if (isFazaa) {
      const isCritical = fazaaDetails?.urgency === 'critical';
      return (
        <span
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
            isCritical
              ? 'bg-[#EF4444] text-white animate-pulse'
              : 'bg-[#EF4444]/10 text-[#EF4444]'
          }`}
        >
          <Flame className="w-3 h-3" />
          {isCritical ? 'فزعة (عاجل جداً)' : fazaaDetails?.urgency === 'urgent' ? 'فزعة (عاجل)' : 'فزعة'}
        </span>
      );
    }
  };

  const cardHoverBorder = isFarha
    ? 'hover:border-[#10B981]'
    : isTarha
    ? 'hover:border-[#7B1D21]'
    : 'hover:border-[#EF4444]';

  return (
    <div
      onClick={() => onSelect(announcement)}
      className={`rounded-2xl border border-[#E2E8F0] bg-white transition-all duration-200 p-5 flex flex-col justify-between cursor-pointer relative overflow-hidden group shadow-xs hover:shadow-md ${cardHoverBorder}`}
    >
      {/* Top row: Category badge & status */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {categoryBadge()}
            {status === 'pending_review' && (
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/20">
                قيد المراجعة ⏳
              </span>
            )}
            {status === 'completed' && (
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-[#64748B] rounded-full">
                مكتمل
              </span>
            )}
            {status === 'expired' && (
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-[#64748B] rounded-full">
                منتهي
              </span>
            )}
          </div>

          <span className="text-xs text-[#94A3B8] font-medium">
            {new Date(announcement.createdAt).toLocaleDateString('ar-EG', {
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-[#0F172A] leading-snug group-hover:text-[#0F172A] transition-colors line-clamp-2">
          {title}
        </h3>

        {/* Structured summary based on category */}
        <div className="mt-3 space-y-1.5 text-xs text-[#64748B]">
          {isFarha && farhaDetails && (
            <>
              {farhaDetails.honorees && (
                <p className="font-semibold text-[#0F172A] truncate">
                  💐 {farhaDetails.honorees}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-[#64748B]">
                <Calendar className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                <span>{farhaDetails.date} ({farhaDetails.time})</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#64748B]">
                <MapPin className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                <span className="truncate">{farhaDetails.venueName}</span>
              </div>
            </>
          )}

          {isTarha && tarhaDetails && (
            <>
              <p className="font-bold text-[#0F172A] truncate">
                🕊️ المرحوم: {tarhaDetails.deceasedName}
              </p>
              <div className="flex items-center gap-1.5 text-[#64748B]">
                <Clock className="w-3.5 h-3.5 text-[#7B1D21] shrink-0" />
                <span>الصلاة: {tarhaDetails.prayerTime} - {tarhaDetails.mosqueName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#64748B]">
                <MapPin className="w-3.5 h-3.5 text-[#7B1D21] shrink-0" />
                <span className="truncate">التعازي: {tarhaDetails.condolenceVenue}</span>
              </div>
            </>
          )}

          {isFazaa && fazaaDetails && (
            <>
              {fazaaDetails.bloodType && (
                <p className="font-bold text-[#EF4444]">
                  🩸 فصيلة الدم: {fazaaDetails.bloodType} ({fazaaDetails.unitsNeeded || 2} وحدات مطلوبة)
                </p>
              )}
              <div className="flex items-center gap-1.5 text-[#64748B]">
                <MapPin className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                <span className="truncate">{fazaaDetails.facilityOrLocationName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#64748B]">
                <Calendar className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                <span>{fazaaDetails.requiredDate}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer & Quick action badges */}
      <div className="mt-5 pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {contact.allowCalls && (
            <span
              className="p-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#10B981]/10 text-[#64748B] hover:text-[#10B981] transition-colors"
              title="يسمح بالاتصال"
            >
              <Phone className="w-3.5 h-3.5" />
            </span>
          )}
          {contact.allowWhatsapp && (
            <span
              className="p-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#10B981]/10 text-[#64748B] hover:text-[#10B981] transition-colors"
              title="يسمح بالتواصل عبر واتساب"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </span>
          )}
          <span className="text-[11px] text-[#64748B] truncate max-w-[120px]">
            {contact.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onShare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShare(announcement);
              }}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-black/5 transition-colors cursor-pointer"
              title="مشاركة الإعلان"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-xs font-bold text-[#0F172A] group-hover:underline flex items-center gap-0.5">
            <span>التفاصيل</span>
            <span>←</span>
          </span>
        </div>
      </div>
    </div>
  );
};
