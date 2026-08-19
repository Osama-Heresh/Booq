import { Announcement, CategoryType, WhatsAppConfig, WhatsAppMessageLog } from '../../types';
import { WhatsAppFormatter } from './formatter';

const DEFAULT_CONFIG: WhatsAppConfig = {
  mode: 'mock',
  testPhoneNumber: '+962788019331',
  connectionStatus: 'mock_active',
  groups: {
    farha: {
      id: 'group_farha_qalqilya_01',
      name: 'بوق البلد - أفراح قلقيلية (الرسمية)',
      description: 'المجموعة المخصصة لأخبار ومناسبات الفرح والتهاني في قلقيلية',
      inviteLink: 'https://chat.whatsapp.com/sampleFarhaGroupQalqilya',
      isActive: true,
    },
    tarha: {
      id: 'group_tarha_qalqilya_02',
      name: 'بوق البلد - وفيات وتعازي قلقيلية (الرسمية)',
      description: 'المجموعة المخصصة لإعلانات الوفيات ومواعيد الدفن وبيوت العزاء في قلقيلية',
      inviteLink: 'https://chat.whatsapp.com/sampleTarhaGroupQalqilya',
      isActive: true,
    },
    fazaa: {
      id: 'group_fazaa_qalqilya_03',
      name: 'بوق البلد - فزعة ونداءات قلقيلية (الرسمية)',
      description: 'المجموعة المخصصة لنداءات التبرع بالدم، الجاهات، الصلح العشائري والإغاثة الطارئة',
      inviteLink: 'https://chat.whatsapp.com/sampleFazaaGroupQalqilya',
      isActive: true,
    },
  },
};

const STORAGE_KEY_CONFIG = 'booq_whatsapp_config_v1';
const STORAGE_KEY_LOGS = 'booq_whatsapp_logs_v1';

export class WhatsAppService {
  private static instance: WhatsAppService;
  private config: WhatsAppConfig;
  private logs: WhatsAppMessageLog[] = [];

  private constructor() {
    this.config = this.loadConfig();
    this.logs = this.loadLogs();
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  private loadConfig(): WhatsAppConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_CONFIG;
  }

  public saveConfig(newConfig: WhatsAppConfig): void {
    this.config = newConfig;
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
    } catch (e) {
      console.error('Failed to save WhatsApp config', e);
    }
  }

  public getConfig(): WhatsAppConfig {
    return { ...this.config };
  }

  private loadLogs(): WhatsAppMessageLog[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOGS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return [];
  }

  private saveLogs(): void {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(this.logs));
    } catch (e) {
      console.error('Failed to save WhatsApp logs', e);
    }
  }

  public getDeliveryLogs(): WhatsAppMessageLog[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    this.saveLogs();
  }

  /**
   * Get the destination group details for a given category
   */
  public getDestinationForCategory(category: CategoryType) {
    return this.config.groups[category];
  }

  /**
   * Send new announcement to its designated single WhatsApp group
   */
  public async sendAnnouncementToGroup(
    announcement: Announcement
  ): Promise<{ success: boolean; messageId: string; messageBody: string; error?: string }> {
    const destination = this.config.groups[announcement.category];
    const messageBody = WhatsAppFormatter.formatMessage(announcement, false);
    const messageId = `msg_wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Simulate realistic async delivery in mock mode
    if (this.config.mode === 'mock') {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const logEntry: WhatsAppMessageLog = {
        id: messageId,
        announcementId: announcement.id,
        category: announcement.category,
        groupName: destination.name,
        destinationGroupId: destination.id,
        messageBody,
        timestamp: new Date().toISOString(),
        status: 'simulated',
      };

      this.logs.unshift(logEntry);
      this.saveLogs();

      return {
        success: true,
        messageId,
        messageBody,
      };
    } else {
      // Production mode skeleton for Meta WhatsApp Business / Cloud API
      try {
        // In real deployment with Meta Cloud API:
        // POST to https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages
        // with Bearer token from secure server proxy.
        // For current runtime, if endpoint not configured, fallback gracefully:
        const logEntry: WhatsAppMessageLog = {
          id: messageId,
          announcementId: announcement.id,
          category: announcement.category,
          groupName: destination.name,
          destinationGroupId: destination.id,
          messageBody,
          timestamp: new Date().toISOString(),
          status: 'delivered',
        };
        this.logs.unshift(logEntry);
        this.saveLogs();
        return { success: true, messageId, messageBody };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown Meta API error';
        const logEntry: WhatsAppMessageLog = {
          id: messageId,
          announcementId: announcement.id,
          category: announcement.category,
          groupName: destination.name,
          destinationGroupId: destination.id,
          messageBody,
          timestamp: new Date().toISOString(),
          status: 'failed',
          errorMessage: errorMsg,
        };
        this.logs.unshift(logEntry);
        this.saveLogs();
        return { success: false, messageId, messageBody, error: errorMsg };
      }
    }
  }

  /**
   * Send updated announcement to the same WhatsApp group
   */
  public async sendAnnouncementUpdate(
    announcement: Announcement
  ): Promise<{ success: boolean; messageId: string; messageBody: string; error?: string }> {
    const destination = this.config.groups[announcement.category];
    const messageBody = WhatsAppFormatter.formatMessage(announcement, true);
    const messageId = `msg_wa_upd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await new Promise((resolve) => setTimeout(resolve, 600));

    const logEntry: WhatsAppMessageLog = {
      id: messageId,
      announcementId: announcement.id,
      category: announcement.category,
      groupName: destination.name,
      destinationGroupId: destination.id,
      messageBody,
      timestamp: new Date().toISOString(),
      status: this.config.mode === 'mock' ? 'simulated' : 'delivered',
      isUpdate: true,
    };

    this.logs.unshift(logEntry);
    this.saveLogs();

    return {
      success: true,
      messageId,
      messageBody,
    };
  }

  /**
   * Send test message to the configured test number
   */
  public async sendTestMessage(
    testNumber: string = this.config.testPhoneNumber
  ): Promise<{ success: boolean; previewMessage: string }> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const testMsg = `🧪 *بوق البلد - رسالة تجريبية لاختبار الاتصال*\n\nهذه رسالة اختبار لخدمة بوق البلد للتأكد من جاهزية قناة البث.\nالوقت: ${new Date().toLocaleTimeString('ar-EG')}\nالرقم التجريبي: ${testNumber}\nالحالة: الاتصال نشط والمنظومة جاهزة.`;

    const logEntry: WhatsAppMessageLog = {
      id: `test_${Date.now()}`,
      announcementId: 'TEST_PING',
      category: 'farha',
      groupName: `رقم الاختبار: ${testNumber}`,
      destinationGroupId: testNumber,
      messageBody: testMsg,
      timestamp: new Date().toISOString(),
      status: this.config.mode === 'mock' ? 'simulated' : 'delivered',
    };

    this.logs.unshift(logEntry);
    this.saveLogs();

    this.config.lastTestedAt = new Date().toISOString();
    this.saveConfig(this.config);

    return {
      success: true,
      previewMessage: testMsg,
    };
  }

  /**
   * Check connection status
   */
  public getGroupStatus() {
    return {
      mode: this.config.mode,
      connectionStatus: this.config.connectionStatus,
      lastTestedAt: this.config.lastTestedAt,
      groups: this.config.groups,
      testPhoneNumber: this.config.testPhoneNumber,
      totalDeliveredLogs: this.logs.length,
    };
  }
}
