// =====================================================================
//  ÜNİ PORTAL — ORTAK ÇEKİRDEK MODÜL (portal-core.js)
//  Tüm sayfalar tarafından paylaşılan, KOTA DOSTU yardımcılar:
//   - Rütbe / seviye sistemi ve isim efektleri
//   - Markdown (zengin metin) motoru + araç çubuğu
//   - Yazar önbelleği (authorUid -> güncel isim/rütbe/künye/kozmetik)
//   - Üniversite listesi (24 saat localStorage önbellek)
//   - Mağaza kataloğu (settings/store tek doküman, önbellekli)
//   - Kozmetikler (profil çerçeveleri & unvanlar)
//  Kullanım:  import { ... } from '/portal/portal-core.js';
//  NOT: Firestore SDK aynı CDN URL'sinden yüklendiği için sayfanın
//  kendi `db` örneği bu modüldeki fonksiyonlara parametre olarak verilir.
// =====================================================================
import {
    doc, getDoc, getDocs, collection, query, where, documentId, updateDoc, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ---------------------------------------------------------------------
// 0) Genel yardımcılar
// ---------------------------------------------------------------------
export function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function formatRelativeTime(date) {
    if (!date) return "Bilinmiyor";
    const d = date instanceof Date ? date : (typeof date.toDate === 'function' ? date.toDate() : new Date(date));
    if (isNaN(d.getTime())) return "Bilinmiyor";
    const diffSec = Math.floor((new Date() - d) / 1000);
    if (diffSec < 60) return "Az önce";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} dk önce`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} sa önce`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} gün önce`;
    return d.toLocaleDateString('tr-TR');
}

function lsGet(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* kota dolu olabilir */ }
}

// ---------------------------------------------------------------------
// 1) Rütbe / Seviye sistemi (forum.html ile birebir aynı eşikler)
// ---------------------------------------------------------------------
export const LEVELS = [
    { name: "Yeni Üye", minXP: 0, maxXP: 49, icon: "fa-seedling",
      color: "text-emerald-300", bg: "bg-emerald-500/15", border: "border-emerald-500/30",
      barFrom: "from-emerald-500", barTo: "to-emerald-400", fx: "uname-l1" },
    { name: "Aktif Üye", minXP: 50, maxXP: 149, icon: "fa-leaf",
      color: "text-lime-300", bg: "bg-lime-500/15", border: "border-lime-500/30",
      barFrom: "from-lime-500", barTo: "to-lime-400", fx: "uname-l2" },
    { name: "Deneyimli Üye", minXP: 150, maxXP: 349, icon: "fa-tree",
      color: "text-teal-300", bg: "bg-teal-500/15", border: "border-teal-500/30",
      barFrom: "from-teal-500", barTo: "to-teal-400", fx: "uname-l3" },
    { name: "Uzman Üye", minXP: 350, maxXP: 699, icon: "fa-star",
      color: "text-yellow-300", bg: "bg-yellow-500/15", border: "border-yellow-500/30",
      barFrom: "from-yellow-500", barTo: "to-yellow-400", fx: "uname-l4" },
    { name: "Emektar Üye", minXP: 700, maxXP: 1499, icon: "fa-gem",
      color: "text-cyan-300", bg: "bg-cyan-500/15", border: "border-cyan-500/30",
      barFrom: "from-cyan-500", barTo: "to-cyan-400", fx: "uname-l5" },
    { name: "Efsane Üye", minXP: 1500, maxXP: Infinity, icon: "fa-crown",
      color: "text-amber-300", bg: "bg-amber-500/15", border: "border-amber-500/30",
      barFrom: "from-amber-500", barTo: "to-yellow-300", fx: "uname-l6" }
];

export function getLevelInfo(xp) {
    const xpVal = xp || 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xpVal >= LEVELS[i].minXP) return { ...LEVELS[i], level: i + 1, xp: xpVal };
    }
    return { ...LEVELS[0], level: 1, xp: xpVal };
}

/** Kullanıcı adına uygulanacak rütbe efekt sınıfı (renk + ışıltı). */
export function getNameEffectClass(role, xp) {
    if (role === 'admin') return 'uname uname-admin';
    if (role === 'moderator') return 'uname uname-mod';
    return 'uname ' + getLevelInfo(xp).fx;
}

/** Avatar etrafına uygulanacak rütbe halkası (kozmetik çerçeve yoksa). */
export function getAvatarRingClass(role, xp) {
    if (role === 'admin') return 'avatar-ring ring-admin';
    if (role === 'moderator') return 'avatar-ring ring-mod';
    const lvl = getLevelInfo(xp).level;
    if (lvl >= 5) return 'avatar-ring ring-elite';
    if (lvl >= 3) return 'avatar-ring ring-exp';
    return 'avatar-ring';
}

/** Rütbe rozeti (forum.html'deki getRoleBadge ile aynı görünüm + parıltı). */
export function getRankBadge(role, xp) {
    if (role === 'admin') return `<span class="rank-badge rank-admin text-[9px] bg-red-500/25 text-red-300 px-1.5 py-0.5 rounded font-bold border border-red-500/40 inline-flex items-center"><i class="fa-solid fa-shield-halved mr-1"></i>ADMİN</span>`;
    if (role === 'moderator') return `<span class="rank-badge rank-mod text-[9px] bg-orange-500/25 text-orange-300 px-1.5 py-0.5 rounded font-bold border border-orange-500/40 inline-flex items-center"><i class="fa-solid fa-user-shield mr-1"></i>MOD</span>`;
    const lvl = getLevelInfo(xp);
    return `<span class="rank-badge text-[9px] ${lvl.bg} ${lvl.color} px-1.5 py-0.5 rounded font-bold border ${lvl.border} inline-flex items-center"><i class="fa-solid ${lvl.icon} mr-1"></i>${lvl.name}</span>`;
}

// ---------------------------------------------------------------------
// 2) Öğrenci künyesi (Üniversite - Bölüm (Sınıf)) & Topluluk Eşleme Haritası
// ---------------------------------------------------------------------
export const COMMUNITY_NAME_MAP = {
    yazilim: "Yazılım ve Teknoloji Topluluğu",
    girisimcilik: "Girişimcilik ve İnovasyon Kulübü",
    muzik: "Müzik ve Sahne Sanatları Kulübü",
    tiyatro: "Tiyatro Topluluğu",
    ieee: "IEEE Öğrenci Kolu",
    yapayzeka: "Yapay Zeka ve Veri Bilimi Kulübü",
    spor: "Spor ve Doğa Sporları Topluluğu",
    fotografcilik: "Fotoğrafçılık ve Sinema Kulübü",
    edebiyat: "Edebiyat ve Kitap Kulübü",
    sosyalsorumluluk: "Sosyal Sorumluluk ve Gönüllülük Kulübü",
    robotik: "Robotik ve Otomasyon Topluluğu",
    kariyer: "Kariyer ve Gelişim Kulübü",
    espor: "E-Spor ve Oyun Topluluğu",
    dans: "Dans Topluluğu",
    astronomi: "Astronomi ve Uzay Bilimleri Kulübü"
};

export function resolveCommunityName(commIdOrObj) {
    if (!commIdOrObj) return '';
    if (typeof commIdOrObj === 'object') {
        return commIdOrObj.name || COMMUNITY_NAME_MAP[commIdOrObj.id] || commIdOrObj.id || '';
    }
    const idStr = String(commIdOrObj).trim();
    if (!idStr) return '';
    if (COMMUNITY_NAME_MAP[idStr]) return COMMUNITY_NAME_MAP[idStr];
    const lower = idStr.toLocaleLowerCase('tr-TR');
    if (COMMUNITY_NAME_MAP[lower]) return COMMUNITY_NAME_MAP[lower];
    // Yerel önbellekteki (up_communities_v1 veya up_showcase_v1) topluluklardan dinamik isim çözümü (0 ekstra okuma)
    try {
        const c1 = lsGet('up_communities_v1');
        if (c1) {
            const arr = Array.isArray(c1) ? c1 : (Array.isArray(c1.communities) ? c1.communities : []);
            const found = arr.find(c => c && c.id === idStr);
            if (found && found.name) return found.name;
        }
        const c2 = lsGet('up_showcase_v1');
        if (c2 && Array.isArray(c2.communities)) {
            const found = c2.communities.find(c => c && c.id === idStr);
            if (found && found.name) return found.name;
        }
    } catch (e) {}
    return idStr;
}

export const GRADES = [
    { value: 'hazirlik', label: 'Hazırlık' },
    { value: '1', label: '1. Sınıf' },
    { value: '2', label: '2. Sınıf' },
    { value: '3', label: '3. Sınıf' },
    { value: '4', label: '4. Sınıf' },
    { value: 'yl', label: 'Yüksek Lisans' }
];

export function gradeLabel(value) {
    const g = GRADES.find(x => x.value === String(value || ''));
    return g ? g.label : '';
}

/** "Üniversite - Bölüm (Sınıf)" düz metin. Bilgi yoksa boş string. */
export function formatKunye(profile) {
    if (!profile) return '';
    const uni = (profile.university || '').trim();
    const dep = (profile.department || '').trim();
    const gr = gradeLabel(profile.grade);
    let s = [uni, dep].filter(Boolean).join(' - ');
    if (gr) s = s ? `${s} (${gr})` : gr;
    return s;
}

/** Künyeyi küçük, şık bir satır olarak HTML'e döker. */
export function renderKunyeLine(profile, extraClass = '') {
    const k = formatKunye(profile);
    if (!k) return '';
    return `<span class="kunye-line ${extraClass}" title="${escapeHtml(k)}"><i class="fa-solid fa-building-columns"></i>${escapeHtml(k)}</span>`;
}

/** Künyeyi etiket (chip) grubu olarak döker (profil / öğrenci kartları). */
export function renderKunyeChips(profile) {
    if (!profile) return '';
    const chips = [];
    if (profile.university) chips.push(`<span class="kunye-chip kunye-uni"><i class="fa-solid fa-building-columns"></i>${escapeHtml(profile.university)}</span>`);
    if (profile.department) chips.push(`<span class="kunye-chip kunye-dep"><i class="fa-solid fa-book-open"></i>${escapeHtml(profile.department)}</span>`);
    const gr = gradeLabel(profile.grade);
    if (gr) chips.push(`<span class="kunye-chip kunye-grade"><i class="fa-solid fa-user-graduate"></i>${escapeHtml(gr)}</span>`);
    return chips.join('');
}

// ---------------------------------------------------------------------
// 3) Üniversite listesi — settings/universities, 24 saat önbellek
//    Doküman şeması: { list: "Ad1, Ad2, ..." }  veya  { items: ["Ad1", ...] }
// ---------------------------------------------------------------------
export const DEFAULT_UNIVERSITIES = [
    "Ankara Üniversitesi", "Atatürk Üniversitesi", "Bahçeşehir Üniversitesi", "Başkent Üniversitesi",
    "Bilkent Üniversitesi", "Boğaziçi Üniversitesi", "Bursa Uludağ Üniversitesi", "Çukurova Üniversitesi",
    "Dokuz Eylül Üniversitesi", "Ege Üniversitesi", "Erciyes Üniversitesi", "Eskişehir Osmangazi Üniversitesi",
    "Galatasaray Üniversitesi", "Gazi Üniversitesi", "Hacettepe Üniversitesi", "İstanbul Bilgi Üniversitesi",
    "İstanbul Medipol Üniversitesi", "İstanbul Teknik Üniversitesi", "İstanbul Üniversitesi",
    "İstanbul Üniversitesi-Cerrahpaşa", "İzmir Yüksek Teknoloji Enstitüsü", "Karadeniz Teknik Üniversitesi",
    "Kadir Has Üniversitesi", "Koç Üniversitesi", "Kocaeli Üniversitesi", "Marmara Üniversitesi",
    "Mersin Üniversitesi", "Ondokuz Mayıs Üniversitesi", "Orta Doğu Teknik Üniversitesi", "Özyeğin Üniversitesi",
    "Pamukkale Üniversitesi", "Sabancı Üniversitesi", "Sakarya Üniversitesi", "Selçuk Üniversitesi",
    "TOBB Ekonomi ve Teknoloji Üniversitesi", "Yeditepe Üniversitesi", "Yıldız Teknik Üniversitesi",
    "Diğer"
];
const UNI_CACHE_KEY = 'up_universities_v1';
const UNI_CACHE_TTL = 24 * 60 * 60 * 1000;

export async function getUniversities(db) {
    const cached = lsGet(UNI_CACHE_KEY);
    if (cached && Array.isArray(cached.items) && (Date.now() - cached.t < UNI_CACHE_TTL)) return cached.items;
    let items = [];
    try {
        const snap = await getDoc(doc(db, "settings", "universities"));
        if (snap.exists()) {
            const d = snap.data();
            if (Array.isArray(d.items)) items = d.items;
            else if (typeof d.list === 'string') items = d.list.split(',').map(s => s.trim()).filter(Boolean);
        }
    } catch (e) { console.warn('Üniversite listesi okunamadı, varsayılan liste kullanılıyor', e); }
    if (items.length === 0) items = [...DEFAULT_UNIVERSITIES];
    if (!items.includes('Diğer')) items.push('Diğer');
    lsSet(UNI_CACHE_KEY, { t: Date.now(), items });
    return items;
}

// ---------------------------------------------------------------------
// 3.5) Merkezi Üniversite Doğrulama ve Formatlama Motoru
// ---------------------------------------------------------------------
export const BAD_WORDS = [
    "amk", "aq", "amq", "orospu", "oç", "piç", "sik", "siktir", "yarrak", "göt", "şerefsiz",
    "pezevenk", "gavat", "kahpe", "kaltak", "sürtük", "ibne", "puşt", "yavşak", "salak",
    "aptal", "gerizekalı", "beyinsiz", "ahmak", "fuck", "shit", "bitch", "asshole", "bastard",
    "nigga", "nigger", "bok", "sikik", "amcık", "yarak", "taşak", "taşşak", "meme", "porno",
    "sex", "seks", "escort", "eskort", "troll", "test", "deneme", "asdf", "qwerty", "sanane",
    "yok", "bilinmiyor", "none", "null", "undefined", "admin", "moderator"
];

const UPPERCASE_ABBREVIATIONS = new Set([
    "itü", "odtü", "ytü", "ktü", "deü", "dpü", "paü", "omü", "erü", "esogü", "iyte", "tobb",
    "etü", "mef", "ted", "msü", "gsü", "agü", "baün", "cbü", "çomü", "akü", "sdü", "kto",
    "kmü", "mkü", "neü", "nny", "okü", "rteü", "subü", "stü", "tau", "thk", "tü"
]);

const LOWERCASE_CONJUNCTIONS = new Set(["ve", "ile", "de", "da"]);

function getActiveBadWordsList() {
    const merged = new Set(BAD_WORDS.map(w => w.toLocaleLowerCase('tr-TR')));
    try {
        const c2 = lsGet('lianchez_badwords_v2');
        if (c2 && Array.isArray(c2.words)) {
            c2.words.forEach(w => { if (w) merged.add(String(w).trim().toLocaleLowerCase('tr-TR')); });
        }
        const c1 = lsGet('lianchez_badwords_v1');
        if (c1 && Array.isArray(c1.words)) {
            c1.words.forEach(w => { if (w) merged.add(String(w).trim().toLocaleLowerCase('tr-TR')); });
        }
    } catch (e) {}
    return [...merged].filter(Boolean);
}

export function validateAndFormatUniversity(rawInput) {
    if (rawInput === null || rawInput === undefined || typeof rawInput !== 'string') {
        return { isValid: false, formatted: '', message: 'Lütfen geçerli bir üniversite veya okul adı giriniz.' };
    }

    // 1. Boşluk Temizliği ve Normalizasyon
    const cleaned = rawInput.trim().replace(/\s+/g, ' ');

    // 2. Karakter Uzunluğu Sınırı (3 - 65)
    if (cleaned.length < 3) {
        return { isValid: false, formatted: '', message: 'Üniversite adı en az 3 karakter olmalıdır.' };
    }
    if (cleaned.length > 65) {
        return { isValid: false, formatted: '', message: 'Üniversite adı en fazla 65 karakter olabilir.' };
    }

    // URL / Link / HTML Etiketi ön kontrolü (açıklayıcı mesaj için)
    const lowerCheck = cleaned.toLocaleLowerCase('tr-TR');
    if (/(https?:\/\/|www\.|\.com|\.net|\.org|\.edu|<script|<\/?[a-z])/i.test(lowerCheck)) {
        return { isValid: false, formatted: '', message: 'Üniversite alanında link, web adresi veya HTML etiketi kullanılamaz.' };
    }

    // 3. Güvenli Karakter Seti (Regex): Yalnızca Türkçe/İngilizce harfler, boşluk, nokta ve tire
    const safeRegex = /^[a-zA-ZçÇğĞıİöÖşŞüÜ\s.\-]+$/;
    if (!safeRegex.test(cleaned)) {
        return { isValid: false, formatted: '', message: 'Üniversite adı yalnızca harf, boşluk, nokta ve tire içerebilir (rakam, emoji veya özel sembol kullanılamaz).' };
    }

    // Sadece nokta ve tireden oluşan girişleri engelle
    const onlyLetters = cleaned.replace(/[\s.\-]/g, '');
    if (onlyLetters.length < 2) {
        return { isValid: false, formatted: '', message: 'Lütfen geçerli bir üniversite adı giriniz.' };
    }

    // 4. Anlamsız Karakter Tekrarı Denetimi (Aynı harfin arka arkaya 4 kereden fazla tekrarlanması, örn: "aaaaa", "asdddd" vb. 4+ ardışık tekrarları engeller)
    const lowerForRepeat = cleaned.toLocaleLowerCase('tr-TR');
    if (/([a-zçğıöşü.\-])\1{3,}/u.test(lowerForRepeat)) {
        return { isValid: false, formatted: '', message: 'Anlamsız karakter tekrarı tespit edildi. Lütfen gerçek okul adınızı giriniz.' };
    }

    // 5. Yasaklı Kelime ve Küfür/Troll Filtresi
    const badWords = getActiveBadWordsList();
    const tokens = lowerCheck.split(/[\s.\-]+/).filter(Boolean);
    for (const bw of badWords) {
        if (!bw) continue;
        // Tam kelime eşleşmesi veya 4+ harfli yasaklı kelimenin kelime başında/içinde geçmesi
        if (tokens.includes(bw) || (bw.length >= 4 && tokens.some(t => t.startsWith(bw) || t.endsWith(bw)))) {
            return { isValid: false, formatted: '', message: 'Girdiğiniz metin uygunsuz veya geçersiz ifadeler içeriyor. Lütfen gerçek üniversite adınızı yazınız.' };
        }
    }

    // 6. Akıllı Baş Harf Düzeltmesi (Title Case)
    const words = cleaned.split(' ');
    const formattedWords = words.map((word, idx) => {
        // Tireli kelimeleri de kendi içinde parçala (örn: "İstanbul Üniversitesi-Cerrahpaşa")
        return word.split('-').map((part, partIdx) => {
            if (!part) return '';
            const lowerPart = part.toLocaleLowerCase('tr-TR');
            const cleanAbbr = lowerPart.replace(/\./g, '');
            if (UPPERCASE_ABBREVIATIONS.has(cleanAbbr)) {
                return part.toLocaleUpperCase('tr-TR');
            }
            if (idx > 0 && partIdx === 0 && LOWERCASE_CONJUNCTIONS.has(lowerPart)) {
                return lowerPart;
            }
            const firstChar = lowerPart.charAt(0).toLocaleUpperCase('tr-TR');
            const rest = lowerPart.slice(1);
            return firstChar + rest;
        }).join('-');
    });

    const formatted = formattedWords.join(' ');
    return { isValid: true, formatted, message: 'Geçerli üniversite adı.' };
}

if (typeof window !== 'undefined') {
    window.validateAndFormatUniversity = validateAndFormatUniversity;
}

// ---------------------------------------------------------------------
// 4) Kozmetikler — profil çerçeveleri & unvan stilleri
//    Kullanıcı dokümanında DENORMALİZE tutulur (ekstra okuma yok):
//      equippedFrame: { id, style } | null
//      equippedTitle: { id, name, style } | null
//      inventory: [itemId, ...]
// ---------------------------------------------------------------------
export const FRAME_STYLES = {
    'frame-neon':      'Neon Mavi',
    'frame-gold':      'Altın Parıltı',
    'frame-rainbow':   'Gökkuşağı',
    'frame-fire':      'Ateş',
    'frame-galaxy':    'Galaksi',
    'frame-emerald':   'Zümrüt',
    'frame-cyberpunk': 'Siberpunk Neon',
    'frame-amethyst':  'Ametist Kristali',
    'frame-solar':     'Güneş Patlaması',
    'frame-ice':       'Kutup Buzulu'
};
export const TITLE_STYLES = {
    'title-violet':   'Mor Işıltı',
    'title-gold':     'Altın',
    'title-rainbow':  'Gökkuşağı',
    'title-emerald':  'Zümrüt',
    'title-crimson':  'Kızıl',
    'title-ice':      'Buz',
    'title-neonblue': 'Neon Mavi',
    'title-night':    'Gece Karanlığı',
    'title-pink':     'Pembe Eflatun'
};

/** Avatar <img> için çerçeve sınıfı. Kozmetik çerçeve rütbe halkasını ezer. */
export function getAvatarFrameClass(profile) {
    if (!profile) return 'avatar-ring';
    const st = profile.equippedFrame && profile.equippedFrame.style;
    if (st && FRAME_STYLES[st]) return `avatar-ring ${st}`;
    return getAvatarRingClass(profile.role, profile.xp);
}

/** Kuşanılmış unvan rozetini döker (yoksa boş). */
export function renderTitleBadge(profileOrTitle) {
    const t = profileOrTitle && (profileOrTitle.equippedTitle !== undefined ? profileOrTitle.equippedTitle : profileOrTitle);
    if (!t || !t.name) return '';
    const st = TITLE_STYLES[t.style] ? t.style : 'title-violet';
    return `<span class="user-title ${st}"><i class="fa-solid fa-award"></i>${escapeHtml(t.name)}</span>`;
}

// ---------------------------------------------------------------------
// 5) Mağaza kataloğu — settings/store tek doküman (1 okuma), 1 saat önbellek
//    Şema: { items: [ {
//        id, type: 'frame'|'title'|'coupon', name, description, price,
//        style (frame/title için FRAME_STYLES/TITLE_STYLES anahtarı),
//        sponsor, couponCode (coupon için), icon, active: bool
//    } ], updatedAt }
// ---------------------------------------------------------------------
export const DEFAULT_STORE_ITEMS = [
    // Çerçeveler
    { id: 'frm_neon', type: 'frame', name: 'Neon Mavi Çerçeve', description: 'Avatarının etrafında nabız gibi atan neon ışık.', price: 50, style: 'frame-neon', icon: 'fa-circle-notch', active: true },
    { id: 'frm_cyberpunk', type: 'frame', name: 'Siberpunk Neon', description: 'Eflatun ve sarı neon geçişleriyle fütüristik bir enerji yay.', price: 80, style: 'frame-cyberpunk', icon: 'fa-bolt', active: true },
    { id: 'frm_ice', type: 'frame', name: 'Kutup Buzulu', description: 'Buz mavisi dondurucu parıltıyla soğukkanlı tarzını yansıt.', price: 85, style: 'frame-ice', icon: 'fa-snowflake', active: true },
    { id: 'frm_amethyst', type: 'frame', name: 'Ametist Kristali', description: 'Derin mor kristal ışıltısıyla profiline mistik bir hava kat.', price: 90, style: 'frame-amethyst', icon: 'fa-gem', active: true },
    { id: 'frm_solar', type: 'frame', name: 'Güneş Patlaması', description: 'Turuncu-altın alev dalgasıyla tüm bakışları üzerine topla.', price: 110, style: 'frame-solar', icon: 'fa-sun', active: true },
    { id: 'frm_gold', type: 'frame', name: 'Altın Parıltı Çerçeve', description: 'Seçkinler için ışıldayan altın halka.', price: 120, style: 'frame-gold', icon: 'fa-ring', active: true },
    { id: 'frm_rainbow', type: 'frame', name: 'Gökkuşağı Çerçeve', description: 'Dönen renk çemberiyle herkesin dikkatini çek.', price: 200, style: 'frame-rainbow', icon: 'fa-rainbow', active: true },
    // Unvanlar
    { id: 'ttl_kod', type: 'title', name: 'Kod Ustası', description: 'İsminin yanında mor ışıltılı unvan.', price: 40, style: 'title-violet', icon: 'fa-code', active: true },
    { id: 'ttl_kutup', type: 'title', name: 'Kütüphane Kurdu', description: 'Zümrüt yeşili, çalışkanlara özel unvan.', price: 40, style: 'title-emerald', icon: 'fa-book', active: true },
    { id: 'ttl_gece', type: 'title', name: 'Gece Nöbetçisi', description: 'Sabaha kadar ders çalışan ve kod yazanlara özel karanlık mod baykuş rozeti.', price: 45, style: 'title-night', icon: 'fa-moon', active: true },
    { id: 'ttl_social', type: 'title', name: 'Sosyal Kelebek', description: 'Kampüsün her etkinliğinde boy gösterenlere pembe-eflatun ışık.', price: 50, style: 'title-pink', icon: 'fa-heart', active: true },
    { id: 'ttl_vizyoner', type: 'title', name: 'Vizyoner Mühendis', description: 'Geleceği inşa edenler için parlayan neon mavi rozet.', price: 60, style: 'title-neonblue', icon: 'fa-microchip', active: true },
    { id: 'ttl_guru', type: 'title', name: 'Final Fatihi', description: 'Vize ve finallerden korkmayanlara zümrüt yeşili rozet.', price: 65, style: 'title-emerald', icon: 'fa-graduation-cap', active: true },
    { id: 'ttl_lider', type: 'title', name: 'Kampüs Lideri', description: 'Topluluklara yön verenler için altın taç ışıltısı.', price: 75, style: 'title-gold', icon: 'fa-crown', active: true },
    { id: 'ttl_efsane', type: 'title', name: 'Kampüs Efsanesi', description: 'Gökkuşağı akışlı nadir unvan.', price: 150, style: 'title-rainbow', icon: 'fa-crown', active: true },
    // Sponsor Kuponları
    { id: 'cpn_fotokopi', type: 'coupon', name: '100 Sayfa Ücretsiz Fotokopi', description: 'Ders notları ve çıkmış sorular için 100 sayfa ücretsiz siyah-beyaz çıktı kuponu.', price: 25, sponsor: 'Merkez Kırtasiye', couponCode: 'FOTO100', icon: 'fa-print', active: true },
    { id: 'cpn_kahve', type: 'coupon', name: 'Kampüs Kafe %20 İndirim', description: 'Tüm sıcak ve soğuk kahvelerde geçerli anında %20 öğrenci indirimi.', price: 30, sponsor: 'Kampüs Kafe', couponCode: 'KAMPUS20', icon: 'fa-mug-hot', active: true },
    { id: 'cpn_kitap', type: 'coupon', name: 'Akademik Kitap Evi 50₺ İndirim', description: 'Seçili akademik ve kültür kitaplarında 200₺ ve üzeri alışverişte 50₺ indirim.', price: 40, sponsor: 'Kitap Kurdu', couponCode: 'KİTAP50', icon: 'fa-book-open', active: true }
];
const STORE_CACHE_KEY = 'up_store_v2';
const STORE_CACHE_TTL = 60 * 60 * 1000;

export async function getStoreItems(db, { force = false } = {}) {
    if (!force) {
        const cached = lsGet(STORE_CACHE_KEY);
        if (cached && Array.isArray(cached.items) && (Date.now() - cached.t < STORE_CACHE_TTL)) return cached.items;
    }
    let items = null;
    try {
        const snap = await getDoc(doc(db, "settings", "store"));
        if (snap.exists() && Array.isArray(snap.data().items)) items = snap.data().items;
    } catch (e) { console.warn('Mağaza kataloğu okunamadı', e); }
    if (!items) items = [...DEFAULT_STORE_ITEMS];
    lsSet(STORE_CACHE_KEY, { t: Date.now(), items });
    return items;
}
export function setStoreCache(items) { lsSet(STORE_CACHE_KEY, { t: Date.now(), items }); }
export function invalidateStoreCache() { try { localStorage.removeItem(STORE_CACHE_KEY); } catch (e) {} }

// ---------------------------------------------------------------------
// 6) YAZAR ÖNBELLEĞİ — Dinamik isim & rütbe senkronizasyonu
//    Eski konu/yanıtları DB'de topluca güncellemek yerine, istemci
//    authorUid ile güncel profili hafızadan / localStorage'dan çözer.
//    Eksik yazarlar 30'luk 'in' sorgularıyla toplu çekilir.
// ---------------------------------------------------------------------
const AUTHOR_CACHE_KEY = 'up_authors_v1';
const AUTHOR_CACHE_TTL = 20 * 60 * 1000; // 20 dk
const AUTHOR_CACHE_MAX = 300;
const authorMem = new Map();
const inflight = new Map();

(function hydrateAuthorCache() {
    const stored = lsGet(AUTHOR_CACHE_KEY) || {};
    const now = Date.now();
    Object.keys(stored).forEach(uid => {
        const e = stored[uid];
        if (e && e.t && now - e.t < AUTHOR_CACHE_TTL) authorMem.set(uid, e);
    });
})();

function persistAuthorCache() {
    const entries = [...authorMem.entries()].sort((a, b) => b[1].t - a[1].t).slice(0, AUTHOR_CACHE_MAX);
    const obj = {};
    entries.forEach(([uid, e]) => { obj[uid] = e; });
    lsSet(AUTHOR_CACHE_KEY, obj);
}

/** Kullanıcı dokümanından yalnızca görüntüleme için gereken alanları seçer. */
export function pickAuthorFields(data) {
    if (!data) return null;
    return {
        displayName: data.displayName || data.name || 'Öğrenci',
        photoURL: data.photoURL || '',
        role: data.role || 'user',
        xp: data.xp || 0,
        university: data.university || '',
        department: data.department || '',
        grade: data.grade || '',
        equippedFrame: data.equippedFrame || null,
        equippedTitle: data.equippedTitle || null
    };
}

/** Elde zaten olan taze bir kullanıcı dokümanını (örn. giriş yapan kullanıcı) önbelleğe yazar — 0 okuma. */
export function primeAuthor(uid, userData) {
    if (!uid || !userData) return;
    const prev = getCachedAuthor(uid) || {};
    authorMem.set(uid, { t: Date.now(), d: pickAuthorFields({ ...prev, ...userData }) });
    persistAuthorCache();
}

/** Belirli bir yazarın veya tüm yazarların önbelleğini temizler. */
export function invalidateAuthorCache(uid) {
    if (uid) {
        authorMem.delete(uid);
        persistAuthorCache();
    } else {
        authorMem.clear();
        try { localStorage.removeItem(AUTHOR_CACHE_KEY); } catch (e) {}
    }
}

/** Önbellekte varsa senkron döner, yoksa null. */
export function getCachedAuthor(uid) {
    const e = authorMem.get(uid);
    return e ? e.d : null;
}

/**
 * Verilen uid listesini çözer. Önbellekte taze olanlar için 0 okuma;
 * eksikler 30'luk parçalarla toplu çekilir. Dönen: Map(uid -> profil)
 */
export async function resolveAuthors(db, uids) {
    const unique = [...new Set((uids || []).filter(Boolean))];
    const now = Date.now();
    const missing = unique.filter(uid => {
        const e = authorMem.get(uid);
        return !(e && now - e.t < AUTHOR_CACHE_TTL) && !inflight.has(uid);
    });
    if (missing.length > 0) {
        const job = (async () => {
            for (let i = 0; i < missing.length; i += 30) {
                const chunk = missing.slice(i, i + 30);
                try {
                    const snap = await getDocs(query(collection(db, "users"), where(documentId(), "in", chunk)));
                    const found = new Set();
                    snap.forEach(d => { found.add(d.id); authorMem.set(d.id, { t: Date.now(), d: pickAuthorFields(d.data()) }); });
                    // Silinmiş kullanıcılar için tekrar tekrar sorgu atılmasın
                    chunk.forEach(uid => { if (!found.has(uid)) authorMem.set(uid, { t: Date.now(), d: null }); });
                } catch (e) { console.warn('Yazar profilleri çözülemedi', e); }
            }
            persistAuthorCache();
        })();
        missing.forEach(uid => inflight.set(uid, job));
        try { await job; } finally { missing.forEach(uid => inflight.delete(uid)); }
    }
    // Başka bir çağrının devam eden işini bekle
    const waits = unique.map(uid => inflight.get(uid)).filter(Boolean);
    if (waits.length) await Promise.all(waits);
    const out = new Map();
    unique.forEach(uid => { const e = authorMem.get(uid); if (e && e.d) out.set(uid, e.d); });
    return out;
}

/**
 * İçerik dokümanındaki (topic/reply/chat) donmuş author* alanlarını
 * güncel profil ile birleştirir. Profil yoksa eski alanlara düşer.
 */
export function mergeAuthor(item, profile) {
    const p = profile || getCachedAuthor(item && item.authorUid);
    return {
        displayName: (p && p.displayName) || item.authorName || 'Öğrenci',
        photoURL: (p && p.photoURL) || item.authorPhoto || '',
        role: (p && p.role) || item.authorRole || 'user',
        xp: p ? p.xp : (item.authorXP || 0),
        university: (p && p.university) || '',
        department: (p && p.department) || '',
        grade: (p && p.grade) || '',
        equippedFrame: (p && p.equippedFrame) || null,
        equippedTitle: (p && p.equippedTitle) || null
    };
}

/**
 * DOM'da data-author-uid ve data-quoted-uid taşıyan öğeleri güncel profil ile yerinde günceller.
 * Hedefler (isteğe bağlı alt öğeler):
 *   [data-author-name], [data-author-badge], [data-author-kunye],
 *   [data-author-title], img[data-author-avatar], [data-quoted-uid]
 */
export function hydrateAuthorElements(root = document) {
    root.querySelectorAll('[data-author-uid]').forEach(el => {
        const uid = el.getAttribute('data-author-uid');
        const p = getCachedAuthor(uid);
        if (!p) return;
        el.querySelectorAll('[data-author-name]').forEach(n => {
            n.textContent = p.displayName;
            n.className = n.className.replace(/\buname(-[\w]+)?\b/g, '').trim() + ' ' + getNameEffectClass(p.role, p.xp);
        });
        el.querySelectorAll('[data-author-badge]').forEach(b => { b.innerHTML = getRankBadge(p.role, p.xp); });
        el.querySelectorAll('[data-author-kunye]').forEach(k => { k.innerHTML = renderKunyeLine(p); });
        el.querySelectorAll('[data-author-title]').forEach(t => { t.innerHTML = renderTitleBadge(p); });
        el.querySelectorAll('img[data-author-avatar]').forEach(img => {
            if (p.photoURL) img.src = p.photoURL;
            img.className = img.className.replace(/\bavatar-ring\b|\bring-[\w]+\b|\bframe-[\w]+\b/g, '').trim() + ' ' + getAvatarFrameClass(p);
        });
        el.querySelectorAll('[data-quote-btn]').forEach(btn => {
            btn.setAttribute('data-quote-author', p.displayName);
        });
    });
    root.querySelectorAll('[data-quoted-uid]').forEach(qEl => {
        const qUid = qEl.getAttribute('data-quoted-uid');
        const qp = getCachedAuthor(qUid);
        if (!qp || !qp.displayName) return;
        const nameEl = qEl.querySelector('[data-quoted-author-name]');
        if (nameEl) nameEl.textContent = `${qp.displayName} şunları yazdı:`;
    });
}

// ---------------------------------------------------------------------
// 7) Markdown motoru (güvenli: önce escape, sonra biçim)
//    Desteklenen: **kalın**, *italik*, ### başlık, ```kod```, `satır içi`,
//                 > alıntı, - liste
// ---------------------------------------------------------------------
/**
 * Zaten HTML-escape edilmiş metni Markdown'dan HTML'e çevirir.
 * @param {string} escaped  escapeHtml() uygulanmış metin
 * @param {(s:string)=>string} [inlineTransform]  Kod blokları DIŞINDAKİ
 *        metne uygulanacak ek dönüşüm (örn. forumdaki resim/link/mention).
 */
export function markdownToHtml(escaped, inlineTransform) {
    if (!escaped) return '';
    const codeBlocks = [];
    let src = String(escaped).replace(/\r\n/g, '\n');
    // ```kod blokları``` -> yer tutucu
    src = src.replace(/```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g, (m, lang, code) => {
        codeBlocks.push(`<pre class="md-pre"><code>${code.replace(/\n$/, '')}</code></pre>`);
        return `\u0000CB${codeBlocks.length - 1}\u0000`;
    });
    // `satır içi kod` -> yer tutucu
    const inlineCodes = [];
    src = src.replace(/`([^`\n]+)`/g, (m, code) => {
        inlineCodes.push(`<code class="md-code">${code}</code>`);
        return `\u0000IC${inlineCodes.length - 1}\u0000`;
    });
    if (typeof inlineTransform === 'function') src = inlineTransform(src);

    const inline = (s) => s
        .replace(/\*\*([^*\n]+?)\*\*/g, '<strong class="md-strong">$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em class="md-em">$2</em>');

    const lines = src.split('\n');
    const out = [];
    let listOpen = false, quoteBuf = [];
    const flushQuote = () => { if (quoteBuf.length) { out.push(`<blockquote class="md-quote">${quoteBuf.map(inline).join('<br>')}</blockquote>`); quoteBuf = []; } };
    const closeList = () => { if (listOpen) { out.push('</ul>'); listOpen = false; } };

    for (const raw of lines) {
        const line = raw;
        let m;
        if ((m = line.match(/^\s*&gt;\s?(.*)$/))) { closeList(); quoteBuf.push(m[1]); continue; }
        flushQuote();
        if ((m = line.match(/^\s*[-•]\s+(.*)$/))) {
            if (!listOpen) { out.push('<ul class="md-list">'); listOpen = true; }
            out.push(`<li>${inline(m[1])}</li>`); continue;
        }
        closeList();
        if ((m = line.match(/^\s*#{1,3}\s+(.*)$/))) { out.push(`<h3 class="md-h3">${inline(m[1])}</h3>`); continue; }
        if (/^\s*\u0000CB\d+\u0000\s*$/.test(line)) { out.push(line.trim()); continue; }
        out.push(inline(line) + '<br>');
    }
    flushQuote(); closeList();
    let html = out.join('').replace(/(<br>)+$/, '');
    html = html.replace(/\u0000IC(\d+)\u0000/g, (m, i) => inlineCodes[+i]);
    html = html.replace(/\u0000CB(\d+)\u0000/g, (m, i) => codeBlocks[+i]);
    return `<div class="md-body">${html}</div>`;
}

/** Ham (escape edilmemiş) metni güvenli şekilde render eder. */
export function renderMarkdown(rawText, inlineTransform) {
    return markdownToHtml(escapeHtml(rawText || ''), inlineTransform);
}

/** Markdown işaretlerini temizleyip düz önizleme metni döner (kart özetleri için). */
export function stripMarkdown(text) {
    if (!text) return '';
    return String(text)
        .replace(/```[\s\S]*?```/g, ' [kod] ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^\s*#{1,3}\s+/gm, '')
        .replace(/^\s*>\s?/gm, '')
        .replace(/^\s*-\s+/gm, '• ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Tahmini okuma süresi (dk). Türkçe için ~200 kelime/dk. */
export function readingMinutes(text) {
    const words = stripMarkdown(text).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
}

/**
 * İçerik derinliği rozeti + ödül bonusu (0 okuma, tamamen istemci tarafı).
 * 0-24 kelime: Öz Görüş | 25-79: Detaylı Yorum | 80+: Usta Analiz
 */
export function getContentDepthInfo(text) {
    const words = stripMarkdown(text || '').split(/\s+/).filter(Boolean).length;
    if (words >= 80) {
        return {
            tier: 'deep',
            words,
            badgeHtml: `<span class="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 border border-amber-400/50 font-bold shadow-md shadow-amber-500/10" title="${words} kelimelik kapsamlı içerik"><i class="fa-solid fa-star text-[8px] text-amber-400"></i>Usta Analiz</span>`,
            bonusCoin: 3,
            bonusXp: 7
        };
    }
    if (words >= 25) {
        return {
            tier: 'medium',
            words,
            badgeHtml: `<span class="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold shadow-sm" title="${words} kelimelik detaylı içerik"><i class="fa-solid fa-feather-pointed text-[8px] text-blue-400"></i>Detaylı Yorum</span>`,
            bonusCoin: 1,
            bonusXp: 3
        };
    }
    return {
        tier: 'short',
        words,
        badgeHtml: `<span class="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600/70" title="${words} kelime"><i class="fa-solid fa-comment-dots text-[8px] text-slate-400"></i>Öz Görüş</span>`,
        bonusCoin: 0,
        bonusXp: 0
    };
}

/** Görüntülenme sayısını kısaltır: 1250 -> 1,2B */
export function formatCount(n) {
    const v = Number(n) || 0;
    if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.', ',').replace(',0', '') + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1).replace('.', ',').replace(',0', '') + 'B';
    return String(v);
}

// ---------------------------------------------------------------------
// 8) Markdown araç çubuğu
// ---------------------------------------------------------------------
const MD_TOOLS = [
    { key: 'bold',   icon: 'fa-bold',          title: 'Kalın (Ctrl+B)',  wrap: ['**', '**'], ph: 'kalın metin' },
    { key: 'italic', icon: 'fa-italic',        title: 'İtalik (Ctrl+I)', wrap: ['*', '*'],   ph: 'italik metin' },
    { key: 'h3',     icon: 'fa-heading',       title: 'Başlık',          line: '### ',       ph: 'Başlık' },
    { key: 'code',   icon: 'fa-code',          title: 'Kod bloğu',       block: true,        ph: 'kod buraya' },
    { key: 'quote',  icon: 'fa-quote-left',    title: 'Alıntı',          line: '> ',         ph: 'alıntı' },
    { key: 'list',   icon: 'fa-list-ul',       title: 'Liste',           line: '- ',         ph: 'liste öğesi' }
];

function applyTool(ta, tool) {
    const start = ta.selectionStart, end = ta.selectionEnd;
    const val = ta.value;
    const sel = val.slice(start, end);
    let insert, selStart, selEnd;
    if (tool.wrap) {
        const body = sel || tool.ph;
        insert = tool.wrap[0] + body + tool.wrap[1];
        selStart = start + tool.wrap[0].length; selEnd = selStart + body.length;
    } else if (tool.block) {
        const body = sel || tool.ph;
        const pre = (start > 0 && val[start - 1] !== '\n') ? '\n' : '';
        insert = `${pre}\`\`\`\n${body}\n\`\`\`\n`;
        selStart = start + pre.length + 4; selEnd = selStart + body.length;
    } else {
        const body = sel || tool.ph;
        const pre = (start > 0 && val[start - 1] !== '\n') ? '\n' : '';
        insert = pre + body.split('\n').map(l => tool.line + l).join('\n');
        selStart = start + pre.length + tool.line.length; selEnd = start + insert.length;
    }
    if (ta.maxLength > 0 && (val.length - sel.length + insert.length) > ta.maxLength) return;
    ta.focus();
    ta.setRangeText(insert, start, end, 'end');
    ta.setSelectionRange(selStart, selEnd);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Bir textarea'nın ÜSTÜNE Markdown araç çubuğu ekler.
 * @param {HTMLTextAreaElement|string} textarea  element veya id
 * @returns {HTMLElement|null} oluşturulan araç çubuğu
 */
