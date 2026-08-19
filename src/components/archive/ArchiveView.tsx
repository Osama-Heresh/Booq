import React, { useState, useMemo } from 'react';
import { Announcement, CategoryType } from '../../types';
import { StorageService } from '../../services/storage';
import { AnnouncementCard } from '../announcement/AnnouncementCard';
import {
  Archive,
  Search,
  Filter,
  Calendar,
  Sparkles,
  Flame,
  Clock,
  RotateCcw,
  BookOpen,
} from 'lucide-react';

interface ArchiveViewProps {
  onSelectAnnouncement: (announcement: Announcement) => void;
  onShareAnnouncement?: (announcement: Announcement) => void;
}

const MONTHS_AR = [
  { value: 'all', label: 'جميع الأشهر' },
  { value: '0', label: 'كانون الثاني (يناير)' },
  { value: '1', label: 'شباط (فبراير)' },
  { value: '2', label: 'آذار (مارس)' },
  { value: '3', label: 'نيسان (أبريل)' },
  { value: '4', label: 'أيار (مايو)' },
  { value: '5', label: 'حزيران (يونيو)' },
  { value: '6', label: 'تموز (يوليو)' },
  { value: '7', label: 'آب (أغسطس)' },
  { value: '8', label: 'أيلول (سبتمبر)' },
  { value: '9', label: 'تشرين الأول (أكتوبر)' },
  { value: '10', label: 'تشرين الثاني (نوفمبر)' },
  { value: '11', label: 'كانون الأول (ديسمبر)' },
];

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  onSelectAnnouncement,
  onShareAnnouncement,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'completed' | 'expired'>('all');

  const storage = StorageService.getInstance();
  const allAnnouncements = storage.getAnnouncements();

  // Filter logic
  const filtered = useMemo(() => {
    return allAnnouncements.filter((ann) => {
      // Category filter
      if (selectedCategory !== 'all' && ann.category !== selectedCategory) return false;

      // Status filter
      if (statusFilter !== 'all' && ann.status !== statusFilter) return false;

      // Date parsing
      const date = new Date(ann.createdAt);
      const year = date.getFullYear().toString();
      const month = date.getMonth().toString();

      if (selectedYear !== 'all' && year !== selectedYear) return false;
      if (selectedMonth !== 'all' && month !== selectedMonth) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const inTitle = ann.title.toLowerCase().includes(query);
        const inPublisher = ann.createdByUserName.toLowerCase().includes(query);
        const inHonorees = ann.farhaDetails?.honorees?.toLowerCase().includes(query);
        const inDeceased = ann.tarhaDetails?.deceasedName?.toLowerCase().includes(query);
        const inVenue =
          ann.farhaDetails?.venueName?.toLowerCase().includes(query) ||
          ann.tarhaDetails?.condolenceVenue?.toLowerCase().includes(query) ||
          ann.fazaaDetails?.facilityOrLocationName?.toLowerCase().includes(query);

        if (!inTitle && !inPublisher && !inHonorees && !inDeceased && !inVenue) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allAnnouncements, selectedCategory, selectedYear, selectedMonth, searchTerm, statusFilter]);

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedYear('2026');
    setSelectedMonth('all');
    setSearchTerm('');
    setStatusFilter('all');
  };

  return (
    <div className="space-y-6 text-right">
      
      {/* Archive Header Banner */}
      <div className="bg-[#0F172A] text-white p-6 sm:p-7 rounded-[32px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-white/10 relative overflow-hidden shadow-md">
        <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-[#F27D26]/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F27D26] text-white flex items-center justify-center shadow-sm">
              <Archive className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black">أرشيف إعلانات بوق البلد</h1>
          </div>
          <p className="text-xs text-white/70 mt-1.5">
            السجل التاريخي الموثق لأفراح وأتراح وفزعات مدينة قلقيلية عبر السنوات والأشهر
          </p>
        </div>

        <div className="text-xs bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 font-bold text-white relative z-10">
          المجموع في الأرشيف: <span className="text-[#F27D26] font-black">{filtered.length}</span> إعلان
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="bg-white p-5 sm:p-6 rounded-[32px] border border-[#E2E8F0] shadow-xs space-y-4">
        
        {/* Search input & category pills */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم، المتوفى، أصحاب المناسبة، القاعة، أو العنوان..."
              className="w-full pl-4 pr-10 py-2.5 bg-[#FDFBF7] border border-[#E2E8F0] rounded-xl text-sm focus:ring-2 focus:ring-[#0F172A] text-[#1A2B3C]"
            />
            <Search className="w-4 h-4 text-[#64748B] absolute right-3 top-3.5" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-3 text-xs text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'bg-[#FDFBF7] text-[#1A2B3C] border border-[#E2E8F0] hover:bg-black/5'
              }`}
            >
              جميع الأقسام
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('farha')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'farha'
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : 'bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>فرحة</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('tarha')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'tarha'
                  ? 'bg-[#7B1D21] text-white shadow-xs'
                  : 'bg-[#7B1D21]/10 text-[#7B1D21] hover:bg-[#7B1D21]/20'
              }`}
            >
              <span>⚫ ترحة</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('fazaa')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'fazaa'
                  ? 'bg-[#EF4444] text-white shadow-xs'
                  : 'bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>فزعة</span>
            </button>
          </div>
        </div>

        {/* Date Filter Bar (Year & Month & Status) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E2E8F0] text-xs">
          
          {/* Year */}
          <div>
            <label className="block text-[#64748B] font-semibold mb-1">السنة</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 bg-[#FDFBF7] border border-[#E2E8F0] rounded-xl font-bold text-[#0F172A]"
            >
              <option value="all">جميع السنوات</option>
              <option value="2026">2026 (العام الحالي)</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-[#64748B] font-semibold mb-1">الشهر</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-[#FDFBF7] border border-[#E2E8F0] rounded-xl text-[#0F172A]"
            >
              {MONTHS_AR.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[#64748B] font-semibold mb-1">حالة الإعلان</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#FDFBF7] border border-[#E2E8F0] rounded-xl text-[#0F172A]"
            >
              <option value="all">جميع الحالات</option>
              <option value="published">منشور حالياً</option>
              <option value="completed">مكتمل</option>
              <option value="expired">منتهي</option>
            </select>
          </div>

          {/* Reset button */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-2 px-3 bg-[#FDFBF7] hover:bg-[#F4EFEA] text-[#1A2B3C] border border-[#E2E8F0] rounded-xl font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
              <span>إعادة ضبط التصفية</span>
            </button>
          </div>
        </div>
      </div>

      {/* RESULTS GRID */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-[32px] border border-[#E2E8F0] text-center space-y-3 shadow-xs">
          <BookOpen className="w-12 h-12 text-[#94A3B8] mx-auto" />
          <h3 className="text-base font-bold text-[#0F172A]">لا توجد إعلانات مطابقة للبحث في الأرشيف</h3>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto">
            جرّب تغيير السنة، الشهر، أو كلمات البحث للعثور على الإعلانات المطلوبة.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-5 py-2.5 bg-[#0F172A] hover:bg-[#1e293b] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            عرض كافة الإعلانات
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((ann) => (
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
  );
};
