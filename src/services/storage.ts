import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase/config';
import { Announcement, AnnouncementStatus, CategoryType, ModeratorActionLog, User } from '../types';
import { INITIAL_ANNOUNCEMENTS, INITIAL_USERS } from '../data/seedData';
import { WhatsAppService } from './whatsapp/whatsappService';

const LOCAL_STORAGE_ANNOUNCEMENTS_KEY = 'bouq_announcements_cache_v2';
const LOCAL_STORAGE_USERS_KEY = 'bouq_users_cache_v2';

/**
 * Sanitizes an object by recursively stripping out `undefined` values.
 * Firestore will reject documents containing `undefined` properties.
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, val) => (val === undefined ? null : val))
  );
}

export class StorageService {
  private static instance: StorageService;
  private announcements: Announcement[] = [];
  private users: User[] = [];
  private auditLogs: ModeratorActionLog[] = [];
  private subscribers: (() => void)[] = [];
  private isFirestoreSynced = false;
  private isSeeding = false;
  private authUser: User | null = null;
  private announcementsUnsub: Unsubscribe | null = null;
  private usersUnsub: Unsubscribe | null = null;
  private auditUnsub: Unsubscribe | null = null;

  private constructor() {
    this.loadInitialData();
    this.initFirestoreSync();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Load cached data or fall back to seed data
   */
  private loadInitialData() {
    try {
      const cachedAnn = localStorage.getItem(LOCAL_STORAGE_ANNOUNCEMENTS_KEY);
      if (cachedAnn) {
        const parsed = JSON.parse(cachedAnn);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.announcements = parsed;
        } else {
          this.announcements = [...INITIAL_ANNOUNCEMENTS];
        }
      } else {
        this.announcements = [...INITIAL_ANNOUNCEMENTS];
      }
    } catch {
      this.announcements = [...INITIAL_ANNOUNCEMENTS];
    }

    try {
      const cachedUsers = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (cachedUsers) {
        const parsed = JSON.parse(cachedUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.users = parsed;
        } else {
          this.users = [...INITIAL_USERS];
        }
      } else {
        this.users = [...INITIAL_USERS];
      }
    } catch {
      this.users = [...INITIAL_USERS];
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(LOCAL_STORAGE_ANNOUNCEMENTS_KEY, JSON.stringify(this.announcements));
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(this.users));
    } catch (e) {
      console.warn('LocalStorage save warning:', e);
    }
  }

  /**
   * Set current authenticated user to adjust context if needed
   */
  public setAuthUser(user: User | null) {
    this.authUser = user;
    this.notifyChange();
  }

  /**
   * Connect to Firestore collections and sync all data in real time
   */
  private async initFirestoreSync() {
    if (this.isFirestoreSynced) return;
    this.isFirestoreSynced = true;

    // 1. Real-time onSnapshot for ALL announcements
    try {
      this.announcementsUnsub = onSnapshot(
        collection(db, 'announcements'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Announcement[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as Announcement);
            });

            // Merge with local announcements to preserve newly created ones
            const map = new Map<string, Announcement>();
            this.announcements.forEach((a) => map.set(a.id, a));
            list.forEach((a) => map.set(a.id, a));

            this.announcements = Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            this.saveToLocalStorage();
            this.notifyChange();
          } else if (!this.isSeeding) {
            // Seed initial announcements
            this.seedInitialFirestoreData();
          }
        },
        (error) => {
          console.warn('Firestore announcements listener notice:', error.message);
        }
      );
    } catch (err) {
      console.warn('Error attaching announcements listener:', err);
    }

    // 2. Real-time onSnapshot for Users collection
    try {
      this.usersUnsub = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: User[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as User);
            });
            const map = new Map<string, User>();
            this.users.forEach((u) => map.set(u.id, u));
            list.forEach((u) => map.set(u.id, u));
            this.users = Array.from(map.values());
            this.saveToLocalStorage();
            this.notifyChange();
          }
        },
        (error) => {
          console.warn('Firestore users listener notice:', error.message);
        }
      );
    } catch (err) {
      console.warn('Error attaching users listener:', err);
    }

    // 3. Real-time onSnapshot for Moderation Actions
    try {
      this.auditUnsub = onSnapshot(
        collection(db, 'moderationActions'),
        (snapshot) => {
          const list: ModeratorActionLog[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as ModeratorActionLog);
          });
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          this.auditLogs = list;
          this.notifyChange();
        },
        (error) => {
          console.warn('Firestore moderationActions listener notice:', error.message);
        }
      );
    } catch (err) {
      console.warn('Error attaching audit listener:', err);
    }
  }

  private async seedInitialFirestoreData() {
    this.isSeeding = true;
    try {
      for (const ann of INITIAL_ANNOUNCEMENTS) {
        await setDoc(doc(db, 'announcements', ann.id), sanitizeForFirestore({ ...ann, isDemo: true }));
      }
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u));
      }
    } catch (e) {
      console.warn('Initial seeding note:', e);
    } finally {
      this.isSeeding = false;
    }
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notifyChange() {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in subscriber callback', err);
      }
    });
  }

  public async resetToSeedData(): Promise<void> {
    try {
      this.announcements = [...INITIAL_ANNOUNCEMENTS];
      this.users = [...INITIAL_USERS];
      this.saveToLocalStorage();
      this.notifyChange();

      for (const ann of INITIAL_ANNOUNCEMENTS) {
        await setDoc(doc(db, 'announcements', ann.id), sanitizeForFirestore({ ...ann, isDemo: true }));
      }
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, 'users', u.id), sanitizeForFirestore(u));
      }
      WhatsAppService.getInstance().clearLogs();
    } catch (e) {
      console.error('Failed to reset Firestore seed data', e);
    }
  }

  // ================= Announcements queries & mutations =================
  public getAnnouncements(): Announcement[] {
    return [...this.announcements];
  }

  public getAnnouncementById(id: string): Announcement | undefined {
    return this.announcements.find((a) => a.id === id);
  }

  public getPublishedAnnouncements(category?: CategoryType): Announcement[] {
    return this.announcements
      .filter((a) => {
        const isPub = a.status === 'published';
        if (!isPub) return false;
        if (category) return a.category === category;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getArchivedAnnouncements(): Announcement[] {
    return this.announcements
      .filter((a) => a.status === 'published' || a.status === 'completed' || a.status === 'expired')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async createAnnouncement(
    announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'whatsappDeliveryStatus'>
  ): Promise<Announcement> {
    const newId = `ann_${announcement.category}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const created: Announcement = {
      ...announcement,
      id: newId,
      status: 'pending_review',
      createdAt: now,
      updatedAt: now,
      whatsappDeliveryStatus: 'pending',
    };

    // Update memory and cache immediately
    this.announcements = [created, ...this.announcements.filter((a) => a.id !== newId)];
    this.saveToLocalStorage();
    this.notifyChange();

    // Persist cleanly to Firestore
    try {
      const sanitized = sanitizeForFirestore(created);
      await setDoc(doc(db, 'announcements', newId), sanitized);

      // Increment user announcementsCount
      const user = this.users.find((u) => u.id === announcement.createdByUserId);
      if (user) {
        user.announcementsCount = (user.announcementsCount || 0) + 1;
        this.saveToLocalStorage();
        try {
          await updateDoc(doc(db, 'users', user.id), {
            announcementsCount: user.announcementsCount,
          });
        } catch {
          // Ignore
        }
      }
    } catch (err) {
      console.warn('Firestore write notice for createAnnouncement:', err);
    }

    return created;
  }

  public async updateAnnouncement(
    id: string,
    updates: Partial<Announcement>,
    moderatorId?: string,
    reason?: string
  ): Promise<Announcement | undefined> {
    const existing = this.announcements.find((a) => a.id === id);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const updated: Announcement = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    this.announcements = this.announcements.map((a) => (a.id === id ? updated : a));
    this.saveToLocalStorage();
    this.notifyChange();

    try {
      const sanitized = sanitizeForFirestore(updated);
      await setDoc(doc(db, 'announcements', id), sanitized);

      if (moderatorId) {
        const user = this.getUserById(moderatorId);
        const auditLog: ModeratorActionLog = {
          id: `audit_${Date.now()}`,
          announcementId: id,
          announcementTitle: updated.title,
          category: updated.category,
          action: 'request_modification',
          moderatorId,
          moderatorName: user?.fullName || 'مشرف',
          reason: reason || 'تعديل بيانات الإعلان',
          timestamp: now,
          whatsappDelivered: false,
        };
        await setDoc(doc(db, 'moderationActions', auditLog.id), sanitizeForFirestore(auditLog));
      }
    } catch (err) {
      console.warn('Firestore updateAnnouncement warning:', err);
    }

    return updated;
  }

  /**
   * EXACT APPROVAL ORDER SPECIFIED:
   * 1. Moderator approves
   * 2. Save announcement as published in Firestore
   * 3. Generate complete WhatsApp message & attempt WhatsApp delivery
   * 4. Update WhatsApp delivery status (sent / failed)
   * 
   * CRITICAL GUARANTEE: If WhatsApp delivery fails, announcement REMAINS PUBLISHED.
   */
  public async approveAndPublishAnnouncement(
    id: string,
    moderatorId: string,
    moderatorName: string
  ): Promise<{ announcement: Announcement; whatsappSuccess: boolean; whatsappError?: string }> {
    const announcement = this.announcements.find((a) => a.id === id);
    if (!announcement) throw new Error('الإعلان غير موجود');

    const now = new Date().toISOString();
    const destination = WhatsAppService.getInstance().getDestinationForCategory(announcement.category);

    // STEP 1 & 2: Save announcement as published in Firestore first
    const publishedAnnouncement: Announcement = {
      ...announcement,
      status: 'published',
      publishedAt: now,
      updatedAt: now,
      moderatorId,
      moderatorName,
      moderatedAt: now,
      whatsappDeliveryStatus: 'pending',
      whatsappGroupId: destination.id,
    };

    this.announcements = this.announcements.map((a) => (a.id === id ? publishedAnnouncement : a));
    this.saveToLocalStorage();
    this.notifyChange();

    try {
      await setDoc(doc(db, 'announcements', id), sanitizeForFirestore(publishedAnnouncement));
    } catch (err) {
      console.warn('Firestore save notice:', err);
    }

    // STEP 3: Attempt WhatsApp delivery
    let waSuccess = false;
    let waError: string | undefined;
    let waMessageId: string | undefined;
    let waMessageBody: string | undefined;

    try {
      const waResult = await WhatsAppService.getInstance().sendAnnouncementToGroup(publishedAnnouncement);
      waSuccess = waResult.success;
      waError = waResult.error;
      waMessageId = waResult.messageId;
      waMessageBody = waResult.messageBody;
    } catch (err: unknown) {
      waSuccess = false;
      waError = err instanceof Error ? err.message : 'فشل إرسال رسالة واتساب';
    }

    // STEP 4: Update WhatsApp delivery status on the published announcement
    const finalAnnouncement: Announcement = {
      ...publishedAnnouncement,
      whatsappDeliveryStatus: waSuccess ? 'sent' : 'failed',
      whatsappSentAt: waSuccess ? new Date().toISOString() : undefined,
      whatsappMessageId: waMessageId,
      whatsappMessageBody: waMessageBody,
      whatsappError: waError,
    };

    this.announcements = this.announcements.map((a) => (a.id === id ? finalAnnouncement : a));
    this.saveToLocalStorage();
    this.notifyChange();

    try {
      await setDoc(doc(db, 'announcements', id), sanitizeForFirestore(finalAnnouncement));

      const auditLog: ModeratorActionLog = {
        id: `audit_${Date.now()}`,
        announcementId: id,
        announcementTitle: announcement.title,
        category: announcement.category,
        action: 'approve',
        moderatorId,
        moderatorName,
        timestamp: now,
        whatsappDelivered: waSuccess,
      };
      await setDoc(doc(db, 'moderationActions', auditLog.id), sanitizeForFirestore(auditLog));
    } catch (err) {
      console.warn('Firestore audit save warning:', err);
    }

    return {
      announcement: finalAnnouncement,
      whatsappSuccess: waSuccess,
      whatsappError: waError,
    };
  }

  /**
   * Retry WhatsApp delivery for an already published announcement
   */
  public async retryWhatsAppDelivery(
    id: string,
    moderatorId: string,
    moderatorName: string
  ): Promise<{ success: boolean; error?: string }> {
    const announcement = this.announcements.find((a) => a.id === id);
    if (!announcement) throw new Error('الإعلان غير موجود');

    try {
      const waResult = await WhatsAppService.getInstance().sendAnnouncementToGroup(announcement);
      const now = new Date().toISOString();

      const updated: Announcement = {
        ...announcement,
        whatsappDeliveryStatus: waResult.success ? 'sent' : 'failed',
        whatsappSentAt: waResult.success ? now : announcement.whatsappSentAt,
        whatsappMessageId: waResult.messageId,
        whatsappMessageBody: waResult.messageBody,
        whatsappError: waResult.error,
        updatedAt: now,
      };

      this.announcements = this.announcements.map((a) => (a.id === id ? updated : a));
      this.saveToLocalStorage();
      this.notifyChange();

      await setDoc(doc(db, 'announcements', id), sanitizeForFirestore(updated));

      const auditLog: ModeratorActionLog = {
        id: `audit_retry_${Date.now()}`,
        announcementId: id,
        announcementTitle: announcement.title,
        category: announcement.category,
        action: 'approve',
        moderatorId,
        moderatorName,
        timestamp: now,
        reason: waResult.success ? 'إعادة إرسال واتساب بنجاح' : 'إعادة محاولة إرسال واتساب',
        whatsappDelivered: waResult.success,
      };
      await setDoc(doc(db, 'moderationActions', auditLog.id), sanitizeForFirestore(auditLog));

      return {
        success: waResult.success,
        error: waResult.error,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'فشل إعادة الإرسال',
      };
    }
  }

  /**
   * Moderator Rejection
   */
  public async rejectAnnouncement(
    id: string,
    moderatorId: string,
    moderatorName: string,
    reason: string
  ): Promise<Announcement> {
    const announcement = this.announcements.find((a) => a.id === id);
    if (!announcement) throw new Error('الإعلان غير موجود');

    const now = new Date().toISOString();
    const updatedAnnouncement: Announcement = {
      ...announcement,
      status: 'rejected',
      moderationReason: reason,
      moderatorId,
      moderatorName,
      moderatedAt: now,
      updatedAt: now,
      whatsappDeliveryStatus: 'not_sent',
    };

    this.announcements = this.announcements.map((a) => (a.id === id ? updatedAnnouncement : a));
    this.saveToLocalStorage();
    this.notifyChange();

    try {
      await setDoc(doc(db, 'announcements', id), sanitizeForFirestore(updatedAnnouncement));

      const auditLog: ModeratorActionLog = {
        id: `audit_${Date.now()}`,
        announcementId: id,
        announcementTitle: announcement.title,
        category: announcement.category,
        action: 'reject',
        moderatorId,
        moderatorName,
        reason,
        timestamp: now,
        whatsappDelivered: false,
      };
      await setDoc(doc(db, 'moderationActions', auditLog.id), sanitizeForFirestore(auditLog));
    } catch (err) {
      console.warn('Firestore rejectAnnouncement warning:', err);
    }

    return updatedAnnouncement;
  }

  /**
   * Moderator Requests Modification
   */
  public async requestModification(
    id: string,
    moderatorId: string,
    moderatorName: string,
    reason: string
  ): Promise<Announcement> {
    const announcement = this.announcements.find((a) => a.id === id);
    if (!announcement) throw new Error('الإعلان غير موجود');

    const now = new Date().toISOString();
    const updatedAnnouncement: Announcement = {
      ...announcement,
      status: 'needs_modification',
      moderationReason: reason,
      moderatorId,
      moderatorName,
      moderatedAt: now,
      updatedAt: now,
    };

    this.announcements = this.announcements.map((a) => (a.id === id ? updatedAnnouncement : a));
    this.saveToLocalStorage();
    this.notifyChange();

    try {
      await setDoc(doc(db, 'announcements', id), sanitizeForFirestore(updatedAnnouncement));

      const auditLog: ModeratorActionLog = {
        id: `audit_${Date.now()}`,
        announcementId: id,
        announcementTitle: announcement.title,
        category: announcement.category,
        action: 'request_modification',
        moderatorId,
        moderatorName,
        reason,
        timestamp: now,
        whatsappDelivered: false,
      };
      await setDoc(doc(db, 'moderationActions', auditLog.id), sanitizeForFirestore(auditLog));
    } catch (err) {
      console.warn('Firestore requestModification warning:', err);
    }

    return updatedAnnouncement;
  }

  /**
   * Mark Completed or Expired
   */
  public async markStatus(
    id: string,
    status: AnnouncementStatus,
    moderatorId: string,
    moderatorName: string,
    reason?: string
  ): Promise<Announcement> {
    const announcement = this.announcements.find((a) => a.id === id);
    if (!announcement) throw new Error('الإعلان غير موجود');

    const now = new Date().toISOString();
    const updatedAnnouncement: Announcement = {
      ...announcement,
      status,
      updatedAt: now,
    };

    this.announcements = this.announcements.map((a) => (a.id === id ? updatedAnnouncement : a));
    this.saveToLocalStorage();
    this.notifyChange();

    try {
      await setDoc(doc(db, 'announcements', id), sanitizeForFirestore(updatedAnnouncement));

      const auditLog: ModeratorActionLog = {
        id: `audit_${Date.now()}`,
        announcementId: id,
        announcementTitle: announcement.title,
        category: announcement.category,
        action: status === 'completed' ? 'complete' : 'pause',
        moderatorId,
        moderatorName,
        reason: reason || `تغيير الحالة إلى ${status}`,
        timestamp: now,
        whatsappDelivered: false,
      };
      await setDoc(doc(db, 'moderationActions', auditLog.id), sanitizeForFirestore(auditLog));
    } catch (err) {
      console.warn('Firestore markStatus warning:', err);
    }

    return updatedAnnouncement;
  }

  // ================= User operations =================
  public getUsers(): User[] {
    return [...this.users];
  }

  public getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  public getUserByPhone(phone: string): User | undefined {
    return this.users.find((u) => u.phone === phone.trim());
  }

  public async registerOrLoginUser(fullName: string, phone: string, customUid?: string): Promise<User> {
    const cleanPhone = phone.trim();
    let user = this.users.find((u) => u.phone === cleanPhone || (customUid && u.id === customUid));

    if (!user) {
      const uid = customUid || `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      user = {
        id: uid,
        fullName: fullName.trim() || 'مواطن كريم',
        phone: cleanPhone,
        role: 'user',
        createdAt: new Date().toISOString(),
        announcementsCount: 0,
        status: 'active',
        verified: true,
      };
      this.users.push(user);
    } else {
      if (fullName && user.fullName !== fullName.trim()) {
        user = { ...user, fullName: fullName.trim() };
        this.users = this.users.map((u) => (u.id === user?.id ? user! : u));
      }
    }

    this.saveToLocalStorage();
    this.notifyChange();

    try {
      await setDoc(doc(db, 'users', user.id), sanitizeForFirestore(user));
    } catch (err) {
      console.warn('User doc save notice:', err);
    }

    return user;
  }

  public async updateUserRole(userId: string, newRole: 'user' | 'moderator' | 'admin'): Promise<void> {
    this.users = this.users.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    
    // If updating current active user
    if (this.authUser && this.authUser.id === userId) {
      this.authUser = { ...this.authUser, role: newRole };
    }

    this.saveToLocalStorage();
    this.notifyChange();

    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
      });
    } catch (err) {
      console.warn('User role update notice in Firestore:', err);
    }
  }

  public getAuditLogs(): ModeratorActionLog[] {
    return [...this.auditLogs];
  }

  public getStatistics() {
    const total = this.announcements.length;
    const farhaCount = this.announcements.filter((a) => a.category === 'farha').length;
    const tarhaCount = this.announcements.filter((a) => a.category === 'tarha').length;
    const fazaaCount = this.announcements.filter((a) => a.category === 'fazaa').length;
    const pendingCount = this.announcements.filter((a) => a.status === 'pending_review' || a.status === 'needs_modification').length;
    const publishedCount = this.announcements.filter((a) => a.status === 'published').length;
    const urgentFazaaCount = this.announcements.filter(
      (a) =>
        a.category === 'fazaa' &&
        (a.fazaaDetails?.urgency === 'urgent' || a.fazaaDetails?.urgency === 'critical') &&
        a.status === 'published'
    ).length;

    return {
      total,
      farhaCount,
      tarhaCount,
      fazaaCount,
      pendingCount,
      publishedCount,
      urgentFazaaCount,
      usersCount: this.users.length,
    };
  }
}