export function attachMarkdownToolbar(textarea) {
    const ta = typeof textarea === 'string' ? document.getElementById(textarea) : textarea;
    if (!ta || ta.dataset.mdToolbar === '1') return null;
    ta.dataset.mdToolbar = '1';
    const bar = document.createElement('div');
    bar.className = 'md-toolbar';
    bar.innerHTML = MD_TOOLS.map(t => `<button type="button" class="md-tool" data-md="${t.key}" title="${t.title}"><i class="fa-solid ${t.icon}"></i></button>`).join('')
        + `<span class="md-hint"><i class="fa-brands fa-markdown"></i> Markdown</span>`;
    bar.addEventListener('mousedown', e => e.preventDefault()); // odak kaybolmasın
    bar.addEventListener('click', e => {
        const btn = e.target.closest('[data-md]');
        if (!btn) return;
        const tool = MD_TOOLS.find(t => t.key === btn.dataset.md);
        if (tool) applyTool(ta, tool);
    });
    ta.addEventListener('keydown', e => {
        if (!(e.ctrlKey || e.metaKey)) return;
        const k = e.key.toLowerCase();
        if (k === 'b') { e.preventDefault(); applyTool(ta, MD_TOOLS[0]); }
        else if (k === 'i') { e.preventDefault(); applyTool(ta, MD_TOOLS[1]); }
    });
    ta.parentNode.insertBefore(bar, ta);
    return bar;
}

