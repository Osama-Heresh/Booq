import React, { useState } from 'react';
import { Announcement } from '../../types';
import { WhatsAppFormatter } from '../../services/whatsapp/formatter';
import { X, MessageSquare, Copy, Check, Share2, ExternalLink } from 'lucide-react';

interface ShareModalProps {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ announcement, isOpen, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  if (!isOpen || !announcement) return null;

  const fullMessage = WhatsAppFormatter.formatMessage(announcement);
  const webUrl = `${window.location.origin}/#announcement-${announcement.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(webUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(fullMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleSendToWhatsApp = () => {
    const encoded = encodeURIComponent(fullMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: announcement.title,
        text: fullMessage,
        url: webUrl,
      }).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full border border-[#E2E8F0] overflow-hidden text-right animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#F27D26]" />
            <h3 className="font-bold text-base text-[#0F172A]">مشاركة الإعلان</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#64748B] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0]">
            <span className="text-[11px] text-[#64748B] block mb-0.5">الإعلان المراد مشاركته:</span>
            <p className="text-sm font-bold text-[#0F172A]">{announcement.title}</p>
          </div>

          {/* WhatsApp Direct Button */}
          <button
            type="button"
            onClick={handleSendToWhatsApp}
            className="w-full py-3 px-4 bg-[#10B981] hover:bg-[#0b865d] text-white rounded-xl font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>مشاركة مباشرة عبر واتساب</span>
          </button>

          {/* Copy Full Message Button */}
          <button
            type="button"
            onClick={handleCopyMessage}
            className="w-full py-2.5 px-4 bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {copiedMessage ? <Check className="w-4 h-4 text-[#10B981]" /> : <Copy className="w-4 h-4 text-[#64748B]" />}
            <span>{copiedMessage ? 'تم نسخ نص الرسالة بالكامل ✓' : 'نسخ نص الرسالة الكامل المنسق'}</span>
          </button>

          {/* Copy Direct Link */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#E2E8F0]">
            <input
              type="text"
              readOnly
              value={webUrl}
              className="flex-1 px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#64748B]"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-2 bg-[#0F172A] hover:bg-[#1e293b] text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-colors"
            >
              {copiedLink ? 'تم النسخ!' : 'نسخ الرابط'}
            </button>
          </div>

          {/* Native Mobile Share if available */}
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full py-2 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] underline cursor-pointer transition-colors"
            >
              خيارات المشاركة الأخرى في هاتفك...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
