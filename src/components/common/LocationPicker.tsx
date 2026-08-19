import React, { useState } from 'react';
import { GeoLocation } from '../../types';
import { QALQILYA_LANDMARKS, buildGoogleMapsUrl, presetToGeoLocation } from '../../services/maps/locations';
import { MapPin, Search, ExternalLink, Building2, Check, Navigation } from 'lucide-react';

interface LocationPickerProps {
  label: string;
  categoryFilter?: 'mosque' | 'cemetery' | 'hall' | 'hospital' | 'general';
  value: GeoLocation;
  onChange: (location: GeoLocation) => void;
  required?: boolean;
  helpText?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  label,
  categoryFilter,
  value,
  onChange,
  required = false,
  helpText,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState(value.name || '');
  const [customAddress, setCustomAddress] = useState(value.address || '');
  const [customLat, setCustomLat] = useState(value.latitude.toString());
  const [customLng, setCustomLng] = useState(value.longitude.toString());
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter landmarks
  const filteredLandmarks = QALQILYA_LANDMARKS.filter((l) => {
    if (categoryFilter && categoryFilter !== 'general' && l.category !== categoryFilter) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    return l.name.includes(searchTerm) || l.address.includes(searchTerm);
  });

  const handleSelectPreset = (preset: typeof QALQILYA_LANDMARKS[0]) => {
    const geo = presetToGeoLocation(preset);
    onChange(geo);
    setCustomName(preset.name);
    setCustomAddress(preset.address);
    setCustomLat(preset.latitude.toString());
    setCustomLng(preset.longitude.toString());
    setShowDropdown(false);
  };

  const handleCustomChange = (name: string, address: string, latStr: string, lngStr: string) => {
    const lat = parseFloat(latStr) || 32.1932;
    const lng = parseFloat(lngStr) || 34.9818;
    onChange({
      name,
      address,
      latitude: lat,
      longitude: lng,
      googleMapsUrl: buildGoogleMapsUrl(lat, lng, name),
    });
  };

  return (
    <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setIsCustomMode(!isCustomMode)}
          className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
        >
          {isCustomMode ? 'اختيار من معالم قلقيلية' : 'إدخال مكان مخصص'}
        </button>
      </div>

      {helpText && <p className="text-xs text-slate-500">{helpText}</p>}

      {!isCustomMode ? (
        <div className="space-y-2">
          {/* Quick Search Preset Input */}
          <div className="relative">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder={value.name ? value.name : 'ابحث أو اختر من معالم قلقيلية المعروفة...'}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
              {value.name && (
                <span className="absolute left-3 flex items-center text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                  <Check className="w-3 h-3 ml-1" />
                  محدد
                </span>
              )}
            </div>

            {/* Dropdown list */}
            {showDropdown && (
              <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                <div className="p-2 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 flex justify-between items-center">
                  <span>الأماكن والمعالم المقترحة في قلقيلية:</span>
                  <button
                    type="button"
                    onClick={() => setShowDropdown(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    إغلاق ✕
                  </button>
                </div>
                {filteredLandmarks.length > 0 ? (
                  <div className="py-1">
                    {filteredLandmarks.map((landmark) => {
                      const isSelected = value.name === landmark.name;
                      return (
                        <button
                          key={landmark.id}
                          type="button"
                          onClick={() => handleSelectPreset(landmark)}
                          className={`w-full text-right px-3 py-2 text-sm flex items-start gap-2 hover:bg-emerald-50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-emerald-50/80 font-bold text-emerald-900' : 'text-slate-700'
                          }`}
                        >
                          <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs sm:text-sm font-semibold">{landmark.name}</p>
                            <p className="text-[11px] text-slate-400">{landmark.address}</p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    لم نجد معلماً بهذا الاسم. يمكنك التبديل إلى "إدخال مكان مخصص".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick presets pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {QALQILYA_LANDMARKS.filter((l) => !categoryFilter || categoryFilter === 'general' || l.category === categoryFilter)
              .slice(0, 4)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                    value.name === p.name
                      ? 'bg-emerald-800 text-white border-emerald-800 font-bold shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-800'
                  }`}
                >
                  {p.name.split('(')[0].trim()}
                </button>
              ))}
          </div>
        </div>
      ) : (
        /* Custom Input Form */
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">اسم المكان / العنوان</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => {
                setCustomName(e.target.value);
                handleCustomChange(e.target.value, customAddress, customLat, customLng);
              }}
              placeholder="مثال: ديوان آل شريم / قاعة النور"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">خط العرض (Latitude)</label>
              <input
                type="text"
                value={customLat}
                onChange={(e) => {
                  setCustomLat(e.target.value);
                  handleCustomChange(customName, customAddress, e.target.value, customLng);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">خط الطول (Longitude)</label>
              <input
                type="text"
                value={customLng}
                onChange={(e) => {
                  setCustomLng(e.target.value);
                  handleCustomChange(customName, customAddress, customLat, e.target.value);
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Selected location summary & direct Google Maps link preview */}
      {value.name && (
        <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-200/80 rounded-lg px-3 py-2 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold text-emerald-900 truncate">{value.name}</span>
          </div>
          <a
            href={value.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold shrink-0 ml-1 underline"
            title="فتح في خرائط Google"
          >
            <span>فتح الخريطة</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};