// ---------------------------------------------------------------------
// 9) Ortak stiller (rütbe efektleri, çerçeveler, unvanlar, markdown)
//    Sayfa yüklenince otomatik enjekte edilir (Tailwind CDN ile uyumlu).
// ---------------------------------------------------------------------
const CORE_CSS = `
/* ---------- Rütbeye göre isim efektleri ---------- */
.uname{transition:text-shadow .3s ease, filter .3s ease;}
.uname-l1{color:#a7f3d0;}
.uname-l2{color:#bef264;text-shadow:0 0 6px rgba(190,242,100,.25);}
.uname-l3{color:#5eead4;text-shadow:0 0 8px rgba(94,234,212,.35);}
.uname-l4{color:#fde047;text-shadow:0 0 10px rgba(253,224,71,.45);}
.uname-l5{background:linear-gradient(90deg,#67e8f9,#a5b4fc,#67e8f9);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent !important;animation:upShine 4s linear infinite;filter:drop-shadow(0 0 6px rgba(103,232,249,.45));}
.uname-l6{background:linear-gradient(90deg,#fbbf24,#fde68a,#f59e0b,#fbbf24);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent !important;animation:upShine 3s linear infinite;filter:drop-shadow(0 0 8px rgba(251,191,36,.55));}
.uname-mod{color:#fdba74 !important;text-shadow:0 0 8px rgba(249,115,22,.6),0 0 16px rgba(249,115,22,.25);}
.uname-admin{background:linear-gradient(90deg,#f87171,#fca5a5,#ef4444,#f87171);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent !important;animation:upShine 2.5s linear infinite;filter:drop-shadow(0 0 8px rgba(239,68,68,.6));}
.uname:hover{filter:brightness(1.2) drop-shadow(0 0 6px rgba(255,255,255,.25));}
@keyframes upShine{to{background-position:200% center;}}
.rank-badge{transition:transform .2s ease, box-shadow .2s ease;}
.rank-badge:hover{transform:translateY(-1px) scale(1.04);}
.rank-admin{box-shadow:0 0 8px rgba(239,68,68,.45);animation:upPulseRed 2.4s ease-in-out infinite;}
.rank-mod{box-shadow:0 0 8px rgba(249,115,22,.4);}
@keyframes upPulseRed{0%,100%{box-shadow:0 0 6px rgba(239,68,68,.35);}50%{box-shadow:0 0 14px rgba(239,68,68,.7);}}

/* ---------- Avatar halkaları (rütbe) ---------- */
.avatar-ring{border-radius:9999px;transition:box-shadow .3s ease, transform .3s ease;}
.avatar-ring:hover{transform:scale(1.05);}
.ring-exp{box-shadow:0 0 0 2px rgba(94,234,212,.55);}
.ring-elite{box-shadow:0 0 0 2px rgba(251,191,36,.7),0 0 12px rgba(251,191,36,.35);}
.ring-mod{box-shadow:0 0 0 2px rgba(249,115,22,.8),0 0 12px rgba(249,115,22,.4);}
.ring-admin{box-shadow:0 0 0 2px rgba(239,68,68,.9),0 0 14px rgba(239,68,68,.5);animation:upPulseRed 2.4s ease-in-out infinite;}

/* ---------- Mağaza çerçeveleri ---------- */
.frame-neon{box-shadow:0 0 0 2px #38bdf8,0 0 12px #38bdf8,0 0 24px rgba(56,189,248,.5) !important;animation:upNeon 2s ease-in-out infinite;}
@keyframes upNeon{0%,100%{box-shadow:0 0 0 2px #38bdf8,0 0 8px #38bdf8,0 0 16px rgba(56,189,248,.35);}50%{box-shadow:0 0 0 2px #7dd3fc,0 0 16px #38bdf8,0 0 30px rgba(56,189,248,.6);}}
.frame-gold{box-shadow:0 0 0 3px #f59e0b,0 0 0 5px rgba(253,230,138,.35),0 0 18px rgba(251,191,36,.6) !important;}
.frame-rainbow{box-shadow:0 0 0 3px #f472b6,0 0 16px rgba(167,139,250,.6) !important;animation:upRainbow 4s linear infinite;}
@keyframes upRainbow{0%{box-shadow:0 0 0 3px #f472b6,0 0 16px rgba(244,114,182,.6);}25%{box-shadow:0 0 0 3px #fbbf24,0 0 16px rgba(251,191,36,.6);}50%{box-shadow:0 0 0 3px #34d399,0 0 16px rgba(52,211,153,.6);}75%{box-shadow:0 0 0 3px #60a5fa,0 0 16px rgba(96,165,250,.6);}100%{box-shadow:0 0 0 3px #f472b6,0 0 16px rgba(244,114,182,.6);}}
.frame-fire{box-shadow:0 0 0 2px #f97316,0 0 14px #ef4444,0 -4px 18px rgba(251,146,60,.7) !important;animation:upFire 1.2s ease-in-out infinite alternate;}
@keyframes upFire{from{box-shadow:0 0 0 2px #f97316,0 0 10px #ef4444,0 -3px 14px rgba(251,146,60,.6);}to{box-shadow:0 0 0 2px #fb923c,0 0 18px #ef4444,0 -6px 22px rgba(251,191,36,.7);}}
.frame-galaxy{box-shadow:0 0 0 2px #8b5cf6,0 0 0 4px rgba(236,72,153,.35),0 0 20px rgba(139,92,246,.6) !important;animation:upGalaxy 3s ease-in-out infinite;}
@keyframes upGalaxy{50%{box-shadow:0 0 0 2px #ec4899,0 0 0 4px rgba(139,92,246,.4),0 0 26px rgba(236,72,153,.6);}}
.frame-emerald{box-shadow:0 0 0 2px #10b981,0 0 0 4px rgba(16,185,129,.25),0 0 14px rgba(16,185,129,.55) !important;}
.frame-cyberpunk{box-shadow:0 0 0 2px #f43f5e,0 0 0 4px #facc15,0 0 18px rgba(244,63,94,.7),0 0 28px rgba(250,204,21,.45) !important;animation:upCyber 2.2s ease-in-out infinite alternate;}
@keyframes upCyber{from{box-shadow:0 0 0 2px #e879f9,0 0 0 4px rgba(250,204,21,.65),0 0 16px rgba(232,121,249,.65);}to{box-shadow:0 0 0 2px #facc15,0 0 0 4px rgba(232,121,249,.65),0 0 22px rgba(250,204,21,.75);}}
.frame-amethyst{box-shadow:0 0 0 2px #a855f7,0 0 0 4px rgba(192,132,252,.35),0 0 20px rgba(168,85,247,.75) !important;animation:upAmethyst 2.8s ease-in-out infinite;}
@keyframes upAmethyst{0%,100%{box-shadow:0 0 0 2px #9333ea,0 0 14px rgba(168,85,247,.6);}50%{box-shadow:0 0 0 3px #c084fc,0 0 24px rgba(192,132,252,.85);}}
.frame-solar{box-shadow:0 0 0 2px #fb923c,0 0 0 4px rgba(251,191,36,.4),0 0 20px rgba(249,115,22,.8),0 0 32px rgba(234,179,8,.5) !important;animation:upSolar 1.8s ease-in-out infinite alternate;}
@keyframes upSolar{from{box-shadow:0 0 0 2px #f97316,0 0 14px rgba(251,191,36,.6);}to{box-shadow:0 0 0 3px #fde047,0 0 26px rgba(249,115,22,.9);}}
.frame-ice{box-shadow:0 0 0 2px #7dd3fc,0 0 0 4px rgba(186,230,253,.35),0 0 18px rgba(56,189,248,.75) !important;animation:upIce 3s ease-in-out infinite;}
@keyframes upIce{0%,100%{box-shadow:0 0 0 2px #38bdf8,0 0 12px rgba(125,211,252,.55);}50%{box-shadow:0 0 0 2px #e0f2fe,0 0 22px rgba(56,189,248,.85);}}

/* ---------- Unvanlar ---------- */
.user-title{display:inline-flex;align-items:center;gap:.25rem;font-size:9px;font-weight:800;letter-spacing:.03em;padding:.1rem .45rem;border-radius:9999px;border:1px solid transparent;white-space:nowrap;transition:transform .2s ease;}
.user-title:hover{transform:translateY(-1px);}
.user-title i{font-size:8px;}
.title-violet{color:#e9d5ff;background:rgba(139,92,246,.18);border-color:rgba(167,139,250,.45);box-shadow:0 0 8px rgba(139,92,246,.35);}
.title-gold{color:#fde68a;background:rgba(245,158,11,.16);border-color:rgba(251,191,36,.5);box-shadow:0 0 8px rgba(251,191,36,.35);}
.title-emerald{color:#a7f3d0;background:rgba(16,185,129,.16);border-color:rgba(52,211,153,.45);box-shadow:0 0 8px rgba(16,185,129,.3);}
.title-crimson{color:#fecaca;background:rgba(220,38,38,.18);border-color:rgba(248,113,113,.45);box-shadow:0 0 8px rgba(220,38,38,.35);}
.title-ice{color:#e0f2fe;background:rgba(56,189,248,.15);border-color:rgba(125,211,252,.5);box-shadow:0 0 8px rgba(56,189,248,.35);}
.title-neonblue{color:#bae6fd;background:rgba(14,165,233,.2);border-color:rgba(56,189,248,.6);box-shadow:0 0 10px rgba(56,189,248,.45);}
.title-night{color:#cbd5e1;background:rgba(15,23,42,.85);border-color:rgba(99,102,241,.5);box-shadow:0 0 10px rgba(99,102,241,.35);}
.title-pink{color:#fbcfe8;background:rgba(236,72,153,.18);border-color:rgba(244,114,182,.5);box-shadow:0 0 10px rgba(236,72,153,.4);}
.title-rainbow{color:#fff;background:linear-gradient(90deg,#ec4899,#f59e0b,#10b981,#3b82f6,#8b5cf6,#ec4899);background-size:300% auto;animation:upShine 5s linear infinite;border-color:rgba(255,255,255,.25);text-shadow:0 1px 2px rgba(0,0,0,.4);}

/* ---------- Künye ---------- */
.kunye-line{display:inline-flex;align-items:center;gap:.3rem;font-size:10px;color:#94a3b8;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.kunye-line i{font-size:9px;color:#818cf8;}
.kunye-chip{display:inline-flex;align-items:center;gap:.3rem;font-size:10px;font-weight:600;padding:.15rem .55rem;border-radius:9999px;border:1px solid;transition:background .2s ease;}
.kunye-chip i{font-size:9px;}
.kunye-uni{color:#c7d2fe;background:rgba(99,102,241,.12);border-color:rgba(129,140,248,.35);}
.kunye-dep{color:#bae6fd;background:rgba(14,165,233,.1);border-color:rgba(56,189,248,.3);}
.kunye-grade{color:#ddd6fe;background:rgba(139,92,246,.12);border-color:rgba(167,139,250,.35);}

/* ---------- Markdown içerik ---------- */
.md-body{word-break:break-word;}
.md-body .md-strong{color:#fff;font-weight:700;}
.md-body .md-em{font-style:italic;color:#e2e8f0;}
.md-body .md-h3{font-size:1rem;font-weight:800;color:#fff;margin:.6rem 0 .3rem;padding-left:.5rem;border-left:3px solid #818cf8;}
.md-body .md-pre{background:#0b1220;border:1px solid #334155;border-radius:.6rem;padding:.7rem .85rem;margin:.5rem 0;overflow-x:auto;font-size:12px;line-height:1.5;color:#a5f3fc;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre;}
.md-body .md-code{background:rgba(15,23,42,.9);border:1px solid #334155;border-radius:.3rem;padding:0 .3rem;font-size:.85em;color:#f9a8d4;font-family:ui-monospace,Menlo,Consolas,monospace;}
.md-body .md-quote{border-left:3px solid #a78bfa;background:rgba(139,92,246,.08);padding:.4rem .7rem;margin:.4rem 0;border-radius:0 .5rem .5rem 0;color:#cbd5e1;font-style:italic;}
.md-body .md-list{list-style:disc;padding-left:1.25rem;margin:.3rem 0;}
.md-body .md-list li{margin:.1rem 0;}
.md-body .md-list li::marker{color:#818cf8;}

/* ---------- Markdown araç çubuğu ---------- */
.md-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:.25rem;padding:.3rem;margin-bottom:.35rem;background:rgba(15,23,42,.6);border:1px solid #334155;border-radius:.6rem;}
.md-tool{width:1.85rem;height:1.85rem;display:inline-flex;align-items:center;justify-content:center;border-radius:.45rem;color:#94a3b8;font-size:11px;transition:all .15s ease;}
.md-tool:hover{background:rgba(99,102,241,.2);color:#c7d2fe;transform:translateY(-1px);}
.md-tool:active{transform:scale(.92);}
.md-hint{margin-left:auto;font-size:10px;color:#64748b;padding-right:.35rem;}

/* ---------- Optimistic UI & mikro animasyonlar ---------- */
.up-pending{opacity:.75;}
.up-pending-icon{font-size:10px;color:#94a3b8;display:inline-flex;align-items:center;gap:.25rem;}
.up-failed{border-color:rgba(239,68,68,.6) !important;background:rgba(239,68,68,.06) !important;}
.up-fade-in{animation:upFadeIn .35s ease both;}
@keyframes upFadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
.up-heart-pop{animation:upHeartPop .35s ease;}
@keyframes upHeartPop{0%{transform:scale(1);}40%{transform:scale(1.35);}100%{transform:scale(1);}}
.up-card-glow{transition:transform .25s ease, box-shadow .25s ease, border-color .25s ease;}
.up-card-glow:hover{transform:translateY(-2px);box-shadow:0 10px 30px -10px rgba(99,102,241,.35);}
.up-chip{display:inline-flex;align-items:center;gap:.25rem;font-size:10px;font-weight:600;padding:.1rem .45rem;border-radius:9999px;background:rgba(51,65,85,.5);border:1px solid rgba(71,85,105,.6);color:#cbd5e1;}

/* ---------- iOS Mobil Input Otomatik Zoom Engeli ---------- */
input[type="text"], input[type="number"], input[type="email"], input[type="url"], input[type="search"], input[type="password"], input[type="tel"], textarea, select {
    font-size: 16px !important;
    -webkit-text-size-adjust: 100%;
}
@media (min-width: 640px) {
    input[type="text"], input[type="number"], input[type="email"], input[type="url"], input[type="search"], input[type="password"], input[type="tel"], textarea, select {
        font-size: 12px !important;
    }
}

/* ---------- Günlük Ödül (Daily Streak) & Konfeti Efektleri ---------- */
@keyframes upRewardFloat {
    0% { opacity: 0; transform: translateY(0) scale(0.6); }
    20% { opacity: 1; transform: translateY(-10px) scale(1.1); }
    80% { opacity: 1; transform: translateY(-55px) scale(1); }
    100% { opacity: 0; transform: translateY(-85px) scale(0.9); }
}
.up-reward-float {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    font-weight: 800;
    font-size: 17px;
    animation: upRewardFloat 2s ease-out forwards;
    text-shadow: 0 2px 8px rgba(0,0,0,0.55);
}
@keyframes upConfettiFly {
    0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
    100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(0.55); opacity: 0; }
}
.up-confetti-piece {
    position: fixed;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    pointer-events: none;
    z-index: 9999;
    animation: upConfettiFly 1s cubic-bezier(.2,.7,.3,1) forwards;
}
@keyframes upStreakGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7), 0 0 12px rgba(245, 158, 11, 0.45); }
    50% { box-shadow: 0 0 0 5px rgba(245, 158, 11, 0), 0 0 20px rgba(251, 191, 36, 0.75); }
}
.streak-active-card {
    animation: upStreakGlow 2.2s ease-in-out infinite;
}
`;

