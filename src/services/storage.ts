import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase/config';
import { Announcement, AnnouncementStatus, CategoryType, ModeratorActionLog, User } from '../types';
import { INITIAL_ANNOUNCEMENTS, INITIAL_USERS } from '../data/seedData';
import { WhatsAppService } from './whatsapp/whatsappService';

export class StorageService {
  private static instance: StorageService;
  private announcements: Announcement[] = [];
  private users: User[] = [];
  private auditLogs: ModeratorActionLog[] = [];
  private subscribers: (() => void)[] = [];
  private isFirestoreSynced = false;
  private isSeeding = false;

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
   * Connect to Firestore collections and sync in real time
   */
  private async initFirestoreSync() {
    if (this.isFirestoreSynced) return;
    this.isFirestoreSynced = true;

    // 1. Initial check & seed Firestore if collections are empty
    try {
      const annSnap = await getDocs(collection(db, 'announcements'));
      if (annSnap.empty && !this.isSeeding) {
        this.isSeeding = true;
        for (const ann of INITIAL_ANNOUNCEMENTS) {
          await setDoc(doc(db, 'announcements', ann.id), {
            ...ann,
            isDemo: true,
          });
        }
        this.isSeeding = false;
      }
    } catch (err) {
      console.warn('Firestore initial announcements check:', err);
    }

    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      if (usersSnap.empty) {
        for (const u of INITIAL_USERS) {
          await setDoc(doc(db, 'users', u.id), u);
        }
      }
    } catch (err) {
      console.warn('Firestore initial users check:', err);
    }

    // 2. Real-time onSnapshot for Announcements
    try {
      onSnapshot(
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
        (error) => {
          console.warn('Firestore announcements listener notice:', error.message);
        }
      );
    } catch (err) {
      console.warn('Error attaching announcements listener', err);
    }

    // 3. Real-time onSnapshot for Users
    try {
      onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          const list: User[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as User);
          });
          this.users = list;
          this.notifyChange();
        },
        (error) => {
          console.warn('Firestore users listener notice:', error.message);
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
          console.warn('Firestore moderationActions listener notice:', error.message);
        }
      );
    } catch (err) {
      console.warn('Error attaching audit listener', err);
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

      // Increment user announcementsCount
      const user = this.users.find((u) => u.id === announcement.createdByUserId);
      if (user) {
        await updateDoc(doc(db, 'users', user.id), {
          announcementsCount: (user.announcementsCount || 0) + 1,
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `announcements/${newId}`);
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
   * Moderator Approval Workflow: Updates status & triggers single WhatsApp group dispatch
   */
  public async approveAndPublishAnnouncement(
    id: string,
    moderatorId: string,
    moderatorName: string
  ): Promise<{ announcement: Announcement; whatsappSuccess: boolean; whatsappError?: string }> {
    const announcement = this.announcements.find((a) => a.id === id);
    if (!announcement) throw new Error('الإعلان غير موجود');

    const now = new Date().toISOString();

    // 1. Dispatch to designated single WhatsApp group
    const waResult = await WhatsAppService.getInstance().sendAnnouncementToGroup(announcement);
    const destination = WhatsAppService.getInstance().getDestinationForCategory(announcement.category);

    const updatedAnnouncement: Announcement = {
      ...announcement,
      status: 'published',
      publishedAt: now,
      updatedAt: now,
      moderatorId,
      moderatorName,
      moderatedAt: now,
      whatsappDeliveryStatus: waResult.success ? 'sent' : 'failed',
      whatsappSentAt: waResult.success ? now : undefined,
      whatsappMessageId: waResult.messageId,
      whatsappMessageBody: waResult.messageBody,
      whatsappGroupId: destination.id,
      whatsappError: waResult.error,
    };

    // 2. Persist to Firestore
    try {
      await setDoc(doc(db, 'announcements', id), updatedAnnouncement);

      // 3. Record Audit Log
      const auditLog: ModeratorActionLog = {
        id: `audit_${Date.now()}`,
        announcementId: id,
        announcementTitle: announcement.title,
        category: announcement.category,
        action: 'approve',
        moderatorId,
        moderatorName,
        timestamp: now,
        whatsappDelivered: waResult.success,
      };
      await setDoc(doc(db, 'moderationActions', auditLog.id), auditLog);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `announcements/${id}`);
    }

    return {
      announcement: updatedAnnouncement,
      whatsappSuccess: waResult.success,
      whatsappError: waResult.error,
    };
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
      handleFirestoreError(err, OperationType.WRITE, `users/${user.id}`);
    }

    return user;
  }

  public async updateUserRole(userId: string, newRole: 'user' | 'moderator' | 'admin'): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
      });
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
