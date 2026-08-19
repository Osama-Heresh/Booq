import React from 'react';
import { Logo } from '../common/Logo';
import { CategoryType } from '../../types';
import { useAuth } from '../../services/authContext';
import {
  Plus,
  ShieldCheck,
  Archive,
  Sparkles,
  Flame,
  User,
  Home,
  Menu,
  X,
} from 'lucide-react';

interface HeaderProps {
  activeView: 'home' | 'farha' | 'tarha' | 'fazaa' | 'archive' | 'admin';
  onNavigate: (view: 'home' | 'farha' | 'tarha' | 'fazaa' | 'archive' | 'admin') => void;
  onOpenCreate: (category?: CategoryType) => void;
  onOpenAuth: () => void;
  pendingCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onNavigate,
  onOpenCreate,
  onOpenAuth,
  pendingCount = 0,
}) => {
  const { currentUser, isModerator } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleNav = (view: 'home' | 'farha' | 'tarha' | 'fazaa' | 'archive' | 'admin') => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          
          {/* Right: Logo */}
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => handleNav('home')}
              className="text-right cursor-pointer group"
            >
              <Logo size="md" />
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-[#1A2B3C]">
              <button
                type="button"
                onClick={() => handleNav('home')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'home'
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'hover:bg-black/5 text-[#1A2B3C]'
                }`}
              >
                {activeView === 'home' && <span className="w-2 h-2 rounded-full bg-[#F27D26]"></span>}
                <span>الرئيسية</span>
              </button>

              <button
                type="button"
                onClick={() => handleNav('farha')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'farha'
                    ? 'bg-[#10B981] text-white shadow-sm'
                    : 'hover:bg-[#10B981]/10 text-[#0F172A]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>أفراحنا (فرحة)</span>
              </button>

              <button
                type="button"
                onClick={() => handleNav('tarha')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'tarha'
                    ? 'bg-[#7B1D21] text-white shadow-sm'
                    : 'hover:bg-[#7B1D21]/10 text-[#0F172A]'
                }`}
              >
                <span>⚫ أتراحنا (ترحة)</span>
              </button>

              <button
                type="button"
                onClick={() => handleNav('fazaa')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'fazaa'
                    ? 'bg-[#EF4444] text-white shadow-sm'
                    : 'hover:bg-[#EF4444]/10 text-[#0F172A]'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>فزعتنا (فزعة)</span>
              </button>

              <button
                type="button"
                onClick={() => handleNav('archive')}
                className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'archive'
                    ? 'bg-[#0F172A] text-white shadow-sm'
                    : 'hover:bg-black/5 text-[#1A2B3C]'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>الأرشيف</span>
              </button>

              {/* Admin/Moderator Link */}
              {isModerator && (
                <button
                  type="button"
                  onClick={() => handleNav('admin')}
                  className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 relative ${
                    activeView === 'admin'
                      ? 'bg-[#F27D26] text-white shadow-sm'
                      : 'bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30 hover:bg-[#F27D26]/20'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>لوحة الإشراف</span>
                  {pendingCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-[#EF4444] text-white text-[10px] font-black flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </button>
              )}
            </nav>
          </div>

          {/* Left: Actions (Add Announcement + User Persona) */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Primary Action Button: Add Announcement */}
            <button
              type="button"
              onClick={() => onOpenCreate()}
              className="px-4 py-2 sm:py-2.5 bg-[#F27D26] hover:bg-[#e06b17] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-[#F27D26]/20 hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5 group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>إعلان جديد</span>
            </button>

            {/* User Persona Button */}
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] shadow-xs transition-colors text-right cursor-pointer"
              title="حساب المستخدم والإشراف"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-[#0F172A] truncate max-w-[110px]">
                  {currentUser ? currentUser.fullName : 'تسجيل الدخول'}
                </p>
                <p className="text-[10px] text-[#64748B]">
                  {currentUser
                    ? currentUser.role === 'admin'
                      ? 'مدير عام 👑'
                      : currentUser.role === 'moderator'
                      ? 'مشرف 🛡️'
                      : 'مواطن'
                    : 'حساب تجريبي'}
                </p>
              </div>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-[#0F172A] hover:bg-black/5 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E2E8F0] bg-white px-4 pt-3 pb-5 space-y-2 text-right animate-in slide-in-from-top-2 duration-150">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className="w-full text-right py-2.5 px-3 rounded-xl text-sm font-bold text-[#0F172A] hover:bg-[#FDFBF7] flex items-center justify-between"
          >
            <span>الرئيسية</span>
            <Home className="w-4 h-4 text-[#64748B]" />
          </button>

          <button
            type="button"
            onClick={() => handleNav('farha')}
            className="w-full text-right py-2.5 px-3 rounded-xl text-sm font-bold text-[#10B981] hover:bg-[#10B981]/10 flex items-center justify-between"
          >
            <span>أفراحنا (فرحة)</span>
            <Sparkles className="w-4 h-4 text-[#10B981]" />
          </button>

          <button
            type="button"
            onClick={() => handleNav('tarha')}
            className="w-full text-right py-2.5 px-3 rounded-xl text-sm font-bold text-[#7B1D21] hover:bg-[#7B1D21]/10 flex items-center justify-between"
          >
            <span>أتراحنا (ترحة)</span>
            <span>⚫</span>
          </button>

          <button
            type="button"
            onClick={() => handleNav('fazaa')}
            className="w-full text-right py-2.5 px-3 rounded-xl text-sm font-bold text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center justify-between"
          >
            <span>فزعتنا (فزعة)</span>
            <Flame className="w-4 h-4 text-[#EF4444]" />
          </button>

          <button
            type="button"
            onClick={() => handleNav('archive')}
            className="w-full text-right py-2.5 px-3 rounded-xl text-sm font-bold text-[#0F172A] hover:bg-[#FDFBF7] flex items-center justify-between"
          >
            <span>الأرشيف والبحث</span>
            <Archive className="w-4 h-4 text-[#64748B]" />
          </button>

          {isModerator && (
            <button
              type="button"
              onClick={() => handleNav('admin')}
              className="w-full text-right py-2.5 px-3 rounded-xl text-sm font-bold text-[#F27D26] bg-[#F27D26]/10 hover:bg-[#F27D26]/20 flex items-center justify-between border border-[#F27D26]/30"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#F27D26]" />
                <span>لوحة الإشراف والمراجعة</span>
              </div>
              {pendingCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#EF4444] text-white text-xs font-black flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </header>
  );
};
