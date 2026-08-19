import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './services/authContext';
import { StorageService } from './services/storage';
import { Announcement, CategoryType } from './types';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomeView } from './components/home/HomeView';
import { ArchiveView } from './components/archive/ArchiveView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AnnouncementDetailModal } from './components/announcement/AnnouncementDetailModal';
import { CreateAnnouncementModal } from './components/announcement/CreateAnnouncementModal';
import { ModerationModal } from './components/admin/ModerationModal';
import { ShareModal } from './components/announcement/ShareModal';
import { AuthModal } from './components/auth/AuthModal';

type AppView = 'home' | 'farha' | 'tarha' | 'fazaa' | 'archive' | 'admin';

function AppContent() {
  const { currentUser, isModerator } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [shareAnnouncement, setShareAnnouncement] = useState<Announcement | null>(null);
  const [moderatingAnnouncement, setModeratingAnnouncement] = useState<Announcement | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createInitialCategory, setCreateInitialCategory] = useState<CategoryType | undefined>(undefined);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [, setRefreshKey] = useState(0);

  const storage = StorageService.getInstance();
  const stats = storage.getStatistics();

  // Listen to hash changes for deep linking to /#announcement-XXXX
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#announcement-')) {
        const id = hash.replace('#announcement-', '');
        const ann = storage.getAnnouncementById(id);
        if (ann) {
          setSelectedAnnouncement(ann);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleOpenCreate = (category?: CategoryType) => {
    setCreateInitialCategory(category);
    setIsCreateModalOpen(true);
  };

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A2B3C] flex flex-col font-cairo antialiased" dir="rtl">
      
      {/* Header Navigation */}
      <Header
        activeView={currentView}
        onNavigate={handleNavigate}
        onOpenCreate={handleOpenCreate}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        pendingCount={stats.pendingCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* VIEW 1: HOME */}
        {currentView === 'home' && (
          <HomeView
            onSelectCategory={(cat) => setCurrentView(cat)}
            onSelectAnnouncement={(ann) => setSelectedAnnouncement(ann)}
            onOpenCreate={handleOpenCreate}
            onNavigateToArchive={() => setCurrentView('archive')}
            onShareAnnouncement={(ann) => setShareAnnouncement(ann)}
          />
        )}

        {/* VIEW 2: FARHA CATEGORY */}
        {currentView === 'farha' && (
          <HomeView
            categoryFilter="farha"
            onSelectCategory={(cat) => setCurrentView(cat)}
            onSelectAnnouncement={(ann) => setSelectedAnnouncement(ann)}
            onOpenCreate={handleOpenCreate}
            onNavigateToArchive={() => setCurrentView('archive')}
            onShareAnnouncement={(ann) => setShareAnnouncement(ann)}
          />
        )}

        {/* VIEW 3: TARHA CATEGORY */}
        {currentView === 'tarha' && (
          <HomeView
            categoryFilter="tarha"
            onSelectCategory={(cat) => setCurrentView(cat)}
            onSelectAnnouncement={(ann) => setSelectedAnnouncement(ann)}
            onOpenCreate={handleOpenCreate}
            onNavigateToArchive={() => setCurrentView('archive')}
            onShareAnnouncement={(ann) => setShareAnnouncement(ann)}
          />
        )}

        {/* VIEW 4: FAZAA CATEGORY */}
        {currentView === 'fazaa' && (
          <HomeView
            categoryFilter="fazaa"
            onSelectCategory={(cat) => setCurrentView(cat)}
            onSelectAnnouncement={(ann) => setSelectedAnnouncement(ann)}
            onOpenCreate={handleOpenCreate}
            onNavigateToArchive={() => setCurrentView('archive')}
            onShareAnnouncement={(ann) => setShareAnnouncement(ann)}
          />
        )}

        {/* VIEW 5: ARCHIVE & SEARCH */}
        {currentView === 'archive' && (
          <ArchiveView
            onSelectAnnouncement={(ann) => setSelectedAnnouncement(ann)}
            onShareAnnouncement={(ann) => setShareAnnouncement(ann)}
          />
        )}

        {/* VIEW 6: ADMIN & MODERATION DASHBOARD */}
        {currentView === 'admin' && (
          <AdminDashboard
            onSelectAnnouncement={(ann) => setSelectedAnnouncement(ann)}
            onRefreshData={triggerRefresh}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenCreate={handleOpenCreate}
      />

      {/* MODALS */}

      {/* 1. Announcement Detail Modal */}
      <AnnouncementDetailModal
        announcement={selectedAnnouncement}
        isOpen={!!selectedAnnouncement}
        onClose={() => {
          setSelectedAnnouncement(null);
          if (window.location.hash.startsWith('#announcement-')) {
            history.pushState('', document.title, window.location.pathname + window.location.search);
          }
        }}
        isModerator={isModerator}
        onOpenModeration={(ann) => {
          setSelectedAnnouncement(null);
          setModeratingAnnouncement(ann);
        }}
      />

      {/* 2. Create Announcement Modal */}
      <CreateAnnouncementModal
        isOpen={isCreateModalOpen}
        initialCategory={createInitialCategory}
        onClose={() => setIsCreateModalOpen(false)}
        onAnnouncementCreated={() => {
          triggerRefresh();
        }}
      />

      {/* 3. Moderator Decision Modal */}
      <ModerationModal
        announcement={moderatingAnnouncement}
        isOpen={!!moderatingAnnouncement}
        onClose={() => setModeratingAnnouncement(null)}
        onActionComplete={() => {
          setModeratingAnnouncement(null);
          triggerRefresh();
        }}
      />

      {/* 4. Share Announcement Modal */}
      <ShareModal
        announcement={shareAnnouncement}
        isOpen={!!shareAnnouncement}
        onClose={() => setShareAnnouncement(null)}
      />

      {/* 5. User Login & Persona Switcher Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
