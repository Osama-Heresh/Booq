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

  private constructor() {
    this.init();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private init() {
    // Load announcements
    try {
      const storedAnnouncements = localStorage.getItem(STORAGE_KEY_ANNOUNCEMENTS);
      if (storedAnnouncements) {
        this.announcements = JSON.parse(storedAnnouncements);
      } else {
        this.announcements = [...INITIAL_ANNOUNCEMENTS];
        this.persistAnnouncements();
      }
    } catch {
      this.announcements = [...INITIAL_ANNOUNCEMENTS];
    }

    // Load users
    try {
      const storedUsers = localStorage.getItem(STORAGE_KEY_USERS);
      if (storedUsers) {
        this.users = JSON.parse(storedUsers);
      } else {
        this.users = [...INITIAL_USERS];
        this.persistUsers();
      }
    } catch {
      this.users = [...INITIAL_USERS];
    }

    // Load audit logs
    try {
      const storedAudit = localStorage.getItem(STORAGE_KEY_AUDIT);
      if (storedAudit) {
        this.auditLogs = JSON.parse(storedAudit);
      }
    } catch {
      this.auditLogs = [];
    }
  }

  private persistAnnouncements() {
    try {
      localStorage.setItem(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(this.announcements));
    } catch (e) {
      console.error('Error persisting announcements', e);
    }
  }

  private persistUsers() {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(this.users));
    } catch (e) {
      console.error('Error persisting users', e);
    }
  }

  private persistAuditLogs() {
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(this.auditLogs));
    } catch (e) {
      console.error('Error persisting audit logs', e);
    }
  }

  public resetToSeedData() {
    this.announcements = [...INITIAL_ANNOUNCEMENTS];
    this.users = [...INITIAL_USERS];
    this.auditLogs = [];
    this.persistAnnouncements();
    this.persistUsers();
    this.persistAuditLogs();
    WhatsAppService.getInstance().clearLogs();
  }

  // ================= Announcements queries & mutations =================
  public getAnnouncements(): Announcement[] {
    return [...this.announcements];
  }

  public getAnnouncementById(id: string): Announcement | undefined {
    return this.announcements.find((a) => a.id === id);
  }

  public getPublishedAnnouncements(category?: CategoryType): Announcement[] {
    return this.announcements.filter((a) => {
      const isPub = a.status === 'published';
      if (!isPub) return false;
      if (category) return a.category === category;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getArchivedAnnouncements(): Announcement[] {
    return this.announcements.filter(
      (a) => a.status === 'published' || a.status === 'completed' || a.status === 'expired'
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'whatsappDeliveryStatus'>): Announcement {
    const newId = `ann_${announcement.category}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const created: Announcement = {
      ...announcement,
      id: newId,
      status: 'pending_review', // Every submission starts in pending_review
      createdAt: now,
      updatedAt: now,
      whatsappDeliveryStatus: 'pending',
    };

    this.announcements.unshift(created);
    this.persistAnnouncements();

    // Increment user announcements count
    const user = this.users.find((u) => u.id === announcement.createdByUserId);
    if (user) {
      user.announcementsCount = (user.announcementsCount || 0) + 1;
      this.persistUsers();
    }

    return created;
  }

  public updateAnnouncement(id: string, updates: Partial<Announcement>, moderatorId?: string, reason?: string): Announcement | undefined {
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
    this.persistAnnouncements();

    if (moderatorId) {
      const user = this.getUserById(moderatorId);
      this.auditLogs.unshift({
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
      });
      this.persistAuditLogs();
    }

    return updated;
  }

  /**
   * Moderator Approval Workflow
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

    // Send to WhatsApp via WhatsAppService
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
    this.persistAnnouncements();

    // Log moderation action
    this.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      announcementId: id,
      announcementTitle: announcement.title,
      category: announcement.category,
      action: 'approve',
      moderatorId,
      moderatorName,
      timestamp: now,
      whatsappDelivered: waResult.success,
    });
    this.persistAuditLogs();

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
    this.persistAnnouncements();

    this.auditLogs.unshift({
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
    });
    this.persistAuditLogs();

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
    this.persistAnnouncements();

    this.auditLogs.unshift({
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
    });
    this.persistAuditLogs();

    return announcement;
  }

  /**
   * Expire or Mark Completed
   */
  public markStatus(id: string, status: AnnouncementStatus, moderatorId: string, moderatorName: string, reason?: string): Announcement {
    const index = this.announcements.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('الإعلان غير موجود');

    const announcement = this.announcements[index];
    const now = new Date().toISOString();

    announcement.status = status;
    announcement.updatedAt = now;

    this.announcements[index] = announcement;
    this.persistAnnouncements();

    this.auditLogs.unshift({
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
    });
    this.persistAuditLogs();

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
      this.persistUsers();
    } else {
      // Update name if changed
      if (fullName && user.fullName !== fullName.trim()) {
        user.fullName = fullName.trim();
        this.persistUsers();
      }
    }

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
      (a) => a.category === 'fazaa' && (a.fazaaDetails?.urgency === 'urgent' || a.fazaaDetails?.urgency === 'critical') && a.status === 'published'
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
