import React, { useState } from 'react';
import { ContactInfo, FazaaDetails, FazaaUrgency, GeoLocation } from '../../types';
import { LocationPicker } from '../common/LocationPicker';
import { createDefaultGeoLocation } from '../../services/maps/locations';
import { AlertTriangle, Flame, ShieldAlert, Phone, Calendar, Clock, Droplet, Users } from 'lucide-react';

interface FazaaFormProps {
  initialTitle?: string;
  initialDetails?: Partial<FazaaDetails>;
  initialContact?: Partial<ContactInfo>;
  onSubmit: (data: {
    title: string;
    details: FazaaDetails;
    contact: ContactInfo;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const FAZAA_PRESETS = [
  'تبرع عاجل بالدم',
  'جاهة وصلح عشائري',
  'مساعدة إنسانية وطارئة',
  'بحث عن مفقود',
  'إغاثة عاجلة وترميم',
  'حملة مساندة مجتمعية',
];

const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+', 'أي فصيلة سالبة'];

export const FazaaForm: React.FC<FazaaFormProps> = ({
  initialTitle = '',
  initialDetails,
  initialContact,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [fazaaType, setFazaaType] = useState(initialDetails?.fazaaType || 'تبرع عاجل بالدم');
  const [urgency, setUrgency] = useState<FazaaUrgency>(initialDetails?.urgency || 'urgent');
  const [title, setTitle] = useState(initialTitle || '');
  const [targetPersonOrEntity, setTargetPersonOrEntity] = useState(initialDetails?.targetPersonOrEntity || '');
  const [facilityOrLocationName, setFacilityOrLocationName] = useState(initialDetails?.facilityOrLocationName || '');
  const [location, setLocation] = useState<GeoLocation>(
    initialDetails?.location || createDefaultGeoLocation('مستشفى الدكتور درويش نزال الحكومي', 'قلقيلية')
  );

  const [bloodType, setBloodType] = useState(initialDetails?.bloodType || '');
  const [unitsNeeded, setUnitsNeeded] = useState<number | undefined>(initialDetails?.unitsNeeded || 2);
  const [requiredDate, setRequiredDate] = useState(initialDetails?.requiredDate || 'اليوم عاجلاً');
  const [requiredTime, setRequiredTime] = useState(initialDetails?.requiredTime || 'خلال الساعات القادمة');
  const [description, setDescription] = useState(initialDetails?.description || '');
  const [additionalNotes, setAdditionalNotes] = useState(initialDetails?.additionalNotes || '');

  // Contact info
  const [contactName, setContactName] = useState(initialContact?.name || '');
  const [contactPhone, setContactPhone] = useState(initialContact?.phone || '');
  const [contactWhatsapp, setContactWhatsapp] = useState(initialContact?.whatsappPhone || '');
  const [allowCalls, setAllowCalls] = useState(initialContact?.allowCalls ?? true);
  const [allowWhatsapp, setAllowWhatsapp] = useState(initialContact?.allowWhatsapp ?? true);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isBloodDonation = fazaaType.includes('دم');

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = 'يرجى كتابة عنوان الإعلان والنداء';
    if (!facilityOrLocationName.trim() && !location.name.trim()) newErrors.facility = 'يرجى تحديد المستشفى أو موقع الفزعة';
    if (!description.trim()) newErrors.description = 'يرجى كتابة تفاصيل ووصف الحاجة';
    if (!contactName.trim()) newErrors.contactName = 'يرجى إدخال اسم جهة التواصل';
    if (!contactPhone.trim()) newErrors.contactPhone = 'يرجى إدخال رقم هاتف للتواصل الفوري';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      title: title.trim(),
      details: {
        fazaaType,
        urgency,
        targetPersonOrEntity: targetPersonOrEntity.trim(),
        facilityOrLocationName: (facilityOrLocationName || location.name).trim(),
        location,
        bloodType: isBloodDonation ? bloodType : undefined,
        unitsNeeded: isBloodDonation ? unitsNeeded : undefined,
        requiredDate: requiredDate.trim(),
        requiredTime: requiredTime.trim() || undefined,
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
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-red-950 text-base">نداء فزعة ومساندة مجتمعية</h3>
            <p className="text-xs text-red-700">تبرع بالدم، جاهات الصلح، والمواقف التي تحتاج وقفة أهل البلد</p>
          </div>
        </div>

        {/* Urgency Badge Indicator */}
        {urgency === 'critical' && (
          <span className="px-3 py-1 bg-red-600 text-white text-xs font-black rounded-full animate-pulse flex items-center gap-1 shadow-xs">
            <ShieldAlert className="w-3.5 h-3.5" />
            عاجل جداً
          </span>
        )}
      </div>

      {/* Urgency Selector */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
        <label className="block text-xs font-bold text-slate-800">
          درجة الاستعجال <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setUrgency('normal')}
            className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              urgency === 'normal'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'
            }`}
          >
            عادي (مساندة)
          </button>
          <button
            type="button"
            onClick={() => setUrgency('urgent')}
            className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              urgency === 'urgent'
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-red-400'
            }`}
          >
            🔴 عاجل
          </button>
          <button
            type="button"
            onClick={() => setUrgency('critical')}
            className={`py-2 px-3 text-xs font-extrabold rounded-lg border transition-all cursor-pointer ${
              urgency === 'critical'
                ? 'bg-red-800 text-white border-red-800 shadow-sm ring-2 ring-red-400'
                : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
            }`}
          >
            🚨 عاجل جدًا (طارئ)
          </button>
        </div>
      </div>

      {/* Fazaa Type Presets */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-2">نوع الفزعة</label>
        <div className="flex flex-wrap gap-2">
          {FAZAA_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setFazaaType(preset);
                if (preset.includes('دم') && !bloodType) {
                  setBloodType('O-');
                }
              }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                fazaaType === preset
                  ? 'bg-red-700 text-white border-red-700 font-bold shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-red-300'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">
          عنوان النداء والإعلان <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: نداء تبرع عاجل بالدم فصيلة (O سالب) في مستشفى درويش نزال"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500"
        />
        {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
      </div>

      {/* Blood Donation Specific Fields */}
      {isBloodDonation && (
        <div className="bg-red-50/70 border border-red-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-red-900">
            <Droplet className="w-4 h-4 text-red-600" />
            <span>بيانات بنك الدم وفصيلة الدم المطلوبة</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">اختر فصيلة الدم</label>
            <div className="flex flex-wrap gap-1.5">
              {BLOOD_TYPES.map((bt) => (
                <button
                  key={bt}
                  type="button"
                  onClick={() => setBloodType(bt)}
                  className={`text-xs px-3 py-1 rounded-md font-mono font-bold border transition-colors cursor-pointer ${
                    bloodType === bt
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-slate-800 border-slate-300 hover:bg-red-50'
                  }`}
                >
                  {bt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">عدد الوحدات المطلوبة</label>
              <input
                type="number"
                min="1"
                max="20"
                value={unitsNeeded || ''}
                onChange={(e) => setUnitsNeeded(parseInt(e.target.value) || undefined)}
                placeholder="مثال: 3"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">المستفيد / اسم الحالة</label>
              <input
                type="text"
                value={targetPersonOrEntity}
                onChange={(e) => setTargetPersonOrEntity(e.target.value)}
                placeholder="مريض قسم العناية / الجراحة"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Target Person for non-blood */}
      {!isBloodDonation && (
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1">
            اسم الشخص أو الجهة المحتاجة / المستفيد
          </label>
          <input
            type="text"
            value={targetPersonOrEntity}
            onChange={(e) => setTargetPersonOrEntity(e.target.value)}
            placeholder="مثال: وجهاء البلد / أسرة كريمة / شباب متطوعون"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm"
          />
        </div>
      )}

      {/* Facility & Location Picker */}
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">
          المستشفى أو مكان التجمع والنداء <span className="text-red-500">*</span>
        </label>
        <LocationPicker
          label="اختر المستشفى أو الموقع في قلقيلية"
          categoryFilter={isBloodDonation ? 'hospital' : 'general'}
          value={location}
          onChange={(loc) => {
            setLocation(loc);
            if (!facilityOrLocationName) setFacilityOrLocationName(loc.name);
          }}
          required
        />
        {errors.facility && <p className="text-xs text-red-600 mt-1">{errors.facility}</p>}
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-red-600" />
            <span>تاريخ الحاجة</span>
          </label>
          <input
            type="text"
            value={requiredDate}
            onChange={(e) => setRequiredDate(e.target.value)}
            placeholder="مثال: اليوم فوراً"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-red-600" />
            <span>الوقت المطلوب</span>
          </label>
          <input
            type="text"
            value={requiredTime}
            onChange={(e) => setRequiredTime(e.target.value)}
            placeholder="مثال: حتى الساعة 6:00 مساءً"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">
          وصف الحالة والتفاصيل <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="اشرح الحالة وما المطلوب من المتطوعين أو أهل البلد بالتفصيل..."
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500"
        />
        {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
      </div>

      {/* Contact Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
          <Phone className="w-4 h-4 text-red-600" />
          <span>بيانات التواصل السريع والتنسيق</span>
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
              placeholder="مثال: منسق الحالة / قريب المريض"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
            />
            {errors.contactName && <p className="text-xs text-red-600 mt-1">{errors.contactName}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              رقم الهاتف للاتصال المباشر <span className="text-red-500">*</span>
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
            رقم واتساب للتنسيق والمتابعة
          </label>
          <input
            type="tel"
            value={contactWhatsapp}
            onChange={(e) => setContactWhatsapp(e.target.value)}
            placeholder="مثال: 970599000000"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-1">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={allowCalls}
              onChange={(e) => setAllowCalls(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span>السماح بالاتصال الهاتفي 📞</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={allowWhatsapp}
              onChange={(e) => setAllowWhatsapp(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
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
          className="px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال نداء الفزعة للمراجعة'}</span>
        </button>
      </div>
    </form>
  );
};
