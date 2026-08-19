export type CategoryType = 'farha' | 'tarha' | 'fazaa';

export type AnnouncementStatus =
  | 'draft'               // مسودة
  | 'pending_review'      // قيد المراجعة
  | 'needs_modification'  // يحتاج تعديل
  | 'approved'            // معتمد
  | 'published'           // منشور
  | 'completed'           // مكتمل
  | 'rejected'            // مرفوض
  | 'expired';            // منتهي

export type FazaaUrgency = 'normal' | 'urgent' | 'critical'; // عادي | عاجل | عاجل جدًا

export interface GeoLocation {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
}

export interface ContactInfo {
  name: string;
  phone: string;
  whatsappPhone?: string;
  allowCalls: boolean;
  allowWhatsapp: boolean;
}

export interface FarhaDetails {
  occasionType: string;         // نوع المناسبة: زفاف، خطوبة، مولود جديد، تخرج، نجاح، دعوة عامة...
  honorees: string;             // أسماء أصحاب المناسبة (مثال: العريس أحمد والعروس مريم، أو الخريج...)
  date: string;                 // تاريخ المناسبة
  time: string;                 // وقت المناسبة
  venueName: string;            // اسم المكان (مثال: قاعة الصنوبر، ديوان آل نزال...)
  location: GeoLocation;        // موقع المكان
  description: string;          // تفاصيل ووصف المناسبة
  additionalNotes?: string;     // ملاحظات إضافية
  imageUrl?: string;            // صورة اختيارية
}

export interface TarhaDetails {
  deceasedName: string;         // الاسم الكامل للمتوفى
  deathDate: string;            // تاريخ الوفاة
  prayerTime: string;           // وقت الصلاة (مثال: بعد صلاة الظهر، بعد صلاة العصر)
  mosqueName: string;           // اسم المسجد (مثال: مسجد علي بن أبي طالب)
  mosqueLocation: GeoLocation;  // موقع المسجد على الخريطة
  cemeteryName: string;         // اسم المقبرة (مثال: مقبرة المرابطين الجديدة)
  cemeteryLocation: GeoLocation;// موقع المقبرة على الخريطة
  condolenceVenue: string;      // مكان استقبال التعازي (مثال: ديوان آل شريم / صالة بلدية قلقيلية)
  condolenceLocation: GeoLocation; // موقع مكان استقبال التعازي
  condolenceDuration: string;   // مدة استقبال التعازي (مثال: لمدة يومين، من الأربعاء حتى الجمعة)
  condolenceHours: string;      // أوقات استقبال التعازي (مثال: من الساعة 5:00 عصراً حتى 9:00 مساءً)
  description?: string;         // تفاصيل إضافية
  additionalNotes?: string;     // ملاحظات
  imageUrl?: string;            // صورة اختيارية
  declarationConfirmed: boolean;// إقرار صحة المعلومات والمسؤولية
}

export interface FazaaDetails {
  fazaaType: string;            // نوع الفزعة: تبرع بالدم، جاهة، صلح عشائري، مساعدة طارئة، إغاثة مجتمعية...
  urgency: FazaaUrgency;        // درجة الاستعجال: عادي، عاجل، عاجل جدًا
  targetPersonOrEntity: string; // اسم الشخص أو الجهة المحتاجة
  facilityOrLocationName: string;// المستشفى أو المكان (مثال: مستشفى الدكتور درويش نزال الحكومي)
  location: GeoLocation;        // موقع المكان على الخريطة
  bloodType?: string;           // فصيلة الدم المطلوبة (إن وجدت، مثل: O-، A+...)
  unitsNeeded?: number;         // عدد الوحدات المطلوبة (إن وجد)
  requiredDate: string;         // تاريخ الحاجة
  requiredTime?: string;        // وقت الحاجة
  description: string;          // وصف الحاجة بالتفصيل
  additionalNotes?: string;     // ملاحظات إضافية
  imageUrl?: string;            // صورة اختيارية
}

export interface Announcement {
  id: string;
  category: CategoryType;
  title: string;
  status: AnnouncementStatus;
  
  // Specific category details
  farhaDetails?: FarhaDetails;
  tarhaDetails?: TarhaDetails;
  fazaaDetails?: FazaaDetails;
  
  // Contact info
  contact: ContactInfo;
  
  // Common metadata
  city: string;                 // الافتراضي: قلقيلية
  createdByUserId: string;
  createdByUserName: string;
  createdByUserPhone: string;
  createdAt: string;            // ISO String
  updatedAt: string;            // ISO String
  publishedAt?: string;         // ISO String
  expiresAt?: string;           // ISO String
  
  // Moderation notes
  moderationReason?: string;
  moderatorId?: string;
  moderatorName?: string;
  moderatedAt?: string;

  // WhatsApp integration status
  whatsappMessageBody?: string;
  whatsappDeliveryStatus: 'not_sent' | 'sent' | 'failed' | 'pending';
  whatsappSentAt?: string;
  whatsappMessageId?: string;
  whatsappError?: string;
  whatsappGroupId?: string;
}

export type UserRole = 'user' | 'moderator' | 'admin';

export interface User {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
  createdAt: string;
  announcementsCount: number;
  status: 'active' | 'suspended';
  verified: boolean;
}

export interface ModeratorActionLog {
  id: string;
  announcementId: string;
  announcementTitle: string;
  category: CategoryType;
  action: 'approve' | 'reject' | 'request_modification' | 'pause' | 'complete' | 'republish';
  moderatorId: string;
  moderatorName: string;
  reason?: string;
  timestamp: string;
  whatsappDelivered: boolean;
}

export interface WhatsAppMessageLog {
  id: string;
  announcementId: string;
  category: CategoryType;
  groupName: string;
  destinationGroupId: string;
  messageBody: string;
  timestamp: string;
  status: 'delivered' | 'failed' | 'simulated';
  errorMessage?: string;
  isUpdate?: boolean;
}

export interface WhatsAppConfig {
  mode: 'mock' | 'production';
  testPhoneNumber: string;
  groups: {
    farha: {
      id: string;
      name: string;
      description: string;
      inviteLink?: string;
      isActive: boolean;
    };
    tarha: {
      id: string;
      name: string;
      description: string;
      inviteLink?: string;
      isActive: boolean;
    };
    fazaa: {
      id: string;
      name: string;
      description: string;
      inviteLink?: string;
      isActive: boolean;
    };
  };
  apiEndpoint?: string;
  lastTestedAt?: string;
  connectionStatus: 'connected' | 'mock_active' | 'disconnected';
}
