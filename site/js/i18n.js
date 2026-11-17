// UI strings and display helpers. Ukrainian first, English second.

export const STRINGS = {
  uk: {
    views: { graph: 'Граф', timeline: 'Хронологія', map: 'Мапа', quiz: 'Квіз' },
    soon: 'скоро',
    issues: 'Випуски',
    showIssues: 'Показати випуски',
    hideIssues: 'Сховати випуски',
    wholeAtlas: 'Весь атлас',
    issueCount: n => `У випуску: ${n}`,
    search: 'Людина, твір, місце…',
    searchLabel: 'Пошук',
    noResults: 'Нічого не знайдено',
    types: { person: 'Люди', work: 'Твори', place: 'Місця', event: 'Події', movement: 'Течії' },
    type1: { person: 'Людина', work: 'Твір', place: 'Місце', event: 'Подія', movement: 'Течія' },
    coreOnly: 'Лише головні',
    allCountries: 'Усі країни',
    allKinds: 'Усі види',
    centuryFrom: 'Від',
    centuryTo: 'до',
    shown: (n, total) => `Показано ${n} з ${total}`,
    showAll: 'показати всі',
    focus: label => `Сусіди: ${label}`,
    clearFocus: 'Прибрати фокус',
    zoomIn: 'Наблизити', zoomOut: 'Віддалити', fit: 'Показати все',
    back: 'Назад', close: 'Закрити',
    relations: 'Зв\'язки',
    mentionedIn: 'Згадується в',
    sources: 'Джерела',
    wikipedia: 'Вікіпедія', wikipediaEn: 'Wikipedia (en)',
    photo: 'Фото',
    noSummary: 'Опису ще немає.',
    theme: { auto: 'Тема: як у системі', light: 'Світла тема', dark: 'Темна тема' },
    loading: 'Завантаження…',
    loadError: 'Не вдалося завантажити дані.',
    kinds: {
      architecture: 'Архітектура', painting: 'Живопис', sculpture: 'Скульптура', engineering: 'Інженерія',
      urbanism: 'Містобудування', mosaic: 'Мозаїка', literature: 'Література', patronage: 'Меценатство', history: 'Історія',
    },
    // Heading for a group of relations, seen from the open node.
    relOut: {
      created: 'Твори', commissioned: 'Замовлення', relocated: 'Переміщував', located_in: 'Розташування',
      born_in: 'Місце народження', died_in: 'Місце смерті', buried_in: 'Місце поховання', depicts: 'Зображує',
      patron_of: 'Підопічні', rival_of: 'Суперники', relative_of: 'Родичі', influenced: 'Вплинув(-ла) на',
      part_of: 'Частина', restored: 'Реставрував(-ла)', stolen_from: 'Звідки викрадено', involved_in: 'Події',
    },
    relIn: {
      created: 'Автори', commissioned: 'Замовники', relocated: 'Переміщували', located_in: 'Тут розташовані',
      born_in: 'Тут народилися', died_in: 'Тут померли', buried_in: 'Тут поховані', depicts: 'Зображено в',
      patron_of: 'Покровителі', rival_of: 'Суперники', relative_of: 'Родичі', influenced: 'Вплив',
      part_of: 'Складові', restored: 'Реставратори', stolen_from: 'Викрадення', involved_in: 'Учасники',
    },
    // Short edge label in the graph (from → to).
    relShort: {
      created: 'створив', commissioned: 'замовив', relocated: 'перемістив', located_in: 'розташоване в',
      born_in: 'народився', died_in: 'помер', buried_in: 'похований', depicts: 'зображує',
      patron_of: 'покровитель', rival_of: 'суперник', relative_of: 'родич', influenced: 'вплив',
      part_of: 'частина', restored: 'реставрував', stolen_from: 'викрадено з', involved_in: 'учасник',
    },
  },
  en: {
    views: { graph: 'Graph', timeline: 'Timeline', map: 'Map', quiz: 'Quiz' },
    soon: 'soon',
    issues: 'Issues',
    showIssues: 'Show issues',
    hideIssues: 'Hide issues',
    wholeAtlas: 'Whole atlas',
    issueCount: n => `In this issue: ${n}`,
    search: 'Person, work, place…',
    searchLabel: 'Search',
    noResults: 'Nothing found',
    types: { person: 'People', work: 'Works', place: 'Places', event: 'Events', movement: 'Movements' },
    type1: { person: 'Person', work: 'Work', place: 'Place', event: 'Event', movement: 'Movement' },
    coreOnly: 'Main only',
    allCountries: 'All countries',
    allKinds: 'All arts',
    centuryFrom: 'From',
    centuryTo: 'to',
    shown: (n, total) => `Showing ${n} of ${total}`,
    showAll: 'show all',
    focus: label => `Neighbours: ${label}`,
    clearFocus: 'Clear focus',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out', fit: 'Fit all',
    back: 'Back', close: 'Close',
    relations: 'Relations',
    mentionedIn: 'Mentioned in',
    sources: 'Sources',
    wikipedia: 'Wikipedia (uk)', wikipediaEn: 'Wikipedia',
    photo: 'Photo',
    noSummary: 'No description yet.',
    theme: { auto: 'Theme: system', light: 'Light theme', dark: 'Dark theme' },
    loading: 'Loading…',
    loadError: 'Could not load the data.',
    kinds: {
      architecture: 'Architecture', painting: 'Painting', sculpture: 'Sculpture', engineering: 'Engineering',
      urbanism: 'Urbanism', mosaic: 'Mosaic', literature: 'Literature', patronage: 'Patronage', history: 'History',
    },
    relOut: {
      created: 'Works', commissioned: 'Commissioned', relocated: 'Relocated', located_in: 'Location',
      born_in: 'Born in', died_in: 'Died in', buried_in: 'Buried in', depicts: 'Depicts',
      patron_of: 'Patron of', rival_of: 'Rivals', relative_of: 'Family', influenced: 'Influenced',
      part_of: 'Part of', restored: 'Restored', stolen_from: 'Stolen from', involved_in: 'Events',
    },
    relIn: {
      created: 'Creators', commissioned: 'Commissioned by', relocated: 'Relocated by', located_in: 'Located here',
      born_in: 'Born here', died_in: 'Died here', buried_in: 'Buried here', depicts: 'Depicted in',
      patron_of: 'Patrons', rival_of: 'Rivals', relative_of: 'Family', influenced: 'Influenced by',
      part_of: 'Parts', restored: 'Restored by', stolen_from: 'Thefts', involved_in: 'Involved',
    },
    relShort: {
      created: 'created', commissioned: 'commissioned', relocated: 'moved', located_in: 'located in',
      born_in: 'born', died_in: 'died', buried_in: 'buried', depicts: 'depicts',
      patron_of: 'patron', rival_of: 'rival', relative_of: 'family', influenced: 'influenced',
      part_of: 'part of', restored: 'restored', stolen_from: 'stolen from', involved_in: 'involved',
    },
  },
};

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
export function roman(n) {
  let out = '';
  for (const [v, s] of ROMAN) while (n >= v) { out += s; n -= v; }
  return out;
}

