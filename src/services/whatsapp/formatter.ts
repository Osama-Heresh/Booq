import { Announcement } from '../../types';

export class WhatsAppFormatter {
  private static getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://booq-albalad.ps';
  }

  /**
   * Generates a complete Arabic WhatsApp message for Farha (Joy)
   */
  public static formatFarhaMessage(announcement: Announcement, isUpdate = false): string {
    const details = announcement.farhaDetails;
    if (!details) return announcement.title;

    const lines: string[] = [];
    const webUrl = `${this.getBaseUrl()}#announcement-${announcement.id}`;

    if (isUpdate) {
      lines.push('🔄 *تحديث هام - إعلان فرحة*');
      lines.push('━━━━━━━━━━━━━━━━━━━━');
    }

    lines.push('🟢 *بوق البلد | أفراح قلقيلية* 🟢');
    lines.push(`✨ *${announcement.title}*`);
    lines.push('');

    if (details.honorees) {
      lines.push(`💐 *أصحاب المناسبة:* ${details.honorees}`);
    }

    lines.push(`🎉 *نوع المناسبة:* ${details.occasionType}`);
    lines.push(`📅 *التاريخ:* ${details.date}`);
    if (details.time) {
      lines.push(`⏰ *الوقت:* ${details.time}`);
    }
    lines.push(`🏛️ *المكان:* ${details.venueName}`);

    if (details.location?.googleMapsUrl) {
      lines.push(`📍 *موقع المكان (خرائط Google):*`);
      lines.push(`${details.location.googleMapsUrl}`);
    }

    if (details.description) {
      lines.push('');
      lines.push(`📝 *التفاصيل:*`);
      lines.push(details.description);
    }

    if (details.additionalNotes) {
      lines.push('');
      lines.push(`📌 *ملاحظة:* ${details.additionalNotes}`);
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━');

    // Contact info
    if (announcement.contact.allowCalls || announcement.contact.allowWhatsapp) {
      lines.push(`📞 *للتواصل والتهنئة:* ${announcement.contact.name} (${announcement.contact.phone})`);
      if (announcement.contact.allowWhatsapp && announcement.contact.whatsappPhone) {
        lines.push(`💬 *واتساب مباشر:* https://wa.me/${announcement.contact.whatsappPhone.replace(/[^0-9]/g, '')}`);
      }
    }

    lines.push('');
    lines.push(`🔗 *رابط الإعلان الرسمي في بوق البلد:*`);
    lines.push(webUrl);
    lines.push('');
    lines.push('🌹 _دامت دياركم عامرة بالأفراح والمسرات_ 🌹');

    return lines.join('\n');
  }

  /**
   * Generates a complete Arabic WhatsApp message for Tarha (Condolence)
   */
  public static formatTarhaMessage(announcement: Announcement, isUpdate = false): string {
    const details = announcement.tarhaDetails;
    if (!details) return announcement.title;

    const lines: string[] = [];
    const webUrl = `${this.getBaseUrl()}#announcement-${announcement.id}`;

    if (isUpdate) {
      lines.push('🔄 *تحديث هام - إعلان وفاة وتعزية*');
      lines.push('━━━━━━━━━━━━━━━━━━━━');
    }

    lines.push('⚫ *إنا لله وإنا إليه راجعون* ⚫');
    lines.push('بوق البلد | وفيات وتعازي قلقيلية');
    lines.push('');
    lines.push('انتقل إلى رحمة الله تعالى:');
    lines.push(`🕊️ *المرحوم/ة: ${details.deceasedName}*`);
    lines.push('');

    // Prayer info
    lines.push(`🕌 *الصلاة:* ${details.mosqueName} (${details.prayerTime})`);
    if (details.mosqueLocation?.googleMapsUrl) {
      lines.push(`📍 *موقع المسجد:* ${details.mosqueLocation.googleMapsUrl}`);
    }
    lines.push('');

    // Burial info
    lines.push(`⚰️ *الدفن:* ${details.cemeteryName}`);
    if (details.cemeteryLocation?.googleMapsUrl) {
      lines.push(`📍 *موقع المقبرة:* ${details.cemeteryLocation.googleMapsUrl}`);
    }
    lines.push('');

    // Condolence venue
    lines.push(`🤝 *استقبال التعازي:* ${details.condolenceVenue}`);
    if (details.condolenceLocation?.googleMapsUrl) {
      lines.push(`📍 *موقع بيت العزاء:* ${details.condolenceLocation.googleMapsUrl}`);
    }
    lines.push(`🕐 *مدة التعازي:* ${details.condolenceDuration}`);
    lines.push(`⏰ *أوقات الاستقبال:* ${details.condolenceHours}`);

    if (details.additionalNotes) {
      lines.push('');
      lines.push(`📌 *ملاحظة:* ${details.additionalNotes}`);
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━');

    // Contact info
    if (announcement.contact.allowCalls || announcement.contact.allowWhatsapp) {
      lines.push(`📞 *للتواصل وتقديم واجب العزاء:* ${announcement.contact.name} (${announcement.contact.phone})`);
      if (announcement.contact.allowWhatsapp && announcement.contact.whatsappPhone) {
        lines.push(`💬 *واتساب:* https://wa.me/${announcement.contact.whatsappPhone.replace(/[^0-9]/g, '')}`);
      }
    }

    lines.push('');
    lines.push(`🔗 *رابط الإعلان الموثق في بوق البلد:*`);
    lines.push(webUrl);
    lines.push('');
    lines.push('🤲 _رحم الله الفقيد وأسكنه فسيح جناته وألهم أهله الصبر والسلوان_');

    return lines.join('\n');
  }

  /**
   * Generates a complete Arabic WhatsApp message for Fazaa (Urgent Community Call)
   */
  public static formatFazaaMessage(announcement: Announcement, isUpdate = false): string {
    const details = announcement.fazaaDetails;
    if (!details) return announcement.title;

    const lines: string[] = [];
    const webUrl = `${this.getBaseUrl()}#announcement-${announcement.id}`;

    const urgencyEmoji = details.urgency === 'critical' ? '🚨🚨🚨' : details.urgency === 'urgent' ? '🔴' : '⚠️';
    const urgencyLabel = details.urgency === 'critical' ? 'عاجل جداً وطارئ' : details.urgency === 'urgent' ? 'عاجل' : 'طلب مساعدة مجتمعية';

    if (isUpdate) {
      lines.push('🔄 *تحديث نداء فزعة*');
      lines.push('━━━━━━━━━━━━━━━━━━━━');
    }

    lines.push(`${urgencyEmoji} *بوق البلد | نداء فزعة (${urgencyLabel})* ${urgencyEmoji}`);
    lines.push(`📢 *${announcement.title}*`);
    lines.push('');

    lines.push(`📌 *نوع الفزعة:* ${details.fazaaType}`);
    if (details.targetPersonOrEntity) {
      lines.push(`👤 *المستفيد / المعني:* ${details.targetPersonOrEntity}`);
    }

    if (details.bloodType) {
      lines.push(`🩸 *فصيلة الدم المطلوبة:* ${details.bloodType}`);
      if (details.unitsNeeded) {
        lines.push(`💉 *عدد الوحدات المطلوبة:* ${details.unitsNeeded} وحدة`);
      }
    }

    lines.push(`🏥 *المكان / المستشفى:* ${details.facilityOrLocationName}`);
    if (details.location?.googleMapsUrl) {
      lines.push(`📍 *الموقع على الخريطة:* ${details.location.googleMapsUrl}`);
    }

    lines.push(`📅 *الموعد المطلوب:* ${details.requiredDate}${details.requiredTime ? ` (${details.requiredTime})` : ''}`);

    if (details.description) {
      lines.push('');
      lines.push(`📝 *شرح الحالة والحاجة:*`);
      lines.push(details.description);
    }

    if (details.additionalNotes) {
      lines.push('');
      lines.push(`📌 *ملاحظة هامة:* ${details.additionalNotes}`);
    }

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━');

    // Contact info
    if (announcement.contact.allowCalls || announcement.contact.allowWhatsapp) {
      lines.push(`📞 *للتواصل والتنسيق الفوري:* ${announcement.contact.name} (${announcement.contact.phone})`);
      if (announcement.contact.allowWhatsapp && announcement.contact.whatsappPhone) {
        lines.push(`💬 *واتساب مباشر:* https://wa.me/${announcement.contact.whatsappPhone.replace(/[^0-9]/g, '')}`);
      }
    }

    lines.push('');
    lines.push(`🔗 *رابط الإعلان والتفاصيل في بوق البلد:*`);
    lines.push(webUrl);
    lines.push('');
    lines.push('🤝 _من فرّج عن مؤمن كربة من كرب الدنيا فرّج الله عنه كربة من كرب يوم القيامة_');

    return lines.join('\n');
  }

  /**
   * Router to format any announcement based on its category
   */
  public static formatMessage(announcement: Announcement, isUpdate = false): string {
    switch (announcement.category) {
      case 'farha':
        return this.formatFarhaMessage(announcement, isUpdate);
      case 'tarha':
        return this.formatTarhaMessage(announcement, isUpdate);
      case 'fazaa':
        return this.formatFazaaMessage(announcement, isUpdate);
      default:
        return announcement.title;
    }
  }
}
