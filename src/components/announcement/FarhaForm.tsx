import React, { useState } from 'react';
import { ContactInfo, FarhaDetails, GeoLocation } from '../../types';
import { LocationPicker } from '../common/LocationPicker';
import { createDefaultGeoLocation } from '../../services/maps/locations';
import { Sparkles, Calendar, Clock, Phone, MessageSquare, Heart, ShieldCheck } from 'lucide-react';

interface FarhaFormProps {
  initialTitle?: string;
  initialDetails?: Partial<FarhaDetails>;
  initialContact?: Partial<ContactInfo>;
  onSubmit: (data: {
    title: string;
    details: FarhaDetails;
    contact: ContactInfo;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const OCCASION_PRESETS = [
  'حفل زفاف مبارك',
  'عقد قران ومباركة',
  'حفل خطوبة',
  'استقبال مولود جديد',
  'تهنئة بتخرج جامعي',
  'نجاح وتفوق في الثانوية العامة',
  'دعوة عامة لمناسبة سعيدة',
  'افتتاح محل أو مشروع تجاري مبارك',
];

export const FarhaForm: React.FC<FarhaFormProps> = ({
  initialTitle = '',
  initialDetails,
  initialContact,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [occasionType, setOccasionType] = useState(initialDetails?.occasionType || 'حفل زفاف مبارك');
  const [title, setTitle] = useState(initialTitle || '');
  const [honorees, setHonorees] = useState(initialDetails?.honorees || '');
  const [date, setDate] = useState(initialDetails?.date || '');
  const [time, setTime] = useState(initialDetails?.time || 'الساعة 7:30 مساءً');
  const [venueName, setVenueName] = useState(initialDetails?.venueName || '');
  const [location, setLocation] = useState<GeoLocation>(
    initialDetails?.location || createDefaultGeoLocation('قاعة قصر الصنوبر', 'قلقيلية')
  );
  const [description, setDescription] = useState(initialDetails?.description || '');
  const [additionalNotes, setAdditionalNotes] = useState(initialDetails?.additionalNotes || '');

  // Contact State
  const [contactName, setContactName] = useState(initialContact?.name || '');
  const [contactPhone, setContactPhone] = useState(initialContact?.phone || '');
  const [contactWhatsapp, setContactWhatsapp] = useState(initialContact?.whatsappPhone || '');
  const [allowCalls, setAllowCalls] = useState(initialContact?.allowCalls ?? true);
  const [allowWhatsapp, setAllowWhatsapp] = useState(initialContact?.allowWhatsapp ?? true);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = 'يرجى كتابة عنوان الإعلان';
    if (!honorees.trim()) newErrors.honorees = 'يرجى كتابة أسماء أصحاب المناسبة';
    if (!date.trim()) newErrors.date = 'يرجى تحديد تاريخ المناسبة';
    if (!venueName.trim() && !location.name.trim()) newErrors.venueName = 'يرجى تحديد مكان المناسبة';
    if (!contactName.trim()) newErrors.contactName = 'يرجى إدخال اسم جهة التواصل';
    if (!contactPhone.trim()) newErrors.contactPhone = 'يرجى إدخال رقم الهاتف للتواصل';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      title: title.trim(),
      details: {
        occasionType,
        honorees: honorees.trim(),
        date: date.trim(),
        time: time.trim(),
        venueName: (venueName || location.name).trim(),
        location,
        description: description.trim(),
        additionalNotes: additionalNotes.trim() || undefined,
      },
      contact: {
        name: contactName.trim(),
        phone: contactPhone.trim(),
        whatsappPhone: contactWhatsapp.trim() || contactPhone.trim(),
        allowCalls,
        allowWhatsapp,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-right">
      {/* Category Header */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-emerald-950 text-base">إعلان فرحة ومناسبة سعيدة</h3>
          <p className="text-xs text-emerald-700">أفراح قلقيلية، حفلات الزفاف، التخرج، والمناسبات العائلية المباركة</p>
        </div>
      </div>

      {/* Occasion Quick Presets */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-2">نوع المناسبة</label>
        <div className="flex flex-wrap gap-2">
          {OCCASION_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setOccasionType(preset);
                if (!title) setTitle(`${preset}: `);
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                occasionType === preset
                  ? 'bg-emerald-800 text-white border-emerald-800 font-bold shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Announcement Title */}
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">
          عنوان الإعلان <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: دعوة لحفل زفاف العريس المهندس بلال موافي"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500"
        />
        {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
      </div>

      {/* Honorees & Occasion People */}
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">
          أسماء أصحاب المناسبة <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={honorees}
          onChange={(e) => setHonorees(e.target.value)}
          placeholder="مثال: العريس بلال زياد موافي والعروس رزان نزال"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
        />
        {errors.honorees && <p className="text-xs text-red-600 mt-1">{errors.honorees}</p>}
      </div>

      {/* Date & Time Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>تاريخ المناسبة</span> <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="مثال: الخميس 27 آب 2026"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
          />
          {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date}</p>}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-700" />
            <span>الوقت والتوقيت</span>
          </label>
          <input
            type="text"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="مثال: الساعة 7:30 مساءً"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Location Picker */}
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">
          مكان المناسبة والصالة <span className="text-red-500">*</span>
        </label>
        <LocationPicker
          label="اختر القاعة أو الديوان في قلقيلية"
          categoryFilter="hall"
          value={location}
          onChange={(loc) => {
            setLocation(loc);
            if (!venueName) setVenueName(loc.name);
          }}
          required
        />
        {errors.venueName && <p className="text-xs text-red-600 mt-1">{errors.venueName}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">تفاصيل ووصف الدعوة</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="يتشرف آل... بدعوتكم لحضور... وبتشريفكم تكتمل الأفراح..."
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Additional Notes */}
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">ملاحظات إضافية (اختياري)</label>
        <input
          type="text"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="مثال: سهرة الشباب يوم الأربعاء في ديوان العائلة..."
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
        />
      </div>

      {/* Contact Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
          <Phone className="w-4 h-4 text-emerald-700" />
          <span>بيانات التواصل والتهنئة</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              اسم جهة التواصل <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="مثال: أبو العريس / والد الخريج"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
            />
            {errors.contactName && <p className="text-xs text-red-600 mt-1">{errors.contactName}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رقم الهاتف للاتصال <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => {
                setContactPhone(e.target.value);
                if (!contactWhatsapp) setContactWhatsapp(e.target.value);
              }}
              placeholder="0599000000"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono"
            />
            {errors.contactPhone && <p className="text-xs text-red-600 mt-1">{errors.contactPhone}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            رقم واتساب للتواصل المباشر (اختياري)
          </label>
          <input
            type="tel"
            value={contactWhatsapp}
            onChange={(e) => setContactWhatsapp(e.target.value)}
            placeholder="مثال: 970599000000"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono"
          />
        </div>

        {/* Permissions Toggles */}
        <div className="flex flex-col sm:flex-row gap-4 pt-1">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={allowCalls}
              onChange={(e) => setAllowCalls(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <span>السماح بالاتصال الهاتفي 📞</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={allowWhatsapp}
              onChange={(e) => setAllowWhatsapp(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <span>السماح بالتواصل عبر واتساب 💬</span>
          </label>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال الإعلان للمراجعة'}</span>
        </button>
      </div>
    </form>
  );
};
