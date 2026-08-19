import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase/config';
import { Announcement, AnnouncementStatus, CategoryType, ModeratorActionLog, User } from '../types';
import { INITIAL_ANNOUNCEMENTS, INITIAL_USERS } from '../data/seedData';
import { WhatsAppService } from './whatsapp/whatsappService';

export class StorageService {
  private static instance: StorageService;
  private announcements: Announcement[] = [...INITIAL_ANNOUNCEMENTS];
  private users: User[] = [...INITIAL_USERS];
  private auditLogs: ModeratorActionLog[] = [];
  private subscribers: (() => void)[] = [];
  private isFirestoreSynced = false;
  private isSeeding = false;
  private authUser: User | null = null;
  private announcementsUnsub: Unsubscribe | null = null;
  private userAnnouncementsUnsub: Unsubscribe | null = null;

  private constructor() {
    this.initFirestoreSync();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Set current authenticated user to adjust Firestore listeners
   */
  public setAuthUser(user: User | null) {
    this.authUser = user;
    this.setupAnnouncementsListener();
  }

  /**
   * Connect to Firestore collections and sync in real time
   */
  private async initFirestoreSync() {
    if (this.isFirestoreSynced) return;
    this.isFirestoreSynced = true;

    // 1. Initial seed check for fresh preview environments
    try {
      const q = query(collection(db, 'announcements'), where('status', 'in', ['published', 'completed', 'expired']));
      const annSnap = await getDocs(q);
      if (annSnap.empty && !this.isSeeding) {
        this.isSeeding = true;
        for (const ann of INITIAL_ANNOUNCEMENTS) {
          try {
            await setDoc(doc(db, 'announcements', ann.id), {
              ...ann,
              isDemo: true,
            });
          } catch {
            // Ignored if unauthenticated
          }
        }
        this.isSeeding = false;
      }
    } catch (err) {
      console.warn('Firestore announcements seed note:', err);
    }

    // 2. Setup announcements listener
    this.setupAnnouncementsListener();

    // 3. Sync Users collection for moderators/admins
    try {
      onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          const list: User[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as User);
          });
          if (list.length > 0) {
            // Merge with local list
            const map = new Map<string, User>();
            this.users.forEach((u) => map.set(u.id, u));
            list.forEach((u) => map.set(u.id, u));
            this.users = Array.from(map.values());
            this.notifyChange();
          }
        },
        (error) => {
          if (error.code !== 'permission-denied') {
            console.warn('Firestore users listener notice:', error.message);
          }
        }
      );
    } catch (err) {
      console.warn('Error attaching users listener', err);
    }

    // 4. Real-time onSnapshot for Moderation Actions
    try {
      onSnapshot(
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
          if (error.code !== 'permission-denied') {
            console.warn('Firestore moderationActions listener notice:', error.message);
          }
        }
      );
    } catch (err) {
      console.warn('Error attaching audit listener', err);
    }
  }

  private setupAnnouncementsListener() {
    if (this.announcementsUnsub) {
      this.announcementsUnsub();
      this.announcementsUnsub = null;
    }
    if (this.userAnnouncementsUnsub) {
      this.userAnnouncementsUnsub();
      this.userAnnouncementsUnsub = null;
    }

    const isModOrAdmin = this.authUser?.role === 'moderator' || this.authUser?.role === 'admin';

    if (isModOrAdmin) {
      // Moderator / Admin query: fetch all announcements
      try {
        this.announcementsUnsub = onSnapshot(
          collection(db, 'announcements'),
          (snapshot) => {
            const list: Announcement[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as Announcement);
            });
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            this.announcements = list;
            this.notifyChange();
          },
          (err) => {
            console.warn('Moderator announcements sync note:', err.message);
          }
        );
      } catch (e) {
        console.warn('Error in moderator announcements listener', e);
      }
    } else {
      // Public query: fetch published/completed/expired
      try {
        const publicQuery = query(
          collection(db, 'announcements'),
          where('status', 'in', ['published', 'completed', 'expired'])
        );
        this.announcementsUnsub = onSnapshot(
          publicQuery,
          (snapshot) => {
            const publicList: Announcement[] = [];
            snapshot.forEach((docSnap) => {
              publicList.push(docSnap.data() as Announcement);
            });

            // Merge with any existing user submissions in memory
            const map = new Map<string, Announcement>();
            publicList.forEach((a) => map.set(a.id, a));
            this.announcements.forEach((a) => {
              if (this.authUser && a.createdByUserId === this.authUser.id) {
                map.set(a.id, a);
              }
            });

            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            this.announcements = merged;
            this.notifyChange();
          },
          (err) => {
            console.warn('Public announcements sync note:', err.message);
          }
        );
      } catch (e) {
        console.warn('Error in public announcements listener', e);
      }

      // If user is authenticated, also listen for user's own submissions
      if (this.authUser) {
        try {
          const userQuery = query(
            collection(db, 'announcements'),
            where('createdByUserId', '==', this.authUser.id)
          );
          this.userAnnouncementsUnsub = onSnapshot(
            userQuery,
            (snapshot) => {
              const userList: Announcement[] = [];
              snapshot.forEach((docSnap) => {
                userList.push(docSnap.data() as Announcement);
              });

              const map = new Map<string, Announcement>();
              this.announcements.forEach((a) => map.set(a.id, a));
              userList.forEach((a) => map.set(a.id, a));

              const merged = Array.from(map.values()).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
              this.announcements = merged;
              this.notifyChange();
            },
            (err) => {
              if (err.code !== 'permission-denied') {
                console.warn('User announcements sync note:', err.message);
              }
            }
          );
        } catch (e) {
          console.warn('Error in user announcements listener', e);
        }
      }
    }
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notifyChange() {
    this.subscribers.forEach((cb) => cb());
  }

  public async resetToSeedData(): Promise<void> {
    try {
      for (const ann of INITIAL_ANNOUNCEMENTS) {
        await setDoc(doc(db, 'announcements', ann.id), { ...ann, isDemo: true });
      }
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, 'users', u.id), u);
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

    // Optimistic memory update
    this.announcements.unshift(created);
    this.notifyChange();

    // Persist to Firestore
    try {
      await setDoc(doc(db, 'announcements', newId), created);

      // Try incrementing user announcementsCount
      const user = this.users.find((u) => u.id === announcement.createdByUserId);
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.id), {
            announcementsCount: (user.announcementsCount || 0) + 1,
          });
        } catch {
          // Ignored
        }
      }
    } catch (err) {
      console.warn('Firestore write warning for createAnnouncement:', err);
      // Still return the created announcement so the user is not stuck
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

    // Update in memory
    this.announcements = this.announcements.map((a) => (a.id === id ? updated : a));
    this.notifyChange();

    try {
      await setDoc(doc(db, 'announcements', id), updated);

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
        await setDoc(doc(db, 'moderationActions', auditLog.id), auditLog);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `announcements/${id}`);
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
   * whatsappDeliveryStatus is marked as 'failed', error is stored, and moderator can retry later.
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

    // Update in memory immediately
    this.announcements = this.announcements.map((a) => (a.id === id ? publishedAnnouncement : a));
    this.notifyChange();

    // Save initial published state
    try {
      await setDoc(doc(db, 'announcements', id), publishedAnnouncement);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `announcements/${id}`);
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
    this.notifyChange();

    try {
      await setDoc(doc(db, 'announcements', id), finalAnnouncement);

      // Record Moderator Audit Log
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
      await setDoc(doc(db, 'moderationActions', auditLog.id), auditLog);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `announcements/${id}`);
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
      this.notifyChange();

      await setDoc(doc(db, 'announcements', id), updated);

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
      await setDoc(doc(db, 'moderationActions', auditLog.id), auditLog);

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
    this.notifyChange();

    try {
      await setDoc(doc(db, 'announcements', id), updatedAnnouncement);

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
      await setDoc(doc(db, 'moderationActions', auditLog.id), auditLog);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `announcements/${id}`);
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
    this.notifyChange();

    try {
      await setDoc(doc(db, 'announcements', id), updatedAnnouncement);

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
      await setDoc(doc(db, 'moderationActions', auditLog.id), auditLog);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `announcements/${id}`);
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
    this.notifyChange();

    try {
      await setDoc(doc(db, 'announcements', id), updatedAnnouncement);

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
      await setDoc(doc(db, 'moderationActions', auditLog.id), auditLog);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `announcements/${id}`);
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
    } else {
      if (fullName && user.fullName !== fullName.trim()) {
        user = { ...user, fullName: fullName.trim() };
      }
    }

    try {
      await setDoc(doc(db, 'users', user.id), user);
    } catch (err) {
      console.warn('User doc save notice:', err);
    }

    return user;
  }

  public async updateUserRole(userId: string, newRole: 'user' | 'moderator' | 'admin'): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
      });
      this.users = this.users.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
      this.notifyChange();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
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
    const pendingCount = this.announcements.filter((a) => a.status === 'pending_review').length;
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