export function injectCoreStyles() {
    if (typeof document === 'undefined' || document.getElementById('portal-core-styles')) return;
    const style = document.createElement('style');
    style.id = 'portal-core-styles';
    style.textContent = CORE_CSS;
    document.head.appendChild(style);
}
injectCoreStyles();

// ---------------------------------------------------------------------
// 10) GÜNLÜK GİRİŞ ÖDÜLÜ (DAILY STREAK / CHECK-IN) SİSTEMİ
//     0 Ekstra Okuma: Sayfa açılışında zaten çekilen userData kullanılır.
// ---------------------------------------------------------------------
export const DAILY_STREAK_REWARDS = [
    { day: 1, coins: 3,  xp: 5,  icon: 'fa-coins',  title: '1. Gün' },
    { day: 2, coins: 4,  xp: 8,  icon: 'fa-coins',  title: '2. Gün' },
    { day: 3, coins: 5,  xp: 10, icon: 'fa-bolt',   title: '3. Gün' },
    { day: 4, coins: 6,  xp: 12, icon: 'fa-coins',  title: '4. Gün' },
    { day: 5, coins: 8,  xp: 15, icon: 'fa-fire',   title: '5. Gün' },
    { day: 6, coins: 10, xp: 20, icon: 'fa-gem',    title: '6. Gün' },
    { day: 7, coins: 20, xp: 30, icon: 'fa-trophy', title: '7. Gün • Büyük Ödül', grand: true }
];

