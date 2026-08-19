import React from 'react';
import { Logo } from '../common/Logo';
import { CategoryType } from '../../types';
import { MessageSquare, ShieldCheck, Heart, Sparkles, Flame, MapPin } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: 'home' | 'farha' | 'tarha' | 'fazaa' | 'archive' | 'admin') => void;
  onOpenCreate: (category?: CategoryType) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenCreate }) => {
  return (
    <footer className="bg-[#0F172A] text-white border-t border-white/10 mt-16 text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: Brand & Tagline */}
          <div className="space-y-4 md:col-span-2">
            <Logo variant="light" size="lg" />
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed max-w-lg">
              منصة مجتمعية موحدة وموثقة لأهل قلقيلية. تهدف إلى جمع وتبويب الإعلانات الهامة في ثلاثة أقسام واضحة (فرحة • ترحة • فزعة) وتوزيعها المنظم عبر مجموعات واتساب المخصصة وموقع الأرشيف الدائم، لضمان عدم ضياع الأخبار الجليلة بين المحادثات اليومية.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#F27D26] font-semibold">
              <MapPin className="w-4 h-4 text-[#F27D26]" />
              <span>مصممة لخدمة مجتمع مدينة قلقيلية ومحيطها</span>
            </div>
          </div>

          {/* Col 2: Quick Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-[#F27D26] uppercase tracking-wider">
              أقسام المنصة
            </h4>
            <ul className="space-y-2 text-xs text-white/80">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('farha')}
                  className="hover:text-[#10B981] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>🟢 أفراحنا (فرحة)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('tarha')}
                  className="hover:text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>⚫ أتراحنا ووفياتنا (ترحة)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('fazaa')}
                  className="hover:text-[#EF4444] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 text-[#EF4444]" />
                  <span>🔴 فزعتنا ومساندتنا (فزعة)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('archive')}
                  className="hover:text-[#F27D26] transition-colors cursor-pointer"
                >
                  الأرشيف السنوي والشهري
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenCreate()}
                  className="text-[#F27D26] font-bold hover:underline cursor-pointer"
                >
                  + تقديم إعلان جديد للمراجعة
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Principles & Moderation */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-[#F27D26] uppercase tracking-wider">
              مبادئ المنصة
            </h4>
            <div className="text-xs text-white/80 space-y-2">
              <div className="flex items-start gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span>مراجعة وتدقيق بشري قبل كل نشر</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-[#F27D26] font-bold">✓</span>
                <span>لا تعليقات، لا تفاعلات، لا إعلانات تجارية</span>
              </div>
              <div className="flex items-start gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span>رسائل واتساب كاملة تشمل الخرائط والتواصل</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© 2026 بوق البلد • منصة إعلانات المجتمع - قلقيلية. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-1 text-white/60">
            <span>صُنعت لخدمة وتآخي المجتمع</span>
            <Heart className="w-3.5 h-3.5 text-[#EF4444] fill-[#EF4444] inline mx-1" />
            <span>بكل مودة واحترام</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
