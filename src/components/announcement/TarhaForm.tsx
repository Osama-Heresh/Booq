import React, { useState } from 'react';
import { ContactInfo, GeoLocation, TarhaDetails } from '../../types';
import { LocationPicker } from '../common/LocationPicker';
import { createDefaultGeoLocation } from '../../services/maps/locations';
import { Calendar, Clock, Phone, ShieldCheck, AlertCircle, Building, Bookmark } from 'lucide-react';

interface TarhaFormProps {
  initialTitle?: string;
  initialDetails?: Partial<TarhaDetails>;
  initialContact?: Partial<ContactInfo>;
  onSubmit: (data: {
    title: string;
    details: TarhaDetails;
    contact: ContactInfo;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const TarhaForm: React.FC<TarhaFormProps> = ({
  initialTitle = '',
  initialDetails,
  initialContact,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [deceasedName, setDeceasedName] = useState(initialDetails?.deceasedName || '');
  const [title, setTitle] = useState(initialTitle || '');
  const [deathDate, setDeathDate] = useState(initialDetails?.deathDate || 'اليوم');
  const [prayerTime, setPrayerTime] = useState(initialDetails?.prayerTime || 'بعد صلاة العصر مباشرة');

  // 1. Mosque location
  const [mosqueName, setMosqueName] = useState(initialDetails?.mosqueName || '');
  const [mosqueLocation, setMosqueLocation] = useState<GeoLocation>(
    initialDetails?.mosqueLocation || createDefaultGeoLocation('مسجد علي بن أبي طالب', 'وسط البلد')
  );

  // 2. Cemetery location
  const [cemeteryName, setCemeteryName] = useState(initialDetails?.cemeteryName || '');
  const [cemeteryLocation, setCemeteryLocation] = useState<GeoLocation>(
    initialDetails?.cemeteryLocation || createDefaultGeoLocation('مقبرة المرابطين الجديدة', 'المدخل الشمالي')
  );

  // 3. Condolence Venue location
  const [condolenceVenue, setCondolenceVenue] = useState(initialDetails?.condolenceVenue || '');
  const [condolenceLocation, setCondolenceLocation] = useState<GeoLocation>(
    initialDetails?.condolenceLocation || createDefaultGeoLocation('ديوان العائلة', 'قلقيلية')
  );

  const [condolenceDuration, setCondolenceDuration] = useState(
    initialDetails?.condolenceDuration || 'لمدة ثلاثة أيام (من اليوم حتى الجمعة)'
  );
  const [condolenceHours, setCondolenceHours] = useState(
    initialDetails?.condolenceHours || 'من الساعة 5:00 عصراً حتى 9:30 مساءً'
  );
  const [description, setDescription] = useState(initialDetails?.description || '');
  const [additionalNotes, setAdditionalNotes] = useState(initialDetails?.additionalNotes || '');
  const [declarationConfirmed, setDeclarationConfirmed] = useState(
    initialDetails?.declarationConfirmed ?? false
  );

  // Contact info
  const [contactName, setContactName] = useState(initialContact?.name || '');
  const [contactPhone, setContactPhone] = useState(initialContact?.phone || '');
  const [contactWhatsapp, setContactWhatsapp] = useState(initialContact?.whatsappPhone || '');
  const [allowCalls, setAllowCalls] = useState(initialContact?.allowCalls ?? true);
  const [allowWhatsapp, setAllowWhatsapp] = useState(initialContact?.allowWhatsapp ?? true);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleDeceasedChange = (name: string) => {
    setDeceasedName(name);
    if (!title || title.startsWith('انتقال إلى رحمة الله')) {
      setTitle(name ? `انتقال إلى رحمة الله تعالى: ${name}` : '');
    }
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!deceasedName.trim()) newErrors.deceasedName = 'يرجى كتابة الاسم الكامل للمتوفى';
    if (!title.trim()) newErrors.title = 'يرجى كتابة عنوان الإعلان';
    if (!deathDate.trim()) newErrors.deathDate = 'يرجى تحديد تاريخ أو يوم الوفاة';
    if (!prayerTime.trim()) newErrors.prayerTime = 'يرجى تحديد وقت الصلاة';
    if (!mosqueLocation.name.trim() && !mosqueName.trim()) newErrors.mosque = 'يرجى تحديد المسجد وموقعه';
    if (!cemeteryLocation.name.trim() && !cemeteryName.trim()) newErrors.cemetery = 'يرجى تحديد المقبرة وموقعها';
    if (!condolenceLocation.name.trim() && !condolenceVenue.trim()) newErrors.condolence = 'يرجى تحديد بيت العزاء وموقعه';
    if (!contactName.trim()) newErrors.contactName = 'يرجى إدخال اسم جهة التواصل';
    if (!contactPhone.trim()) newErrors.contactPhone = 'يرجى إدخال رقم هاتف للتواصل';
    if (!declarationConfirmed) newErrors.declaration = 'يجب الموافقة على إقرار صحة المعلومات والمسؤولية للمتابعة';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      title: title.trim(),
      details: {
        deceasedName: deceasedName.trim(),
        deathDate: deathDate.trim(),
        prayerTime: prayerTime.trim(),
        mosqueName: (mosqueName || mosqueLocation.name).trim(),
        mosqueLocation,
        cemeteryName: (cemeteryName || cemeteryLocation.name).trim(),
        cemeteryLocation,
        condolenceVenue: (condolenceVenue || condolenceLocation.name).trim(),
        condolenceLocation,
        condolenceDuration: condolenceDuration.trim(),
        condolenceHours: condolenceHours.trim(),
        description: description.trim() || undefined,
        additionalNotes: additionalNotes.trim() || undefined,
        declarationConfirmed,
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
      <div className="bg-rose-950/10 border border-rose-900/20 rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-rose-300 flex items-center justify-center font-black shrink-0">
          ⚫
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-base">إعلان ترحة وواجب عزاء</h3>
          <p className="text-xs text-slate-600">إنا لله وإنا إليه راجعون • إعلانات الوفيات ومواعيد الدفن ومواقع العزاء في قلقيلية</p>
        </div>
      </div>

      {/* Deceased Full Name */}
      <div>
        <label className="block text-sm font-bold text-slate-800 mb-1">
          الاسم الكامل للمتوفى / المرحوم <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={deceasedName}
          onChange={(e) => handleDeceasedChange(e.target.value)}
          placeholder="مثال: الحاج صبحي عثمان شريم (أبو أحمد)"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-800"
        />
        {errors.deceasedName && <p className="text-xs text-red-600 mt-1">{errors.deceasedName}</p>}
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
          placeholder="مثال: انتقال إلى رحمة الله تعالى: الحاج صبحي عثمان شريم"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-slate-800"
        />
        {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
      </div>

      {/* Date of death & Prayer time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-700" />
            <span>تاريخ / يوم الوفاة</span> <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={deathDate}
            onChange={(e) => setDeathDate(e.target.value)}
            placeholder="مثال: الأربعاء 19 آب 2026"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm"
          />
          {errors.deathDate && <p className="text-xs text-red-600 mt-1">{errors.deathDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-700" />
            <span>وقت وتوقيت الصلاة</span> <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={prayerTime}
            onChange={(e) => setPrayerTime(e.target.value)}
            placeholder="مثال: بعد صلاة الظهر / بعد صلاة العصر"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm"
          />
          {errors.prayerTime && <p className="text-xs text-red-600 mt-1">{errors.prayerTime}</p>}
        </div>
      </div>

      {/* THREE SEPARATE MAP LOCATIONS */}
      <div className="space-y-4 pt-2">
        <h4 className="font-bold text-sm text-slate-900 border-b pb-2 flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-slate-700" />
          <span>المواقع والخرائط الثلاثة (المسجد • المقبرة • مكان العزاء)</span>
        </h4>

        {/* 1. Mosque */}
        <div>
          <LocationPicker
            label="1. المسجد وموقع صلاة الجنازة"
            categoryFilter="mosque"
            value={mosqueLocation}
            onChange={(loc) => {
              setMosqueLocation(loc);
              if (!mosqueName) setMosqueName(loc.name);
            }}
            required
            helpText="اختر المسجد الذي ستُقام فيه صلاة الجنازة"
          />
          {errors.mosque && <p className="text-xs text-red-600 mt-1">{errors.mosque}</p>}
        </div>

        {/* 2. Cemetery */}
        <div>
          <LocationPicker
            label="2. المقبرة وموقع الدفن"
            categoryFilter="cemetery"
            value={cemeteryLocation}
            onChange={(loc) => {
              setCemeteryLocation(loc);
              if (!cemeteryName) setCemeteryName(loc.name);
            }}
            required
            helpText="اختر المقبرة التي سيوارى فيها جثمان الفقيد الثرى"
          />
          {errors.cemetery && <p className="text-xs text-red-600 mt-1">{errors.cemetery}</p>}
        </div>

        {/* 3. Condolence Venue */}
        <div>
          <LocationPicker
            label="3. مكان استقبال التعازي وبيوت الأجر"
            categoryFilter="hall"
            value={condolenceLocation}
            onChange={(loc) => {
              setCondolenceLocation(loc);
              if (!condolenceVenue) setCondolenceVenue(loc.name);
            }}
            required
            helpText="اختر الديوان أو الصالة أو القاعة المخصصة لاستقبال المعزين"
          />
          {errors.condolence && <p className="text-xs text-red-600 mt-1">{errors.condolence}</p>}
        </div>
      </div>

      {/* Condolence Duration & Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">مدة استقبال التعازي</label>
          <input
            type="text"
            value={condolenceDuration}
            onChange={(e) => setCondolenceDuration(e.target.value)}
            placeholder="مثال: لمدة ثلاثة أيام (الأربعاء، الخميس، الجمعة)"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">أوقات استقبال التعازي</label>
          <input
            type="text"
            value={condolenceHours}
            onChange={(e) => setCondolenceHours(e.target.value)}
            placeholder="مثال: من الساعة 5:00 عصراً حتى 9:30 مساءً"
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Additional Notes (Women condolences, etc.) */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية أو تعازي النساء (اختياري)</label>
        <input
          type="text"
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
          placeholder="مثال: تقبل تعازي النساء في منزل الفقيد الكائن في شارع..."
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
        />
      </div>

      {/* Contact Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
          <Phone className="w-4 h-4 text-slate-700" />
          <span>بيانات جهة التواصل والتعزية</span>
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
              placeholder="مثال: نجل الفقيد / شقيق الفقيد"
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
            رقم واتساب لتقديم واجب العزاء
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
              className="w-4 h-4 text-slate-800 rounded"
            />
            <span>السماح بالاتصال الهاتفي 📞</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={allowWhatsapp}
              onChange={(e) => setAllowWhatsapp(e.target.checked)}
              className="w-4 h-4 text-slate-800 rounded"
            />
            <span>السماح بالتعزية عبر واتساب 💬</span>
          </label>
        </div>
      </div>

      {/* Mandatory Publisher Declaration for Tarha */}
      <div className="bg-amber-50/80 border-2 border-amber-300/80 rounded-xl p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={declarationConfirmed}
            onChange={(e) => setDeclarationConfirmed(e.target.checked)}
            className="w-5 h-5 mt-0.5 text-amber-700 rounded border-amber-400 focus:ring-amber-500 shrink-0"
          />
          <div className="text-xs text-amber-950 leading-relaxed font-semibold">
            <span className="text-red-600 font-bold">* إقرار إلزامي: </span>
            "أقر بأن المعلومات الواردة في هذا الإعلان صحيحة، وأتحمل مسؤولية تقديمها للمراجعة والنشر."
          </div>
        </label>
        {errors.declaration && <p className="text-xs text-red-600 mt-2 font-bold">{errors.declaration}</p>}
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
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال الإعلان للمراجعة'}</span>
        </button>
      </div>
    </form>
  );
};