let streakCtx = {
    db: null,
    uid: null,
    userData: null,
    claiming: false,
    onClaim: null
};

function getLocalDateStr(dateObj = new Date()) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function normalizeClaimDateStr(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    // "DD.MM.YYYY" (toLocaleDateString('tr-TR')) formatını YYYY-MM-DD'ye çevir
    const trMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (trMatch) {
        return `${trMatch[3]}-${String(trMatch[2]).padStart(2, '0')}-${String(trMatch[1]).padStart(2, '0')}`;
    }
    if (trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        return trimmed.slice(0, 10);
    }
    return trimmed;
}

export function evaluateDailyStreak(userData) {
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yest);

    const lastClaimDate = normalizeClaimDateStr(userData?.lastClaimDate);
    const rawStreak = Math.max(0, parseInt(userData?.streak, 10) || 0);

    if (lastClaimDate === todayStr) {
        const currentStreak = Math.min(7, Math.max(1, rawStreak || 1));
        return {
            claimedToday: true,
            currentStreak,
            targetDay: currentStreak,
            completedUpTo: currentStreak,
            todayStr
        };
    }

    if (lastClaimDate === yesterdayStr && rawStreak > 0) {
        const nextDay = (rawStreak % 7) + 1;
        const completedUpTo = rawStreak >= 7 ? 0 : rawStreak;
        return {
            claimedToday: false,
            currentStreak: rawStreak,
            targetDay: nextDay,
            completedUpTo,
            todayStr
        };
    }

    return {
        claimedToday: false,
        currentStreak: 0,
        targetDay: 1,
        completedUpTo: 0,
        todayStr
    };
}

