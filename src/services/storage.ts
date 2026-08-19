import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase/config';
import { Announcement, AnnouncementStatus, CategoryType, ModeratorActionLog, User } from '../types';
import { INITIAL_ANNOUNCEMENTS, INITIAL_USERS } from '../data/seedData';
import { WhatsAppService } from './whatsapp/whatsappService';

const STORAGE_KEY_ANNOUNCEMENTS = 'booq_announcements_v1';
const STORAGE_KEY_USERS = 'booq_users_v1';
const STORAGE_KEY_AUDIT = 'booq_audit_logs_v1';

export class StorageService {
  private static instance: StorageService;
  private announcements: Announcement[] = [];
  private users: User[] = [];
  private auditLogs: ModeratorActionLog[] = [];
  private listeners: (() => void)[] = [];
  private isInitialized = false;

  private constructor() {
    this.initLocalCache();
    this.initFirestoreSync();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private initLocalCache() {
    try {
      const storedAnn = localStorage.getItem(STORAGE_KEY_ANNOUNCEMENTS);
      this.announcements = storedAnn ? JSON.parse(storedAnn) : [...INITIAL_ANNOUNCEMENTS];
    } catch {
      this.announcements = [...INITIAL_ANNOUNCEMENTS];
    }

    try {
      const storedUsers = localStorage.getItem(STORAGE_KEY_USERS);
      this.users = storedUsers ? JSON.parse(storedUsers) : [...INITIAL_USERS];
    } catch {
      this.users = [...INITIAL_USERS];
    }

    try {
      const storedAudit = localStorage.getItem(STORAGE_KEY_AUDIT);
      this.auditLogs = storedAudit ? JSON.parse(storedAudit) : [];
    } catch {
      this.auditLogs = [];
    }
  }

  private persistLocal() {
    try {
      localStorage.setItem(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(this.announcements));
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(this.users));
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(this.auditLogs));
    } catch (e) {
      console.warn('Could not persist to localStorage', e);
    }
  }

  /**
   * Subscribe to live Firestore collections and seed initial records if empty
   */
  private async initFirestoreSync() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // 1. Check if announcements collection has documents
      const annSnap = await getDocs(collection(db, 'announcements'));
      if (annSnap.empty) {
        // Seed Firestore with initial announcements
        for (const ann of INITIAL_ANNOUNCEMENTS) {
          await setDoc(doc(db, 'announcements', ann.id), {
            ...ann,
            isDemo: true,
          });
        }
      }

      // 2. Check users collection
      const usersSnap = await getDocs(collection(db, 'users'));
      if (usersSnap.empty) {
        for (const u of INITIAL_USERS) {
          await setDoc(doc(db, 'users', u.id), u);
        }
      }
    } catch (err) {
      console.warn('Initial Firestore seeding check had an error or is offline', err);
    }

    // 3. Attach real-time snapshot listener for announcements
    try {
      const unsubAnn = onSnapshot(
        collection(db, 'announcements'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Announcement[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as Announcement);
            });
            // Sort by createdAt descending
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            this.announcements = list;
            this.persistLocal();
            this.notifyChange();
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'announcements');
        }
      );
      this.listeners.push(unsubAnn);
    } catch (err) {
      console.warn('Error setting up announcements real-time listener', err);
    }

    // 4. Attach real-time listener for users
    try {
      const unsubUsers = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: User[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as User);
            });
            this.users = list;
            this.persistLocal();
            this.notifyChange();
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'users');
        }
      );
      this.listeners.push(unsubUsers);
    } catch (err) {
      console.warn('Error setting up users real-time listener', err);
    }

    // 5. Attach real-time listener for audit logs
    try {
      const unsubAudit = onSnapshot(
        collection(db, 'moderationActions'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: ModeratorActionLog[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as ModeratorActionLog);
            });
            list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            this.auditLogs = list;
            this.persistLocal();
            this.notifyChange();
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'moderationActions');
        }
      );
      this.listeners.push(unsubAudit);
    } catch (err) {
      console.warn('Error setting up audit real-time listener', err);
    }
  }

  private subscribers: (() => void)[] = [];
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
    this.announcements = [...INITIAL_ANNOUNCEMENTS];
    this.users = [...INITIAL_USERS];
    this.auditLogs = [];
    this.persistLocal();

    try {
      // Re-seed Firestore
      for (const ann of INITIAL_ANNOUNCEMENTS) {
        await setDoc(doc(db, 'announcements', ann.id), { ...ann, isDemo: true });
      }
      for (const u of INITIAL_USERS) {
        await setDoc(doc(db, 'users', u.id), u);
      }
    } catch (e) {
      console.error('Failed to reset Firestore seed data', e);
    }

    WhatsAppService.getInstance().clearLogs();
    this.notifyChange();
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

  public createAnnouncement(
    announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'whatsappDeliveryStatus'>
  ): Announcement {
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

    // Update local immediately
    this.announcements.unshift(created);
    this.persistLocal();

    // Increment user count
    const user = this.users.find((u) => u.id === announcement.createdByUserId);
    if (user) {
      user.announcementsCount = (user.announcementsCount || 0) + 1;
      this.persistLocal();
      setDoc(doc(db, 'users', user.id), user).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `users/${user.id}`)
      );
    }

    // Persist to Firestore
    setDoc(doc(db, 'announcements', newId), created).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `announcements/${newId}`)
    );

    this.notifyChange();
    return created;
  }

  public updateAnnouncement(
    id: string,
    updates: Partial<Announcement>,
    moderatorId?: string,
    reason?: string
  ): Announcement | undefined {
    const index = this.announcements.findIndex((a) => a.id === id);
    if (index === -1) return undefined;

    const existing = this.announcements[index];
    const now = new Date().toISOString();

    const updated: Announcement = {
      ...existing,
      ...updates,
      updatedAt: now,
    };

    this.announcements[index] = updated;
    this.persistLocal();

    // Persist to Firestore
    setDoc(doc(db, 'announcements', id), updated).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `announcements/${id}`)
    );

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
      this.auditLogs.unshift(auditLog);
      this.persistLocal();
      setDoc(doc(db, 'moderationActions', auditLog.id), auditLog).catch((err) =>
        handleFirestoreError(err, OperationType.WRITE, `moderationActions/${auditLog.id}`)
      );
    }

    this.notifyChange();
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
    const index = this.announcements.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('الإعلان غير موجود');

    const announcement = this.announcements[index];
    const now = new Date().toISOString();

    // Dispatch to WhatsApp
    const waResult = await WhatsAppService.getInstance().sendAnnouncementToGroup(announcement);
    const destination = WhatsAppService.getInstance().getDestinationForCategory(announcement.category);

    announcement.status = 'published';
    announcement.publishedAt = now;
    announcement.updatedAt = now;
    announcement.moderatorId = moderatorId;
    announcement.moderatorName = moderatorName;
    announcement.moderatedAt = now;
    announcement.whatsappDeliveryStatus = waResult.success ? 'sent' : 'failed';
    announcement.whatsappSentAt = waResult.success ? now : undefined;
    announcement.whatsappMessageId = waResult.messageId;
    announcement.whatsappMessageBody = waResult.messageBody;
    announcement.whatsappGroupId = destination.id;
    if (waResult.error) {
      announcement.whatsappError = waResult.error;
    }

    this.announcements[index] = announcement;
    this.persistLocal();

    // Firestore update
    await setDoc(doc(db, 'announcements', id), announcement).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `announcements/${id}`)
    );

    // Audit log
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
    this.auditLogs.unshift(auditLog);
    this.persistLocal();

    setDoc(doc(db, 'moderationActions', auditLog.id), auditLog).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `moderationActions/${auditLog.id}`)
    );

    this.notifyChange();
    return {
      announcement,
      whatsappSuccess: waResult.success,
      whatsappError: waResult.error,
    };
  }

  /**
   * Moderator Rejection
   */
  public rejectAnnouncement(id: string, moderatorId: string, moderatorName: string, reason: string): Announcement {
    const index = this.announcements.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('الإعلان غير موجود');

    const announcement = this.announcements[index];
    const now = new Date().toISOString();

    announcement.status = 'rejected';
    announcement.moderationReason = reason;
    announcement.moderatorId = moderatorId;
    announcement.moderatorName = moderatorName;
    announcement.moderatedAt = now;
    announcement.updatedAt = now;
    announcement.whatsappDeliveryStatus = 'not_sent';

    this.announcements[index] = announcement;
    this.persistLocal();

    setDoc(doc(db, 'announcements', id), announcement).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `announcements/${id}`)
    );

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
    this.auditLogs.unshift(auditLog);
    this.persistLocal();

    setDoc(doc(db, 'moderationActions', auditLog.id), auditLog).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `moderationActions/${auditLog.id}`)
    );

    this.notifyChange();
    return announcement;
  }

  /**
   * Moderator Requests Modification
   */
  public requestModification(id: string, moderatorId: string, moderatorName: string, reason: string): Announcement {
    const index = this.announcements.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('الإعلان غير موجود');

    const announcement = this.announcements[index];
    const now = new Date().toISOString();

    announcement.status = 'needs_modification';
    announcement.moderationReason = reason;
    announcement.moderatorId = moderatorId;
    announcement.moderatorName = moderatorName;
    announcement.moderatedAt = now;
    announcement.updatedAt = now;

    this.announcements[index] = announcement;
    this.persistLocal();

    setDoc(doc(db, 'announcements', id), announcement).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `announcements/${id}`)
    );

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
    this.auditLogs.unshift(auditLog);
    this.persistLocal();

    setDoc(doc(db, 'moderationActions', auditLog.id), auditLog).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `moderationActions/${auditLog.id}`)
    );

    this.notifyChange();
    return announcement;
  }

  /**
   * Mark Completed or Expired
   */
  public markStatus(
    id: string,
    status: AnnouncementStatus,
    moderatorId: string,
    moderatorName: string,
    reason?: string
  ): Announcement {
    const index = this.announcements.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('الإعلان غير موجود');

    const announcement = this.announcements[index];
    const now = new Date().toISOString();

    announcement.status = status;
    announcement.updatedAt = now;

    this.announcements[index] = announcement;
    this.persistLocal();

    setDoc(doc(db, 'announcements', id), announcement).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `announcements/${id}`)
    );

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
    this.auditLogs.unshift(auditLog);
    this.persistLocal();

    setDoc(doc(db, 'moderationActions', auditLog.id), auditLog).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `moderationActions/${auditLog.id}`)
    );

    this.notifyChange();
    return announcement;
  }

  // ================= User operations =================
  public getUsers(): User[] {
    return [...this.users];
  }

  public getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  public getUserByPhone(phone: string): User | undefined {
    return this.users.find((u) => u.phone === phone);
  }

  public registerOrLoginUser(fullName: string, phone: string): User {
    const cleanPhone = phone.trim();
    let user = this.users.find((u) => u.phone === cleanPhone);

    if (!user) {
      user = {
        id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        fullName: fullName.trim(),
        phone: cleanPhone,
        role: 'user',
        createdAt: new Date().toISOString(),
        announcementsCount: 0,
        status: 'active',
        verified: true,
      };
      this.users.push(user);
      this.persistLocal();
    } else {
      if (fullName && user.fullName !== fullName.trim()) {
        user.fullName = fullName.trim();
        this.persistLocal();
      }
    }

    setDoc(doc(db, 'users', user.id), user).catch((err) =>
      handleFirestoreError(err, OperationType.WRITE, `users/${user!.id}`)
    );

    this.notifyChange();
    return user;
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
