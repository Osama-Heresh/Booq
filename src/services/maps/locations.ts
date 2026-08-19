import { GeoLocation } from '../../types';

export interface LocationPreset {
  id: string;
  name: string;
  category: 'mosque' | 'cemetery' | 'hall' | 'hospital' | 'general';
  address: string;
  latitude: number;
  longitude: number;
}

export const QALQILYA_LANDMARKS: LocationPreset[] = [
  // المساجد
  {
    id: 'mosque_ali',
    name: 'مسجد علي بن أبي طالب (المسجد القديم - وسط البلد)',
    category: 'mosque',
    address: 'وسط مدينة قلقيلية، قرب البلدية القديمة',
    latitude: 32.1932,
    longitude: 34.9818,
  },
  {
    id: 'mosque_abu_bakr',
    name: 'مسجد أبو بكر الصديق (حي كفر سابا)',
    category: 'mosque',
    address: 'شارع الحديقة، حي كفر سابا، قلقيلية',
    latitude: 32.1985,
    longitude: 34.9745,
  },
  {
    id: 'mosque_taymiyyah',
    name: 'مسجد ابن تيمية (حي النقار)',
    category: 'mosque',
    address: 'حي النقار الشرقي، قلقيلية',
    latitude: 32.1895,
    longitude: 34.9920,
  },
  {
    id: 'mosque_murabitin',
    name: 'مسجد المرابطين',
    category: 'mosque',
    address: 'قرب مقبرة المرابطين، شمال قلقيلية',
    latitude: 32.2040,
    longitude: 34.9830,
  },
  {
    id: 'mosque_shafii',
    name: 'مسجد الإمام الشافعي',
    category: 'mosque',
    address: 'شارع وادي الرشا، قلقيلية',
    latitude: 32.1901,
    longitude: 34.9750,
  },

  // المقابر
  {
    id: 'cemetery_murabitin',
    name: 'مقبرة المرابطين (المقبرة الجديدة)',
    category: 'cemetery',
    address: 'المدخل الشمالي للمدينة، قلقيلية',
    latitude: 32.2052,
    longitude: 34.9835,
  },
  {
    id: 'cemetery_old',
    name: 'مقبرة المدينة القديمة (الوسطى)',
    category: 'cemetery',
    address: 'شارع الشهداء، وسط البلد، قلقيلية',
    latitude: 32.1945,
    longitude: 34.9805,
  },
  {
    id: 'cemetery_south',
    name: 'مقبرة قلقيلية الجنوبية (حي القرعان)',
    category: 'cemetery',
    address: 'المنطقة الجنوبية، قلقيلية',
    latitude: 32.1850,
    longitude: 34.9860,
  },

  // الصالات والدواوين
  {
    id: 'diwan_nazzal',
    name: 'ديوان آل نزال',
    category: 'hall',
    address: 'شارع النفق، قلقيلية',
    latitude: 32.1920,
    longitude: 34.9790,
  },
  {
    id: 'diwan_shreim',
    name: 'ديوان آل شريم',
    category: 'hall',
    address: 'شارع نابلس القديم، قلقيلية',
    latitude: 32.1948,
    longitude: 34.9840,
  },
  {
    id: 'diwan_zeid',
    name: 'ديوان آل زيد',
    category: 'hall',
    address: 'حي كفر سابا، قلقيلية',
    latitude: 32.1970,
    longitude: 34.9770,
  },
  {
    id: 'diwan_dawood',
    name: 'ديوان آل داود',
    category: 'hall',
    address: 'حي كفر سابا، قلقيلية',
    latitude: 32.1965,
    longitude: 34.9730,
  },
  {
    id: 'hall_snawbar',
    name: 'قاعة قصر الصنوبر للأفراح والمناسبات',
    category: 'hall',
    address: 'الشارع الغربي، قرب حديقة الحيوانات الوطنية، قلقيلية',
    latitude: 32.2010,
    longitude: 34.9715,
  },
  {
    id: 'hall_omaraa',
    name: 'قاعة الأمراء الملكية',
    category: 'hall',
    address: 'شارع قلقيلية - حبلة، قلقيلية',
    latitude: 32.1830,
    longitude: 34.9890,
  },
  {
    id: 'hall_municipality',
    name: 'قاعة بلدية قلقيلية الكبرى',
    category: 'hall',
    address: 'مجمع بلدية قلقيلية، ميدان أبو علي إياد',
    latitude: 32.1925,
    longitude: 34.9822,
  },

  // المستشفيات والمراكز الصحية
  {
    id: 'hospital_darwish',
    name: 'مستشفى الدكتور درويش نزال الحكومي',
    category: 'hospital',
    address: 'شارع المستشفى، قلقيلية',
    latitude: 32.1870,
    longitude: 34.9885,
  },
  {
    id: 'hospital_unrwa',
    name: 'مستشفى وكالة الغوث (الأونروا)',
    category: 'hospital',
    address: 'شارع الوكالة، قلقيلية',
    latitude: 32.1912,
    longitude: 34.9780,
  },
  {
    id: 'red_crescent',
    name: 'جمعية الهلال الأحمر الفلسطيني - قلقيلية',
    category: 'hospital',
    address: 'شارع رفيديا، قلقيلية',
    latitude: 32.1950,
    longitude: 34.9860,
  },
];

/**
 * Builds a clean, universal Google Maps navigation and pin URL
 */
export function buildGoogleMapsUrl(lat: number, lng: number, placeName?: string): string {
  const encodedName = placeName ? encodeURIComponent(placeName) : '';
  if (encodedName) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodedName}`;
  }
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Creates a GeoLocation object with sane defaults centered in Qalqilya
 */
export function createDefaultGeoLocation(name = '', address = ''): GeoLocation {
  const defaultLat = 32.1932;
  const defaultLng = 34.9818;
  return {
    name,
    address,
    latitude: defaultLat,
    longitude: defaultLng,
    googleMapsUrl: buildGoogleMapsUrl(defaultLat, defaultLng, name),
  };
}

/**
 * Converts a preset to GeoLocation
 */
export function presetToGeoLocation(preset: LocationPreset): GeoLocation {
  return {
    name: preset.name,
    address: preset.address,
    latitude: preset.latitude,
    longitude: preset.longitude,
    googleMapsUrl: buildGoogleMapsUrl(preset.latitude, preset.longitude, preset.name),
  };
}