export function burstConfetti(originEl) {
    if (typeof document === 'undefined') return;
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    if (originEl && typeof originEl.getBoundingClientRect === 'function') {
        const r = originEl.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) {
            cx = r.left + r.width / 2;
            cy = r.top + r.height / 2;
        }
    }
    const colors = ['#fbbf24', '#34d399', '#a78bfa', '#60a5fa', '#f472b6', '#f97316'];
    for (let i = 0; i < 32; i++) {
        const p = document.createElement('span');
        p.className = 'up-confetti-piece';
        const angle = (Math.PI * 2 * i) / 32 + (Math.random() - 0.5) * 0.4;
        const dist = 55 + Math.random() * 110;
        p.style.left = `${cx}px`;
        p.style.top = `${cy}px`;
        p.style.background = colors[i % colors.length];
        p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        p.style.setProperty('--dy', `${Math.sin(angle) * dist - 25}px`);
        p.style.setProperty('--rot', `${(Math.random() - 0.5) * 720}deg`);
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1050);
    }
}

export function showRewardAnimation(text, color = 'text-yellow-400', icon = 'fa-coins') {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.className = `up-reward-float ${color}`;
    el.innerHTML = `<i class="fa-solid ${icon} mr-1"></i>${escapeHtml(text)}`;
    const anchor = document.getElementById('user-coins') || document.getElementById('user-avatar');
    if (anchor) {
        const rect = anchor.getBoundingClientRect();
        el.style.left = `${Math.max(20, rect.left - 10)}px`;
        el.style.top = `${Math.max(20, rect.top - 8)}px`;
    } else {
        el.style.left = '80%';
        el.style.top = '75px';
    }
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

function ensureDailyStreakModal() {
    if (typeof document === 'undefined') return null;
    let modal = document.getElementById('daily-streak-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'daily-streak-modal';
    modal.className = 'fixed inset-0 bg-black/75 backdrop-blur-sm hidden items-center justify-center z-[180] p-4';
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeDailyStreakModal();
    });

    modal.innerHTML = `
        <div class="bg-slate-800 border border-slate-700 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative overflow-hidden up-fade-in">
            <div class="absolute -top-24 -right-24 w-56 h-56 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-24 -left-24 w-56 h-56 bg-purple-500/15 rounded-full blur-3xl pointer-events-none"></div>

            <div class="relative flex items-center justify-between border-b border-slate-700/80 pb-3.5 mb-4">
                <div class="flex items-center space-x-3">
                    <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/25 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xl shadow-inner">
                        <i class="fa-solid fa-calendar-check"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <h3 class="text-base sm:text-lg font-extrabold text-white">Günlük Giriş Ödülü</h3>
                            <span id="streak-modal-series-badge" class="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">🔥 0 Günlük Seri!</span>
                        </div>
                        <p class="text-[11px] text-slate-400 mt-0.5">Her gün giriş yaparak serini koru, 7. günde büyük ödülü kap!</p>
                    </div>
                </div>
                <button type="button" onclick="closeDailyStreakModal()" class="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-700/60 transition">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <div id="streak-days-grid" class="relative grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5"></div>

            <div class="relative flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-700/80">
                <p id="streak-status-hint" class="text-[11px] text-slate-400 text-center sm:text-left">
                    <i class="fa-solid fa-circle-info text-amber-400 mr-1"></i>Seri 7. günden sonra tekrar 1. günden devam eder.
                </p>
                <button type="button" id="claim-streak-btn" onclick="claimDailyStreakReward()" class="w-full sm:w-auto px-6 py-2.5 rounded-xl font-extrabold text-xs text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 transition shadow-lg shadow-amber-500/25 flex items-center justify-center space-x-2">
                    <i class="fa-solid fa-gift"></i>
                    <span>Ödülü Topla</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

export function syncDailyStreakUI() {
    if (typeof document === 'undefined') return;
    const state = evaluateDailyStreak(streakCtx.userData);

    // 1) Dropdown rozeti
    const badge = document.getElementById('streak-dropdown-badge');
    if (badge) {
        badge.textContent = `${state.currentStreak} Gün`;
    }

    // 2) Menüdeki bildirim noktası
    const menuDot = document.getElementById('streak-unclaimed-dot');
    if (menuDot) {
        if (!state.claimedToday && streakCtx.uid) menuDot.classList.remove('hidden');
        else menuDot.classList.add('hidden');
    }

    // 3) Profil avatarı üzerindeki sarı/turuncu glow nokta
    const avatarImg = document.getElementById('user-avatar');
    if (avatarImg && avatarImg.parentElement) {
        const parent = avatarImg.parentElement;
        let avatarDot = document.getElementById('avatar-streak-dot');
        if (!avatarDot) {
            avatarDot = document.createElement('span');
            avatarDot.id = 'avatar-streak-dot';
            avatarDot.title = 'Günlük ödülün hazır!';
            avatarDot.className = 'hidden absolute -top-0.5 -left-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-slate-800 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-bounce pointer-events-none';
            parent.appendChild(avatarDot);
        }
        if (!state.claimedToday && streakCtx.uid) avatarDot.classList.remove('hidden');
        else avatarDot.classList.add('hidden');
    }

    // 4) Modal açıksa veya mevcutsa kartları güncelle
    const modal = document.getElementById('daily-streak-modal');
    if (!modal) return;

    const seriesBadge = document.getElementById('streak-modal-series-badge');
    if (seriesBadge) {
        seriesBadge.textContent = `🔥 ${state.currentStreak} Günlük Seri!`;
    }

    const grid = document.getElementById('streak-days-grid');
    if (grid) {
        grid.innerHTML = DAILY_STREAK_REWARDS.map(r => {
            const isCompleted = r.day <= state.completedUpTo;
            const isTodayTarget = !state.claimedToday && r.day === state.targetDay;
            const isLocked = !isCompleted && !isTodayTarget;
            const spanClass = r.grand ? 'col-span-2 sm:col-span-3' : '';

            let cardStyle = 'bg-slate-900/70 border-slate-700/80 opacity-50';
            let statusBadge = `<span class="text-[10px] text-slate-400 font-semibold"><i class="fa-solid fa-lock mr-1"></i>Kilitli</span>`;

            if (isCompleted) {
                cardStyle = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200';
                statusBadge = `<span class="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-400/40"><i class="fa-solid fa-check mr-1"></i>Alındı</span>`;
            } else if (isTodayTarget) {
                cardStyle = 'bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-slate-900 border-2 border-amber-400 streak-active-card';
                statusBadge = `<span class="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-extrabold">BUGÜN</span>`;
            }

            return `
                <div class="${spanClass} ${cardStyle} border rounded-2xl p-3 flex ${r.grand ? 'items-center justify-between' : 'flex-col justify-between'} gap-2 transition">
                    <div class="flex items-center justify-between gap-2 w-full">
                        <span class="text-xs font-extrabold ${isTodayTarget ? 'text-amber-300' : (isCompleted ? 'text-emerald-300' : 'text-slate-300')}">
                            ${r.grand ? '<i class="fa-solid fa-crown text-amber-400 mr-1"></i>' : ''}${escapeHtml(r.title)}
                        </span>
                        ${statusBadge}
                    </div>
                    <div class="flex items-center ${r.grand ? 'gap-3' : 'justify-between'} pt-1">
                        <div class="flex items-center gap-2 text-xs font-bold">
                            <span class="text-yellow-400 flex items-center"><i class="fa-solid fa-coins mr-1"></i>+${r.coins} Coin</span>
                            <span class="text-purple-300 flex items-center"><i class="fa-solid fa-bolt mr-1"></i>+${r.xp} XP</span>
                        </div>
                        <i class="fa-solid ${r.icon} ${r.grand ? 'text-2xl text-amber-400' : 'text-sm text-slate-400'}"></i>
                    </div>
                </div>
            `;
        }).join('');
    }

    const claimBtn = document.getElementById('claim-streak-btn');
    if (claimBtn) {
        if (state.claimedToday) {
            claimBtn.disabled = true;
            claimBtn.className = 'w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs text-slate-400 bg-slate-700/70 border border-slate-600 cursor-not-allowed flex items-center justify-center space-x-2';
            claimBtn.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i><span>Bugün Toplandı, Yarın Tekrar Gel!</span>`;
        } else {
            const reward = DAILY_STREAK_REWARDS.find(x => x.day === state.targetDay) || DAILY_STREAK_REWARDS[0];
            claimBtn.disabled = false;
            claimBtn.className = 'w-full sm:w-auto px-6 py-2.5 rounded-xl font-extrabold text-xs text-slate-950 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 animate-pulse transition shadow-lg shadow-amber-500/30 flex items-center justify-center space-x-2';
            claimBtn.innerHTML = `<i class="fa-solid fa-gift"></i><span>Ödülü Topla (+${reward.coins} Coin & +${reward.xp} XP)</span>`;
        }
    }
}

