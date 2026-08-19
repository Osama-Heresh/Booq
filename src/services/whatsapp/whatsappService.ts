import { doc, collection, setDoc, onSnapshot, deleteDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { Announcement, CategoryType, WhatsAppConfig, WhatsAppMessageLog } from '../../types';
import { WhatsAppFormatter } from './formatter';

// Consistent environment variables with safe defaults
const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const ENV_MODE = (metaEnv.VITE_WHATSAPP_MODE || 'mock') as 'mock' | 'production';
const ENV_TEST_PHONE = metaEnv.VITE_TEST_WHATSAPP_NUMBER || '+962788019331';

const DEFAULT_CONFIG: WhatsAppConfig = {
  mode: ENV_MODE === 'production' ? 'production' : 'mock',
  testPhoneNumber: ENV_TEST_PHONE,
  connectionStatus: ENV_MODE === 'production' ? 'disconnected' : 'mock_active',
  groups: {
    farha: {
      id: 'group_farha_qalqilya_mock',
      name: 'بوق البلد - أفراح قلقيلية (المجموعة الرسمية الوحيدة)',
      description: 'المجموعة المعتمدة لأخبار ومناسبات الفرح والتهاني في قلقيلية',
      inviteLink: 'https://chat.whatsapp.com/farha-qalqilya-official',
      isActive: true,
    },
    tarha: {
      id: 'group_tarha_qalqilya_mock',
      name: 'بوق البلد - وفيات وتعازي قلقيلية (المجموعة الرسمية الوحيدة)',
      description: 'المجموعة المعتمدة لإعلانات الوفيات ومواعيد الدفن وبيوت العزاء في قلقيلية',
      inviteLink: 'https://chat.whatsapp.com/tarha-qalqilya-official',
      isActive: true,
    },
    fazaa: {
      id: 'group_fazaa_qalqilya_mock',
      name: 'بوق البلد - فزعة ونداءات قلقيلية (المجموعة الرسمية الوحيدة)',
      description: 'المجموعة المعتمدة لنداءات التبرع بالدم، الجاهات، والصلح العشائري والإغاثة الطارئة',
      inviteLink: 'https://chat.whatsapp.com/fazaa-qalqilya-official',
      isActive: true,
    },
  },
};

export class WhatsAppService {
  private static instance: WhatsAppService;
  private config: WhatsAppConfig = DEFAULT_CONFIG;
  private logs: WhatsAppMessageLog[] = [];
  private isInitialized = false;
  private subscribers: (() => void)[] = [];

  private constructor() {
    this.initFirestoreSync();
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  private async initFirestoreSync() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Sync config from Firestore (Only authenticated admin can read/write systemSettings)
    try {
      onSnapshot(
        doc(db, 'systemSettings', 'whatsapp_config'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data?.config) {
              this.config = { ...DEFAULT_CONFIG, ...data.config };
              this.notify();
            }
          }
        },
        (err) => {
          // Normal for non-admin users where security rules rightly reject read
          if (err.code !== 'permission-denied') {
            console.warn('WhatsApp config Firestore listener notice:', err.message);
          }
        }
      );
    } catch (e) {
      console.warn('WhatsApp config initial listener setup', e);
    }

    // 2. Real-time sync logs from Firestore collection for moderators/admins
    try {
      onSnapshot(
        collection(db, 'whatsappMessages'),
        (snapshot) => {
          const list: WhatsAppMessageLog[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as WhatsAppMessageLog);
          });
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          this.logs = list;
          this.notify();
        },
        (error) => {
          if (error.code !== 'permission-denied') {
            console.warn('WhatsApp logs Firestore sync notice:', error.message);
          }
        }
      );
    } catch (e) {
      console.warn('Error syncing whatsappMessages', e);
    }
  }

  public subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }

  public getConfig(): WhatsAppConfig {
    return { ...this.config };
  }

  public async saveConfig(newConfig: WhatsAppConfig): Promise<void> {
    this.config = newConfig;
    try {
      await setDoc(doc(db, 'systemSettings', 'whatsapp_config'), {
        id: 'whatsapp_config',
        config: newConfig,
        updatedAt: new Date().toISOString(),
      });
      this.notify();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'systemSettings/whatsapp_config');
    }
  }

  public getDeliveryLogs(): WhatsAppMessageLog[] {
    return [...this.logs];
  }

  public async clearLogs(): Promise<void> {
    this.logs = [];
    this.notify();
    try {
      const snap = await getDocs(collection(db, 'whatsappMessages'));
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (err) {
      console.warn('Could not delete all logs from Firestore', err);
    }
  }

  public getDestinationForCategory(category: CategoryType) {
    return this.config.groups[category];
  }

  /**
   * Dispatch announcement to the designated single WhatsApp group
   */
  public async sendAnnouncementToGroup(
    announcement: Announcement
  ): Promise<{ success: boolean; isMock: boolean; messageId: string; messageBody: string; error?: string }> {
    const destination = this.config.groups[announcement.category];
    const messageBody = WhatsAppFormatter.formatMessage(announcement, false);
    const messageId = `msg_wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // MOCK MODE
    if (this.config.mode === 'mock') {
      await new Promise((res) => setTimeout(res, 400));

      const logEntry: WhatsAppMessageLog = {
        id: messageId,
        announcementId: announcement.id,
        category: announcement.category,
        groupName: destination.name,
        destinationGroupId: destination.id,
        messageBody,
        timestamp: now,
        status: 'simulated',
      };

      try {
        await setDoc(doc(db, 'whatsappMessages', messageId), logEntry);
      } catch (err) {
        console.warn('Could not write mock log to Firestore', err);
      }

      return {
        success: true,
        isMock: true,
        messageId,
        messageBody,
      };
    }

    // PRODUCTION MODE (Meta Cloud API)
    // Never fake production success. Refuse delivery unless valid server-side API responds.
    const errorMessage =
      'تكامل WhatsApp الإنتاجي غير مهيأ بعد. لم يتم إرسال رسالة حقيقية (يرجى ضبط بيانات اعتماد Meta API على الخادم). تم حفظ ونشر الإعلان على المنصة بأمان.';

    const failLog: WhatsAppMessageLog = {
      id: messageId,
      announcementId: announcement.id,
      category: announcement.category,
      groupName: destination.name,
      destinationGroupId: destination.id,
      messageBody,
      timestamp: now,
      status: 'failed',
      errorMessage,
    };

    try {
      await setDoc(doc(db, 'whatsappMessages', messageId), failLog);
    } catch (err) {
      console.warn('Could not write fail log to Firestore', err);
    }

    return {
      success: false,
      isMock: false,
      messageId,
      messageBody,
      error: errorMessage,
    };
  }

  /**
   * Dispatch announcement update notice to the single designated group
   */
  public async sendAnnouncementUpdate(
    announcement: Announcement
  ): Promise<{ success: boolean; isMock: boolean; messageId: string; messageBody: string; error?: string }> {
    const destination = this.config.groups[announcement.category];
    const messageBody = WhatsAppFormatter.formatMessage(announcement, true);
    const messageId = `msg_wa_upd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    if (this.config.mode === 'mock') {
      await new Promise((res) => setTimeout(res, 400));

      const logEntry: WhatsAppMessageLog = {
        id: messageId,
        announcementId: announcement.id,
        category: announcement.category,
        groupName: destination.name,
        destinationGroupId: destination.id,
        messageBody,
        timestamp: now,
        status: 'simulated',
        isUpdate: true,
      };

      try {
        await setDoc(doc(db, 'whatsappMessages', messageId), logEntry);
      } catch (err) {
        console.warn('Failed saving update log to Firestore', err);
      }

      return {
        success: true,
        isMock: true,
        messageId,
        messageBody,
      };
    }

    const errorMessage =
      'تكامل WhatsApp الإنتاجي غير مهيأ بعد. يرجى ضبط بيانات اعتماد Meta API على الخادم.';

    const failLog: WhatsAppMessageLog = {
      id: messageId,
      announcementId: announcement.id,
      category: announcement.category,
      groupName: destination.name,
      destinationGroupId: destination.id,
      messageBody,
      timestamp: now,
      status: 'failed',
      errorMessage,
      isUpdate: true,
    };

    try {
      await setDoc(doc(db, 'whatsappMessages', messageId), failLog);
    } catch (err) {
      console.warn('Failed saving fail log', err);
    }

    return {
      success: false,
      isMock: false,
      messageId,
      messageBody,
      error: errorMessage,
    };
  }

  /**
   * Send test connection ping
   * Fixed to strictly distinguish MOCK (simulated) from PRODUCTION (fails cleanly without real credentials)
   */
  public async sendTestMessage(
    testNumber: string = this.config.testPhoneNumber
  ): Promise<{ success: boolean; isMock: boolean; previewMessage: string; error?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const now = new Date();
    const logId = `test_${Date.now()}`;

    // 1. MOCK MODE
    if (this.config.mode === 'mock') {
      const testMsg = `🧪 *[تجريبي - MOCK]* *بوق البلد - رسالة فحص الاتصال*\n\nهذه محاكاة تجريبية للتأكد من بنية رسائل البث لمحافظة قلقيلية (وضع التطوير Mock).\nالوقت: ${now.toLocaleTimeString('ar-EG')}\nالرقم التجريبي: ${testNumber}`;

      const logEntry: WhatsAppMessageLog = {
        id: logId,
        announcementId: 'TEST_PING',
        category: 'farha',
        groupName: `اختبار المحاكاة التجريبية (Mock): ${testNumber}`,
        destinationGroupId: testNumber,
        messageBody: testMsg,
        timestamp: now.toISOString(),
        status: 'simulated',
      };

      try {
        await setDoc(doc(db, 'whatsappMessages', logId), logEntry);
      } catch (err) {
        console.warn('Failed saving test log', err);
      }

      const updatedConfig = {
        ...this.config,
        lastTestedAt: now.toISOString(),
      };
      this.saveConfig(updatedConfig);

      return {
        success: true,
        isMock: true,
        previewMessage: testMsg,
      };
    }

    // 2. PRODUCTION MODE
    // Without active Meta Business Cloud API response, MUST return success=false and status='failed'
    const errorArabic = 'فشل اختبار الاتصال الإنتاجي: بيانات اعتماد Meta Cloud API غير مضبوطة على الخادم. لم يتم الإرسال.';
    const prodMsg = `⚠️ *[فشل الاتصال]* لم يتم إرسال رسالة إلى ${testNumber} لعدم توفر مفاتيح Meta API.`;

    const failLog: WhatsAppMessageLog = {
      id: logId,
      announcementId: 'TEST_PING',
      category: 'farha',
      groupName: `اختبار إنتاجي فاشل: ${testNumber}`,
      destinationGroupId: testNumber,
      messageBody: prodMsg,
      timestamp: now.toISOString(),
      status: 'failed',
      errorMessage: errorArabic,
    };

    try {
      await setDoc(doc(db, 'whatsappMessages', logId), failLog);
    } catch (err) {
      console.warn('Failed saving test log', err);
    }

    return {
      success: false,
      isMock: false,
      previewMessage: prodMsg,
      error: errorArabic,
    };
  }
}
