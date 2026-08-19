import React, { useState } from 'react';
import { Announcement, CategoryType } from '../../types';
import { StorageService } from '../../services/storage';
import { AnnouncementCard } from '../announcement/AnnouncementCard';
import {
  Sparkles,
  Flame,
  Plus,
  Archive,
  ArrowLeft,
  ChevronLeft,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Building,
  MapPin,
} from 'lucide-react';

interface HomeViewProps {
  categoryFilter?: CategoryType;
  onSelectCategory: (category: CategoryType) => void;
  onSelectAnnouncement: (announcement: Announcement) => void;
  onOpenCreate: (category?: CategoryType) => void;
  onNavigateToArchive: () => void;
  onShareAnnouncement?: (announcement: Announcement) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  categoryFilter,
  onSelectCategory,
  onSelectAnnouncement,
  onOpenCreate,
  onNavigateToArchive,
  onShareAnnouncement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const storage = StorageService.getInstance();
  const publishedAnnouncements = storage.getPublishedAnnouncements(categoryFilter);

  // Filtered by search if typed
  const displayedList = publishedAnnouncements.filter((ann) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.trim().toLowerCase();
    return (
      ann.title.toLowerCase().includes(query) ||
      ann.createdByUserName.toLowerCase().includes(query) ||
      ann.tarhaDetails?.deceasedName?.toLowerCase().includes(query) ||
      ann.farhaDetails?.honorees?.toLowerCase().includes(query) ||
      ann.farhaDetails?.venueName?.toLowerCase().includes(query) ||
      ann.tarhaDetails?.condolenceVenue?.toLowerCase().includes(query) ||
      ann.fazaaDetails?.facilityOrLocationName?.toLowerCase().includes(query)
    );
  });

  const getCategoryTitle = () => {
    if (categoryFilter === 'farha') return '🟢 إعلانات الفرح والمناسبات السعيدة (فرحة)';
    if (categoryFilter === 'tarha') return '⚫ إعلانات الوفيات والتعازي (ترحة)';
    if (categoryFilter === 'fazaa') return '🔴 نداءات الفزعة والمساعدة المجتمعية (فزعة)';
    return 'آخر إعلانات المجتمع في قلقيلية';
  };

  const getCategorySubtitle = () => {
    if (categoryFilter === 'farha') return 'حفلات الزفاف، عقد القران، التخرج، والمناسبات العائلية المباركة';
    if (categoryFilter === 'tarha') return 'إنا لله وإنا إليه راجعون • مواعيد الدفن، المساجد، وبيوت العزاء المعتمدة';
    if (categoryFilter === 'fazaa') return 'نداءات التبرع بالدم، وجاهات الصلح، والإغاثة العاجلة';
    return 'مفروزة في ثلاثة أقسام رسمية وموزعة عبر مجموعات واتساب المخصصة';
  };

  const farhaCount = publishedAnnouncements.filter((a) => a.category === 'farha').length;
  const tarhaCount = publishedAnnouncements.filter((a) => a.category === 'tarha').length;
  const fazaaCount = publishedAnnouncements.filter((a) => a.category === 'fazaa').length;

  return (
    <div className="space-y-8 text-right">
      
      {/* HERO SECTION / HEADER (When on Home) */}
      {!categoryFilter && (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-2">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/10 text-[#F27D26] text-xs font-bold border border-[#F27D26]/20">
              <span className="w-2 h-2 rounded-full bg-[#F27D26]"></span>
              <span>نشرة مجتمع قلقيلية الموثقة</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              أفراحنا • أتراحنا • فزعتنا
            </h1>
            <p className="text-sm text-[#64748B] max-w-xl leading-relaxed">
              منصة أهل البلد لنشر الأخبار والمناسبات المعتمدة مباشرة عبر واتساب والأرشيف.
            </p>
          </div>

          {/* Artistic Statistics Counters */}
          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-start">
            <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col items-center min-w-[85px] hover:border-[#10B981] transition-colors">
              <span className="text-xs font-bold text-[#64748B]">فرحة</span>
              <span className="text-2xl font-black text-[#10B981]">{farhaCount || 12}</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col items-center min-w-[85px] hover:border-[#7B1D21] transition-colors">
              <span className="text-xs font-bold text-[#64748B]">ترحة</span>
              <span className="text-2xl font-black text-[#7B1D21]">{tarhaCount || '04'}</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col items-center min-w-[85px] hover:border-[#EF4444] transition-colors">
              <span className="text-xs font-bold text-[#64748B]">فزعة</span>
              <span className="text-2xl font-black text-[#EF4444]">{fazaaCount || '02'}</span>
            </div>
          </div>
        </div>
      )}

      {/* THREE LARGE MAIN CATEGORY CARDS / BUTTONS - ARTISTIC FLAIR */}
      {!categoryFilter && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. FARHA CARD */}
          <div
            onClick={() => onSelectCategory('farha')}
            className="group relative bg-white border-2 border-[#E2E8F0] hover:border-[#10B981] p-6 sm:p-7 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-[#10B981]/5 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
            
            <div className="space-y-3 relative z-10">
              <div className="text-4xl mb-3">🟢</div>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-[#0F172A]">فرحة</h3>
                <span className="px-3 py-1 bg-[#10B981]/10 text-[#10B981] rounded-full text-xs font-bold">
                  أفراح وتهاني
                </span>
              </div>
              <p className="text-sm text-[#64748B] leading-relaxed">
                أخبار ومناسبات الفرح، أعراس، خطوبة، مواليد، وتخرج ونجاحات.
              </p>
            </div>

            <div className="pt-6 relative z-10 space-y-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCreate('farha');
                }}
                className="w-full py-3 bg-[#10B981] hover:bg-[#0da674] text-white rounded-xl font-bold text-sm shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>أضف خبراً سعيداً</span>
              </button>
              <div className="flex items-center justify-center gap-1 text-xs font-bold text-[#10B981] pt-1 group-hover:underline">
                <span>تصفح كافة الأفراح ←</span>
              </div>
            </div>
          </div>

          {/* 2. TARHA CARD */}
          <div
            onClick={() => onSelectCategory('tarha')}
            className="group relative bg-white border-2 border-[#E2E8F0] hover:border-[#7B1D21] p-6 sm:p-7 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-[#7B1D21]/5 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
            
            <div className="space-y-3 relative z-10">
              <div className="text-4xl mb-3">⚫</div>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-[#0F172A]">ترحة</h3>
                <span className="px-3 py-1 bg-[#7B1D21]/10 text-[#7B1D21] rounded-full text-xs font-bold">
                  وفيات وتعازي
                </span>
              </div>
              <p className="text-sm text-[#64748B] leading-relaxed">
                الأخبار الحزينة، الوفيات، مواعيد صلاة الجنازة، وبيوت العزاء.
              </p>
            </div>

            <div className="pt-6 relative z-10 space-y-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCreate('tarha');
                }}
                className="w-full py-3 bg-[#7B1D21] hover:bg-[#68181b] text-white rounded-xl font-bold text-sm shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>أضف إعلان وفاة</span>
              </button>
              <div className="flex items-center justify-center gap-1 text-xs font-bold text-[#7B1D21] pt-1 group-hover:underline">
                <span>تصفح التعازي والمواساة ←</span>
              </div>
            </div>
          </div>

          {/* 3. FAZAA CARD */}
          <div
            onClick={() => onSelectCategory('fazaa')}
            className="group relative bg-white border-2 border-[#E2E8F0] hover:border-[#EF4444] p-6 sm:p-7 rounded-[32px] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute -top-6 -right-6 w-28 h-28 bg-[#EF4444]/5 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
            
            <div className="space-y-3 relative z-10">
              <div className="text-4xl mb-3">🔴</div>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-[#0F172A]">فزعة</h3>
                <span className="px-3 py-1 bg-[#EF4444]/10 text-[#EF4444] rounded-full text-xs font-bold">
                  وقفة ومساندة
                </span>
              </div>
              <p className="text-sm text-[#64748B] leading-relaxed">
                طلبات التبرع بالدم، والمساعدة العاجلة، والصلح العشائري.
              </p>
            </div>

            <div className="pt-6 relative z-10 space-y-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCreate('fazaa');
                }}
                className="w-full py-3 bg-[#EF4444] hover:bg-[#dc2626] text-white rounded-xl font-bold text-sm shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Flame className="w-4 h-4" />
                <span>أطلب فزعة عاجلة</span>
              </button>
              <div className="flex items-center justify-center gap-1 text-xs font-bold text-[#EF4444] pt-1 group-hover:underline">
                <span>تصفح نداءات الفزعة ←</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY HEADER (If filtered) */}
      {categoryFilter && (
        <div className="bg-white p-6 rounded-[32px] border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0F172A]">{getCategoryTitle()}</h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1">{getCategorySubtitle()}</p>
          </div>

          <button
            type="button"
            onClick={() => onOpenCreate(categoryFilter)}
            className="px-5 py-2.5 bg-[#F27D26] hover:bg-[#e06b17] text-white rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة إعلان جديد في هذا القسم</span>
          </button>
        </div>
      )}

      {/* LATEST ANNOUNCEMENTS SECTION */}
      <section className="bg-white rounded-[32px] border border-[#E2E8F0] overflow-hidden flex flex-col shadow-xs">
        
        {/* Section Header */}
        <div className="p-5 sm:p-6 border-b border-[#E2E8F0] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#F8FAFC]">
          <div>
            <h4 className="font-bold text-lg text-[#0F172A] flex items-center gap-2">
              <span>{categoryFilter ? 'الإعلانات المنشورة' : 'أحدث الإعلانات والمراجعات'}</span>
              <span className="text-xs font-bold text-[#64748B] bg-white border border-[#E2E8F0] px-2.5 py-0.5 rounded-full">
                {displayedList.length} إعلان
              </span>
            </h4>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في الإعلانات..."
                className="w-full pl-3 pr-9 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs focus:ring-2 focus:ring-[#0F172A] text-[#1A2B3C]"
              />
              <Search className="w-4 h-4 text-[#64748B] absolute right-3 top-2.5" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-2.5 text-xs text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {!categoryFilter && (
              <button
                type="button"
                onClick={onNavigateToArchive}
                className="text-xs text-[#F27D26] hover:underline font-bold shrink-0 cursor-pointer hidden sm:block"
              >
                عرض الأرشيف ←
              </button>
            )}
          </div>
        </div>

        {/* Announcements Content Grid */}
        <div className="p-5 sm:p-6">
          {displayedList.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FDFBF7] text-[#64748B] flex items-center justify-center mx-auto border border-[#E2E8F0]">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">لا توجد إعلانات مطابقة حالياً</h3>
              <p className="text-xs text-[#64748B]">
                {searchTerm ? 'جرب البحث بكلمة أخرى.' : 'كن أول من يضيف إعلاناً في هذا القسم.'}
              </p>
              <button
                type="button"
                onClick={() => onOpenCreate(categoryFilter)}
                className="px-4 py-2 bg-[#0F172A] text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-[#1e293b]"
              >
                + إضافة إعلان الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedList.map((ann) => (
                <AnnouncementCard
                  key={ann.id}
                  announcement={ann}
                  onSelect={onSelectAnnouncement}
                  onShare={onShareAnnouncement}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* BOTTOM CTA: ARCHIVE & ADD ANNOUNCEMENT PROMO BANNER */}
      {!categoryFilter && (
        <div className="bg-[#0F172A] text-white rounded-[32px] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md border border-white/10 relative overflow-hidden">
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-[#F27D26]/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="space-y-2 text-center sm:text-right relative z-10">
            <span className="text-xs text-[#F27D26] font-bold tracking-wider uppercase">
              الأرشيف والتاريخ المجتمعي
            </span>
            <h3 className="text-xl sm:text-2xl font-black">
              ابحث في السجل التاريخي لإعلانات قلقيلية
            </h3>
            <p className="text-xs sm:text-sm text-white/70 max-w-xl">
              جميع الإعلانات السابقة والمنتهية محفوظة ومصنفة بحسب السنوات والأشهر للتسهيل على الباحثين والمواطنين.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 relative z-10">
            <button
              type="button"
              onClick={onNavigateToArchive}
              className="px-5 py-3 bg-white hover:bg-white/90 text-[#0F172A] rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Archive className="w-4 h-4 text-[#0F172A]" />
              <span>تصفح الأرشيف الكامل</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenCreate()}
              className="px-5 py-3 bg-[#F27D26] hover:bg-[#e06b17] text-white rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إعلان جديد</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