export function initDailyStreak(db, uid, userData, onClaim) {
    streakCtx.db = db || streakCtx.db;
    streakCtx.uid = uid || null;
    streakCtx.userData = userData || null;
    if (typeof onClaim === 'function') streakCtx.onClaim = onClaim;
    ensureDailyStreakModal();
    syncDailyStreakUI();
}

export function openDailyStreakModal() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    if (!streakCtx.uid) {
        if (typeof window.showToast === 'function') {
            window.showToast('Günlük ödülü toplamak için önce giriş yapmalısın.', 'warning');
        }
        return;
    }
    const modal = ensureDailyStreakModal();
    syncDailyStreakUI();
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

export function closeDailyStreakModal() {
    const modal = document.getElementById('daily-streak-modal');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

export async function claimDailyStreakReward() {
    if (streakCtx.claiming || !streakCtx.db || !streakCtx.uid) return;
    const state = evaluateDailyStreak(streakCtx.userData);
    if (state.claimedToday) return;

    const reward = DAILY_STREAK_REWARDS.find(r => r.day === state.targetDay) || DAILY_STREAK_REWARDS[0];
    const newStreak = reward.day;
    const todayStr = state.todayStr;

    const claimBtn = document.getElementById('claim-streak-btn');
    streakCtx.claiming = true;
    if (claimBtn) {
        claimBtn.disabled = true;
        claimBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i><span>Toplanıyor...</span>`;
    }

    try {
        await updateDoc(doc(streakCtx.db, "users", streakCtx.uid), {
            coins: increment(reward.coins),
            xp: increment(reward.xp),
            streak: newStreak,
            lastClaimDate: todayStr,
            lastClaimTimestamp: serverTimestamp()
        });

        if (!streakCtx.userData) streakCtx.userData = {};
        streakCtx.userData.coins = (Number(streakCtx.userData.coins) || 0) + reward.coins;
        streakCtx.userData.xp = (Number(streakCtx.userData.xp) || 0) + reward.xp;
        streakCtx.userData.streak = newStreak;
        streakCtx.userData.lastClaimDate = todayStr;

        primeAuthor(streakCtx.uid, streakCtx.userData);

        // Header ve sayfa içi bakiye göstergelerini anında güncelle
        const headerCoins = document.getElementById('user-coins');
        if (headerCoins) headerCoins.textContent = streakCtx.userData.coins;
        const storeBalance = document.getElementById('balance-amount');
        if (storeBalance) storeBalance.textContent = streakCtx.userData.coins;
        const statCoins = document.getElementById('stat-coins');
        if (statCoins) statCoins.textContent = streakCtx.userData.coins;
        const statXp = document.getElementById('stat-xp');
        if (statXp) statXp.textContent = streakCtx.userData.xp;

        burstConfetti(claimBtn);
        showRewardAnimation(`+${reward.coins} Coin`, 'text-yellow-400', 'fa-coins');
        setTimeout(() => showRewardAnimation(`+${reward.xp} XP`, 'text-purple-400', 'fa-bolt'), 250);

        if (typeof window.showToast === 'function') {
            window.showToast(`🎉 ${reward.day}. Gün ödülü toplandı: +${reward.coins} Coin & +${reward.xp} XP!`, 'success');
        }
        if (typeof streakCtx.onClaim === 'function') {
            try { streakCtx.onClaim(reward, streakCtx.userData); } catch (e) {}
        }

        syncDailyStreakUI();
    } catch (err) {
        console.error('Günlük ödül alınamadı:', err);
        if (typeof window.showToast === 'function') {
            window.showToast('Günlük ödül alınırken bir hata oluştu.', 'error');
        }
        syncDailyStreakUI();
    } finally {
        streakCtx.claiming = false;
    }
}

if (typeof window !== 'undefined') {
    window.openDailyStreakModal = openDailyStreakModal;
    window.closeDailyStreakModal = closeDailyStreakModal;
    window.claimDailyStreakReward = claimDailyStreakReward;
    if (typeof window.burstConfetti !== 'function') window.burstConfetti = burstConfetti;
    if (typeof window.showRewardAnimation !== 'function') window.showRewardAnimation = showRewardAnimation;
}