/** Century of a year: 1598 -> 16, -37 -> -1 (BCE). */
export function century(y) {
  return y > 0 ? Math.floor((y - 1) / 100) + 1 : -(Math.floor((-y - 1) / 100) + 1);
}

export function centuryLabel(c, lang) {
  if (c > 0) return roman(c);
  return lang === 'uk' ? `${roman(-c)} до н. е.` : `${roman(-c)} BCE`;
}

export function yearLabel(y, lang) {
  if (y >= 0) return String(y);
  return lang === 'uk' ? `${-y} до н. е.` : `${-y} BCE`;
}

/** {start, end, approx} -> "c. 1420–1432" */
export function yearsLabel(years, lang) {
  if (!years) return '';
  const c = years.approx ? (lang === 'uk' ? 'бл. ' : 'c. ') : '';
  const a = yearLabel(years.start, lang);
  return years.end !== undefined ? `${c}${a}–${yearLabel(years.end, lang)}` : `${c}${a}`;
}

const regionNames = {};
export function countryName(code, lang) {
  if (!code) return '';
  try {
    regionNames[lang] ||= new Intl.DisplayNames([lang], { type: 'region' });
    return regionNames[lang].of(code) || code;
  } catch { return code; }
}

const dateFmt = {};
export function dateLabel(iso, lang) {
  dateFmt[lang] ||= new Intl.DateTimeFormat(lang === 'uk' ? 'uk' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return dateFmt[lang].format(new Date(iso + 'T00:00:00Z'));
}

export const label = (n, lang) => (lang === 'en' && n.label_en) ? n.label_en : n.label_uk;
export const title = (a, lang) => (lang === 'en' && a.title_en) ? a.title_en : a.title_uk;

/** Lowercase, strip diacritics and apostrophes, for search matching. */
export function fold(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’ʼ`]/g, '');
}
