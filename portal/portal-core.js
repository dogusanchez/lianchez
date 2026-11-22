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
    doc, getDoc, getDocs, collection, query, where, documentId, updateDoc, increment, serverTimestamp, arrayUnion
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

export function safeUrl(url) {
    if (typeof url !== 'string') return "";
    const u = url.trim();
    if (!u) return "";
    if (/^https?:\/\//i.test(u) || u.startsWith('/portal/')) return u;
    return "";
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
    'frame-ice':       'Kutup Buzulu',
    'frame-ruby':      'Yakut Alevi',
    'frame-aurora':    'Kuzey Işıkları',
    'frame-obsidian':  'Obsidyen Gölge',
    'frame-sakura':    'Sakura Esintisi',
    'frame-diamond':   'Elmas Pırıltı'
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
    'title-pink':     'Pembe Eflatun',
    'title-amber':    'Kehribar',
    'title-cyber':    'Siberpunk',
    'title-aurora':   'Aurora',
    'title-obsidian': 'Obsidyen'
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
    { id: 'frm_emerald', type: 'frame', name: 'Zümrüt Aura', description: 'Doğal ve sakin zümrüt yeşili ışıltı halkası.', price: 65, style: 'frame-emerald', icon: 'fa-leaf', active: true },
    { id: 'frm_sakura', type: 'frame', name: 'Sakura Esintisi', description: 'Zarif kiraz çiçeği pembesi ve yumuşak beyaz parıltı.', price: 75, style: 'frame-sakura', icon: 'fa-fan', active: true },
    { id: 'frm_cyberpunk', type: 'frame', name: 'Siberpunk Neon', description: 'Eflatun ve sarı neon geçişleriyle fütüristik bir enerji yay.', price: 80, style: 'frame-cyberpunk', icon: 'fa-bolt', active: true },
    { id: 'frm_ice', type: 'frame', name: 'Kutup Buzulu', description: 'Buz mavisi dondurucu parıltıyla soğukkanlı tarzını yansıt.', price: 85, style: 'frame-ice', icon: 'fa-snowflake', active: true },
    { id: 'frm_amethyst', type: 'frame', name: 'Ametist Kristali', description: 'Derin mor kristal ışıltısıyla profiline mistik bir hava kat.', price: 90, style: 'frame-amethyst', icon: 'fa-gem', active: true },
    { id: 'frm_fire', type: 'frame', name: 'Alev Çemberi', description: 'Kızıl-turuncu kor alevlerle enerjini profiline taşı.', price: 95, style: 'frame-fire', icon: 'fa-fire', active: true },
    { id: 'frm_ruby', type: 'frame', name: 'Yakut Alevi', description: 'Koyu yakut kırmızısı nabızlı lüks çerçeve.', price: 100, style: 'frame-ruby', icon: 'fa-heart', active: true },
    { id: 'frm_solar', type: 'frame', name: 'Güneş Patlaması', description: 'Turuncu-altın alev dalgasıyla tüm bakışları üzerine topla.', price: 110, style: 'frame-solar', icon: 'fa-sun', active: true },
    { id: 'frm_obsidian', type: 'frame', name: 'Obsidyen Gölge', description: 'Karanlık metalik gümüş ve gece mavisi gizemli aura.', price: 115, style: 'frame-obsidian', icon: 'fa-moon', active: true },
    { id: 'frm_gold', type: 'frame', name: 'Altın Parıltı Çerçeve', description: 'Seçkinler için ışıldayan altın halka.', price: 120, style: 'frame-gold', icon: 'fa-ring', active: true },
    { id: 'frm_galaxy', type: 'frame', name: 'Kozmik Galaksi', description: 'Mor ve pembe nebula bulutları arasında parlayan yıldız halkası.', price: 130, style: 'frame-galaxy', icon: 'fa-meteor', active: true },
    { id: 'frm_aurora', type: 'frame', name: 'Kuzey Işıkları', description: 'Zümrüt, camgöbeği ve mor arasında akan kutup ışığı efekti.', price: 140, style: 'frame-aurora', icon: 'fa-wand-magic-sparkles', active: true },
    { id: 'frm_rainbow', type: 'frame', name: 'Gökkuşağı Çerçeve', description: 'Dönen renk çemberiyle herkesin dikkatini çek.', price: 200, style: 'frame-rainbow', icon: 'fa-rainbow', active: true },
    { id: 'frm_diamond', type: 'frame', name: 'Elmas Pırıltı', description: 'Buz beyazı ve saf elmas parlaklığıyla en nadir prestij çerçevesi.', price: 220, style: 'frame-diamond', icon: 'fa-diamond', active: true },
    // Unvanlar
    { id: 'ttl_kahve', type: 'title', name: 'Kahve Bağımlısı', description: 'Vize haftalarını kafeinle atlatanlara sıcak kehribar unvan.', price: 35, style: 'title-amber', icon: 'fa-mug-hot', active: true },
    { id: 'ttl_kod', type: 'title', name: 'Kod Ustası', description: 'İsminin yanında mor ışıltılı unvan.', price: 40, style: 'title-violet', icon: 'fa-code', active: true },
    { id: 'ttl_kutup', type: 'title', name: 'Kütüphane Kurdu', description: 'Zümrüt yeşili, çalışkanlara özel unvan.', price: 40, style: 'title-emerald', icon: 'fa-book', active: true },
    { id: 'ttl_not', type: 'title', name: 'Not Avcısı', description: 'En iyi ders notlarını paylaşan ve toplayanlara buz mavisi rozet.', price: 40, style: 'title-ice', icon: 'fa-note-sticky', active: true },
    { id: 'ttl_gece', type: 'title', name: 'Gece Nöbetçisi', description: 'Sabaha kadar ders çalışan ve kod yazanlara özel karanlık mod baykuş rozeti.', price: 45, style: 'title-night', icon: 'fa-moon', active: true },
    { id: 'ttl_social', type: 'title', name: 'Sosyal Kelebek', description: 'Kampüsün her etkinliğinde boy gösterenlere pembe-eflatun ışık.', price: 50, style: 'title-pink', icon: 'fa-heart', active: true },
    { id: 'ttl_tasarim', type: 'title', name: 'Piksel Sanatçısı', description: 'Yaratıcı ve estetik gözü olan tasarımcılara özel pembe parıltı.', price: 50, style: 'title-pink', icon: 'fa-palette', active: true },
    { id: 'ttl_vizyoner', type: 'title', name: 'Vizyoner Mühendis', description: 'Geleceği inşa edenler için parlayan neon mavi rozet.', price: 60, style: 'title-neonblue', icon: 'fa-microchip', active: true },
    { id: 'ttl_guru', type: 'title', name: 'Final Fatihi', description: 'Vize ve finallerden korkmayanlara zümrüt yeşili rozet.', price: 65, style: 'title-emerald', icon: 'fa-graduation-cap', active: true },
    { id: 'ttl_algoritma', type: 'title', name: 'Algoritma Dehası', description: 'Karmaşık problemleri çözenlere özel siberpunk ışıltılı unvan.', price: 65, style: 'title-cyber', icon: 'fa-terminal', active: true },
    { id: 'ttl_bilge', type: 'title', name: 'Genel Kültür Bilgesi', description: 'Bilgi oyunlarında rekor kıranlara kuzey ışığı parıltılı rozet.', price: 70, style: 'title-aurora', icon: 'fa-brain', active: true },
    { id: 'ttl_lider', type: 'title', name: 'Kampüs Lideri', description: 'Topluluklara yön verenler için altın taç ışıltısı.', price: 75, style: 'title-gold', icon: 'fa-crown', active: true },
    { id: 'ttl_mentor', type: 'title', name: 'Kampüs Mentoru', description: 'Forumda herkese yardım eden deneyimli öğrencilere altın rozet.', price: 80, style: 'title-gold', icon: 'fa-compass', active: true },
    { id: 'ttl_oyuncu', type: 'title', name: 'Arena Şampiyonu', description: 'Oyun arenasının zirvesindekilere kızıl alevli şampiyonluk unvanı.', price: 85, style: 'title-crimson', icon: 'fa-trophy', active: true },
    { id: 'ttl_girisimci', type: 'title', name: 'Startup Kurucusu', description: 'Fikirlerini projeye dönüştüren girişimcilere neon mavi unvan.', price: 95, style: 'title-neonblue', icon: 'fa-rocket', active: true },
    { id: 'ttl_golge', type: 'title', name: 'Sessiz Efsane', description: 'Az konuşup çok iş başaranlara özel obsidyen metalik unvan.', price: 110, style: 'title-obsidian', icon: 'fa-user-secret', active: true },
    { id: 'ttl_efsane', type: 'title', name: 'Kampüs Efsanesi', description: 'Gökkuşağı akışlı nadir unvan.', price: 150, style: 'title-rainbow', icon: 'fa-crown', active: true },
    { id: 'ttl_yildiz', type: 'title', name: 'Üni Portal Yıldızı', description: 'Portalın en parlak isimleri için gökkuşağı ışıltılı zirve unvanı.', price: 180, style: 'title-rainbow', icon: 'fa-star', active: true },
    // Sponsor Kuponları
    { id: 'cpn_fotokopi', type: 'coupon', name: '100 Sayfa Ücretsiz Fotokopi', description: 'Ders notları ve çıkmış sorular için 100 sayfa ücretsiz siyah-beyaz çıktı kuponu.', price: 25, sponsor: 'Merkez Kırtasiye', couponCode: 'FOTO100', icon: 'fa-print', active: true },
    { id: 'cpn_kahve', type: 'coupon', name: 'Kampüs Kafe %20 İndirim', description: 'Tüm sıcak ve soğuk kahvelerde geçerli anında %20 öğrenci indirimi.', price: 30, sponsor: 'Kampüs Kafe', couponCode: 'KAMPUS20', icon: 'fa-mug-hot', active: true },
    { id: 'cpn_kitap', type: 'coupon', name: 'Akademik Kitap Evi 50₺ İndirim', description: 'Seçili akademik ve kültür kitaplarında 200₺ ve üzeri alışverişte 50₺ indirim.', price: 40, sponsor: 'Kitap Kurdu', couponCode: 'KİTAP50', icon: 'fa-book-open', active: true }
];
const STORE_CACHE_KEY = 'up_store_v3';
const STORE_CACHE_TTL = 60 * 60 * 1000;

export async function getStoreItems(db, { force = false } = {}) {
    if (!force) {
        const cmCached = cacheGet('store_items');
        if (Array.isArray(cmCached)) return cmCached;
        const cached = lsGet(STORE_CACHE_KEY);
        if (cached && Array.isArray(cached.items) && (Date.now() - cached.t < STORE_CACHE_TTL)) return cached.items;
    }
    let items = null;
    try {
        const snap = await getDoc(doc(db, "settings", "store"));
        if (snap.exists() && Array.isArray(snap.data().items)) {
            const remote = snap.data().items;
            const existingIds = new Set(remote.map(i => i && i.id));
            const missingDefaults = DEFAULT_STORE_ITEMS.filter(d => !existingIds.has(d.id));
            items = [...remote, ...missingDefaults];
        }
    } catch (e) { console.warn('Mağaza kataloğu okunamadı', e); }
    if (!items) items = [...DEFAULT_STORE_ITEMS];
    lsSet(STORE_CACHE_KEY, { t: Date.now(), items });
    cacheSet('store_items', items, 30 * 60 * 1000);
    return items;
}
export function setStoreCache(items) {
    lsSet(STORE_CACHE_KEY, { t: Date.now(), items });
    cacheSet('store_items', items, 30 * 60 * 1000);
}
export function invalidateStoreCache() {
    try { localStorage.removeItem(STORE_CACHE_KEY); } catch (e) {}
    cacheInvalidate('store_items');
}

// ---------------------------------------------------------------------
// 5.5) Kampüs Akışı (Dikey akış) — settings/feed TEK DOKÜMAN (1 okuma)
//      Şema: { items: [ {
//          id, category: 'haber'|'bilgi'|'mizah',
//          title, content, theme, icon, badge, imageUrl, linkUrl, linkText,
//          likes, createdAt (ms timestamp), active: bool, pinned: bool
//      } ], rawPayload (isteğe bağlı tek-string yedek), updatedAt }
// ---------------------------------------------------------------------
export const FEED_CATEGORIES = {
    haber: { label: 'Haber', icon: 'fa-newspaper',          color: 'text-rose-300', bg: 'bg-rose-500/20', border: 'border-rose-400/40', gradient: 'from-rose-600 to-pink-600' },
    bilgi: { label: 'Bilgi', icon: 'fa-circle-info',        color: 'text-cyan-300', bg: 'bg-cyan-500/20', border: 'border-cyan-400/40', gradient: 'from-cyan-500 to-blue-600' },
    mizah: { label: 'Mizah', icon: 'fa-face-laugh-squint',  color: 'text-pink-300', bg: 'bg-pink-500/20', border: 'border-pink-400/40', gradient: 'from-pink-500 to-fuchsia-600' }
};

export const FEED_THEMES = {
    sunset:  { label: 'Gün Batımı (Pembe-Turuncu)', bg: 'from-rose-950 via-purple-950 to-slate-950', accent: 'rose',   glow: 'rgba(244,63,94,0.32)' },
    ocean:   { label: 'Okyanus (Mavi-Turkuaz)',     bg: 'from-cyan-950 via-blue-950 to-slate-950',   accent: 'cyan',   glow: 'rgba(6,182,212,0.32)' },
    aurora:  { label: 'Kuzey Işıkları (Zümrüt-Mor)',bg: 'from-emerald-950 via-teal-950 to-slate-950',accent: 'emerald',glow: 'rgba(16,185,129,0.32)' },
    galaxy:  { label: 'Galaksi (Mor-İndigo)',       bg: 'from-purple-950 via-indigo-950 to-slate-950',accent: 'purple', glow: 'rgba(168,85,247,0.35)' },
    ember:   { label: 'Kor Ateş (Kırmızı-Kehribar)',bg: 'from-amber-950 via-red-950 to-slate-950',   accent: 'amber',  glow: 'rgba(245,158,11,0.32)' },
    midnight:{ label: 'Gece Kampüsü (Koyu İndigo)', bg: 'from-slate-900 via-indigo-950 to-slate-950',accent: 'indigo', glow: 'rgba(99,102,241,0.32)' }
};

const NOW_REF = Date.now();
export const DEFAULT_FEED_ITEMS = [
    {
        id: 'fd_welcome_feed',
        category: 'haber',
        title: 'Kampüs Akışı Yayında! Kaydırmaya Başla 🚀',
        content: 'Üni Portal\'ın yeni dikey akış bölümüne hoş geldin! Aşağı kaydırdıkça kampüsten anlık haberler, öğrenci bilgileri ve eğlenceli paylaşımlar karşında. Üstelik akışta kaydırarak vakit geçirdikçe sürpriz **Coin & XP** kazanırsın!',
        theme: 'galaxy',
        icon: 'fa-clapperboard',
        badge: 'YENİ ÖZELLİK',
        imageUrl: '',
        linkUrl: '/portal/forum.html',
        linkText: 'Forumda Fikrini Paylaş',
        likes: 128,
        createdAt: NOW_REF - 18 * 60 * 1000, // 18 dk önce
        active: true,
        pinned: true
    },
    {
        id: 'fd_library_night',
        category: 'bilgi',
        title: 'Merkez Kütüphane Gece Nöbeti Başladı ☕📚',
        content: 'Vize ve final haftası yaklaşırken kütüphanede 7/24 çalışma salonları dolmaya başladı. Gece 01:00\'de ücretsiz çay & kahve ikramı noktalarını kaçırmayın! Çalışma arkadaşı arıyorsan forumdaki **Ders Notları** kategorisine göz at.',
        theme: 'midnight',
        icon: 'fa-mug-hot',
        badge: 'KAMPÜS BİLGİ',
        imageUrl: '',
        linkUrl: '/portal/forum.html',
        linkText: 'Çalışma Arkadaşı Bul',
        likes: 94,
        createdAt: NOW_REF - 42 * 60 * 1000, // 42 dk önce
        active: true,
        pinned: false
    },
    {
        id: 'fd_burs_duyuru',
        category: 'haber',
        title: 'Teknoloji & İnovasyon Öğrenci Bursu Başvuruları Açıldı 🎓',
        content: 'Mühendislik, temel bilimler ve sosyal bilimler öğrencileri için aylık geri ödemesiz eğitim desteği başvuruları bu hafta sonuna kadar devam ediyor. Detaylı başvuru şartları ve yönlendirme bağlantısı **İlanlar & Duyurular** sayfasında!',
        theme: 'ocean',
        icon: 'fa-graduation-cap',
        badge: 'ÖNEMLİ HABER',
        imageUrl: '',
        linkUrl: '/portal/ilanlar.html',
        linkText: 'Duyuruyu İncele',
        likes: 215,
        createdAt: NOW_REF - 2 * 60 * 60 * 1000, // 2 sa önce
        active: true,
        pinned: false
    },
    {
        id: 'fd_tip_coin',
        category: 'bilgi',
        title: 'Günde 2 Dakikada Ekstra Coin Kazanma Sırrı 💡',
        content: 'Sağ üstteki profil menünden **Günlük Ödül** serini bozmadan 7. güne ulaşırsan tek seferde **+20 Coin & +30 XP** kaparsın! Üstüne **Oyunlar** sayfasındaki günlük Kelime, Bayrak ve Hızlı Matematik oyunlarını oynayarak mağazadaki çerçeveleri hemen alabilirsin.',
        theme: 'ember',
        icon: 'fa-coins',
        badge: 'PRATİK BİLGİ',
        imageUrl: '',
        linkUrl: '/portal/oyunlar.html',
        linkText: 'Oyunlara Git & Kazan',
        likes: 163,
        createdAt: NOW_REF - 4 * 60 * 60 * 1000, // 4 sa önce
        active: true,
        pinned: false
    },
    {
        id: 'fd_event_fest',
        category: 'haber',
        title: 'Bahar Şenliği & Kampüs Sahnesi Takvimi Netleşiyor 🎸🔥',
        content: 'Müzik, Tiyatro ve Dans topluluklarının ortaklaşa hazırladığı kampüs sahnesi için geri sayım başladı! Hangi kulübün hangi gün sahne alacağını görmek ve kendi kulübünün etkinliğini takvime eklemek için **Topluluklar** vitrinine uğra.',
        theme: 'sunset',
        icon: 'fa-guitar',
        badge: 'ETKİNLİK HABERİ',
        imageUrl: '',
        linkUrl: '/portal/topluluk.html',
        linkText: 'Etkinlik Takvimine Bak',
        likes: 187,
        createdAt: NOW_REF - 7 * 60 * 60 * 1000, // 7 sa önce
        active: true,
        pinned: false
    },
    {
        id: 'fd_second_hand',
        category: 'bilgi',
        title: 'Dönem Sonu Kitap ve Ders Notlarını Nakite Çevir 📦',
        content: 'Artık işine yaramayan ders kitaplarını, hesap makineni veya laboratuvar malzemelerini çöpe atma! **Öğrenci İlanları** bölümünde ücretsiz ilan vererek alt sınıftaki öğrencilere ulaştırabilir ya da ücretsiz ders notu paylaşabilirsin.',
        theme: 'aurora',
        icon: 'fa-bag-shopping',
        badge: 'DAYANIŞMA',
        imageUrl: '',
        linkUrl: '/portal/ilanlar.html',
        linkText: 'Hemen İlan Ver',
        likes: 112,
        createdAt: NOW_REF - 14 * 60 * 60 * 1000, // 14 sa önce
        active: true,
        pinned: false
    },
    {
        id: 'fd_humor_vize',
        category: 'mizah',
        title: 'Hocanın "Sınavda Sadece İşlediğimiz Yerlerden Çıkacak" Demesi 😂',
        content: 'Slaytta 12 sayfa olan konunun sınavda 4 farklı makaleden sentezlenmiş soruya dönüşmesi şoku... Senin bölümde de durumlar aynı mı? Forumda en komik sınav anılarını konuşuyoruz, gel içini dök!',
        theme: 'sunset',
        icon: 'fa-face-laugh-tears',
        badge: 'GÜNÜN MİZAHI',
        imageUrl: '',
        linkUrl: '/portal/forum.html',
        linkText: 'Sohbete Katıl',
        likes: 342,
        createdAt: NOW_REF - 22 * 60 * 60 * 1000, // 22 sa önce
        active: true,
        pinned: false
    },
    {
        id: 'fd_cosmetic_store',
        category: 'haber',
        title: 'Mağazaya Yeni Kozmetik Çerçeveler ve Sponsor Kuponları Eklendi ✨',
        content: 'Kazandığın coinlerle profil fotoğrafına **Güneş Patlaması**, **Kutup Buzulu** veya **Ametist Kristali** çerçevesi takabilir; isminin yanına **Gece Nöbetçisi** unvanı ekleyebilirsin. Üstelik gerçek fotokopi ve kahve indirim kuponları da mağazada!',
        theme: 'galaxy',
        icon: 'fa-store',
        badge: 'MAĞAZA VİTRİNİ',
        imageUrl: '',
        linkUrl: '/portal/magaza.html',
        linkText: 'Mağazayı Keşfet',
        likes: 149,
        createdAt: NOW_REF - 28 * 60 * 60 * 1000, // 1 gün önce
        active: true,
        pinned: false
    }
];

const FEED_CACHE_KEY = 'up_feed_v2';
const FEED_CACHE_TTL = 10 * 60 * 1000; // 10 dk localStorage önbellek (0 ekstra okuma)

const LEGACY_CATEGORY_MAP = {
    haber: 'haber',
    guncelleme: 'haber',
    olay: 'haber',
    bilgi: 'bilgi',
    bilgilendirme: 'bilgi',
    ipucu: 'bilgi',
    durum: 'bilgi',
    mizah: 'mizah',
    eglence: 'mizah'
};

export function normalizeFeedItems(rawData) {
    if (!rawData) return null;
    let list = null;
    if (Array.isArray(rawData)) {
        list = rawData;
    } else if (Array.isArray(rawData.items)) {
        list = rawData.items;
    } else if (typeof rawData.rawPayload === 'string' && rawData.rawPayload.trim()) {
        try { list = JSON.parse(rawData.rawPayload); } catch (_) {}
    } else if (typeof rawData.payload === 'string' && rawData.payload.trim()) {
        try { list = JSON.parse(rawData.payload); } catch (_) {}
    }
    if (!Array.isArray(list) || list.length === 0) return null;
    return list.map((item, idx) => {
        let ts = item.createdAt;
        if (ts && typeof ts.toMillis === 'function') ts = ts.toMillis();
        else if (ts && typeof ts.seconds === 'number') ts = ts.seconds * 1000;
        else if (typeof ts === 'string') { const p = Date.parse(ts); ts = isNaN(p) ? Date.now() : p; }
        else if (typeof ts !== 'number' || isNaN(ts)) ts = Date.now() - idx * 60000;
        const mappedCat = LEGACY_CATEGORY_MAP[item.category] || 'haber';
        return {
            id: String(item.id || ('fd_' + idx + '_' + ts)),
            category: FEED_CATEGORIES[mappedCat] ? mappedCat : 'haber',
            title: String(item.title || 'Kampüs Güncellemesi').trim(),
            content: String(item.content || '').trim(),
            author: String(item.author || 'Üni Portal').trim(),
            theme: FEED_THEMES[item.theme] ? item.theme : 'galaxy',
            icon: String(item.icon || FEED_CATEGORIES[mappedCat]?.icon || 'fa-bolt').trim(),
            badge: String(item.badge || '').trim(),
            imageUrl: String(item.imageUrl || '').trim(),
            linkUrl: String(item.linkUrl || '').trim(),
            linkText: String(item.linkText || 'İncele').trim(),
            likes: Math.max(0, parseInt(item.likes, 10) || 0),
            createdAt: ts,
            active: item.active !== false,
            pinned: Boolean(item.pinned)
        };
    });
}

/**
 * Kampüs Akışı gönderilerini TEK BİR OKUMA (getDoc(doc(db, "settings", "feed"))) ile çeker.
 * Önbellekte taze veri varsa 0 okuma yapar; force:true ile doğrudan 1 okuma yapar.
 */
export async function getFeedItems(db, { force = false } = {}) {
    if (!force) {
        const cmCached = cacheGet('feed_items');
        if (Array.isArray(cmCached) && cmCached.length > 0) return cmCached;
        const cached = lsGet(FEED_CACHE_KEY);
        if (cached && Array.isArray(cached.items) && cached.items.length > 0 && (Date.now() - cached.t < FEED_CACHE_TTL)) {
            return cached.items;
        }
    }
    let items = null;
    try {
        const snap = await getDoc(doc(db, "settings", "feed"));
        if (snap.exists()) {
            items = normalizeFeedItems(snap.data());
        }
    } catch (e) { console.warn('Akış verisi okunamadı, varsayılan akış kullanılıyor:', e); }
    if (!items || items.length === 0) {
        items = normalizeFeedItems(DEFAULT_FEED_ITEMS);
    }
    lsSet(FEED_CACHE_KEY, { t: Date.now(), items });
    cacheSet('feed_items', items, FEED_CACHE_TTL);
    return items;
}

export function setFeedCache(items) {
    const normalized = normalizeFeedItems(items) || [];
    lsSet(FEED_CACHE_KEY, { t: Date.now(), items: normalized });
    cacheSet('feed_items', normalized, FEED_CACHE_TTL);
}

export function invalidateFeedCache() {
    try { localStorage.removeItem(FEED_CACHE_KEY); } catch (e) {}
    cacheInvalidate('feed_items');
}

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
.frame-ruby{box-shadow:0 0 0 2px #e11d48,0 0 0 4px rgba(251,113,133,.35),0 0 20px rgba(225,29,72,.75) !important;animation:upRuby 2.2s ease-in-out infinite;}
@keyframes upRuby{0%,100%{box-shadow:0 0 0 2px #be123c,0 0 14px rgba(225,29,72,.6);}50%{box-shadow:0 0 0 3px #fb7185,0 0 24px rgba(244,63,94,.85);}}
.frame-aurora{box-shadow:0 0 0 2px #2dd4bf,0 0 0 4px rgba(139,92,246,.35),0 0 22px rgba(45,212,191,.7) !important;animation:upAurora 4s ease-in-out infinite;}
@keyframes upAurora{0%,100%{box-shadow:0 0 0 2px #2dd4bf,0 0 18px rgba(45,212,191,.65);}50%{box-shadow:0 0 0 3px #818cf8,0 0 24px rgba(167,139,250,.75);}}
.frame-obsidian{box-shadow:0 0 0 2px #94a3b8,0 0 0 4px rgba(15,23,42,.9),0 0 18px rgba(148,163,184,.55) !important;}
.frame-sakura{box-shadow:0 0 0 2px #f9a8d4,0 0 0 4px rgba(253,242,248,.35),0 0 18px rgba(244,114,182,.65) !important;animation:upSakura 3s ease-in-out infinite;}
@keyframes upSakura{0%,100%{box-shadow:0 0 0 2px #f472b6,0 0 12px rgba(249,168,212,.55);}50%{box-shadow:0 0 0 3px #fbcfe8,0 0 22px rgba(244,114,182,.8);}}
.frame-diamond{box-shadow:0 0 0 2px #ffffff,0 0 0 4px rgba(125,211,252,.55),0 0 24px rgba(255,255,255,.8),0 0 34px rgba(56,189,248,.5) !important;animation:upDiamond 2.6s ease-in-out infinite;}
@keyframes upDiamond{0%,100%{box-shadow:0 0 0 2px #e0f2fe,0 0 16px rgba(255,255,255,.65);}50%{box-shadow:0 0 0 3px #ffffff,0 0 28px rgba(186,230,253,.95);}}

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
.title-amber{color:#fed7aa;background:rgba(249,115,22,.18);border-color:rgba(251,146,60,.5);box-shadow:0 0 10px rgba(249,115,22,.35);}
.title-cyber{color:#fef08a;background:linear-gradient(90deg,rgba(232,121,249,.28),rgba(250,204,21,.22));border-color:rgba(232,121,249,.55);box-shadow:0 0 10px rgba(232,121,249,.4);}
.title-aurora{color:#ccfbf1;background:linear-gradient(90deg,rgba(20,184,166,.28),rgba(99,102,241,.28));border-color:rgba(45,212,191,.5);box-shadow:0 0 10px rgba(45,212,191,.35);}
.title-obsidian{color:#e2e8f0;background:linear-gradient(135deg,#0f172a,#1e293b);border-color:rgba(148,163,184,.5);box-shadow:0 0 10px rgba(148,163,184,.3);}
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

/* ---------- Skeleton Loading & Shimmer ---------- */
.skeleton {
    background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 0.5rem;
}
@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
.skeleton-text { height: 0.75rem; border-radius: 0.375rem; }
.skeleton-avatar { width: 2.5rem; height: 2.5rem; border-radius: 9999px; flex-shrink: 0; }
.skeleton-card { background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(51, 65, 85, 0.7); border-radius: 1rem; padding: 1.25rem; }

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
    registerServiceWorker();
    if (uid && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        requestNotificationPermission(uid, streakCtx.db);
    }
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

// ---------------------------------------------------------------------
// 10) PWA Service Worker + FCM Push Bildirim Yardımcıları (Özellik 2)
// ---------------------------------------------------------------------
// VAPID Key: Firebase Console -> Proje Ayarları -> Cloud Messaging -> Web Push Sertifikaları (Key pair) kısmından alınır.
const FCM_VAPID_KEY = "BURAYA_DOLDUR";
let _swRegistrationPromise = null;
let _foregroundNotifBound = false;

export async function registerServiceWorker() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
    if (_swRegistrationPromise) return _swRegistrationPromise;
    _swRegistrationPromise = navigator.serviceWorker
        .register('/portal/sw.js', { scope: '/portal/' })
        .catch(() => null);
    return _swRegistrationPromise;
}

export async function saveFcmToken(uid, token, dbInstance = null) {
    const targetDb = dbInstance || streakCtx.db;
    if (!uid || !token || !targetDb) return false;
    try {
        await updateDoc(doc(targetDb, "users", uid), {
            fcmTokens: arrayUnion(token)
        });
        return true;
    } catch (e) {
        return false;
    }
}

export async function requestNotificationPermission(uid = null, dbInstance = null) {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
        return null;
    }
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return null;

        const swReg = await registerServiceWorker();
        if (!swReg || !FCM_VAPID_KEY || FCM_VAPID_KEY === "BURAYA_DOLDUR") {
            return null;
        }

        const { getMessaging, getToken, isSupported } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js");
        if (!(await isSupported())) return null;

        const messaging = getMessaging();
        const token = await getToken(messaging, {
            vapidKey: FCM_VAPID_KEY,
            serviceWorkerRegistration: swReg
        });

        const targetUid = uid || streakCtx.uid;
        if (token && targetUid) {
            await saveFcmToken(targetUid, token, dbInstance);
        }
        await setupForegroundNotifications();
        return token || null;
    } catch (e) {
        return null;
    }
}

export async function setupForegroundNotifications() {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (_foregroundNotifBound) return;
    try {
        const { getMessaging, onMessage, isSupported } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js");
        if (!(await isSupported())) return;
        const messaging = getMessaging();
        onMessage(messaging, (payload) => {
            const title = payload?.notification?.title || payload?.data?.title || 'Yeni Bildirim';
            const body = payload?.notification?.body || payload?.data?.body || '';
            const msg = body ? `${title}: ${body}` : title;
            if (typeof window.showToast === 'function') {
                window.showToast(escapeHtml(msg), 'info');
            }
        });
        _foregroundNotifBound = true;
    } catch (e) {}
}

if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
    window.safeUrl = safeUrl;
    window.registerServiceWorker = registerServiceWorker;
    window.requestNotificationPermission = requestNotificationPermission;
    window.saveFcmToken = saveFcmToken;
    window.setupForegroundNotifications = setupForegroundNotifications;
}

// ---------------------------------------------------------------------
// 11) SKELETON LOADING STİLLERİ VE YARDIMCILARI (Özellik 3)
// ---------------------------------------------------------------------
const SKELETON_CSS = `
@keyframes upSkeletonShimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}
.skeleton {
    background: linear-gradient(90deg, rgba(30, 41, 59, 0.75) 25%, rgba(51, 65, 85, 0.9) 50%, rgba(30, 41, 59, 0.75) 75%);
    background-size: 200% 100%;
    animation: upSkeletonShimmer 1.6s ease-in-out infinite;
    border-radius: 0.5rem;
}
@media (prefers-color-scheme: light) {
    .skeleton-light-auto {
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
    }
}
.skeleton-text {
    height: 0.75rem;
    width: 100%;
    border-radius: 0.375rem;
}
.skeleton-avatar {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    flex-shrink: 0;
}
.skeleton-card {
    background-color: rgba(30, 41, 59, 0.65);
    border: 1px solid rgba(51, 65, 85, 0.7);
    border-radius: 1rem;
    padding: 1rem;
}
`;

export function injectSkeletonStyles() {
    if (typeof document === 'undefined' || document.getElementById('portal-skeleton-styles')) return;
    const style = document.createElement('style');
    style.id = 'portal-skeleton-styles';
    style.textContent = SKELETON_CSS;
    document.head.appendChild(style);
}
injectSkeletonStyles();

export function skeletonCard() {
    return `
        <div class="skeleton-card space-y-3">
            <div class="flex items-center space-x-3">
                <div class="skeleton skeleton-avatar"></div>
                <div class="flex-1 space-y-2">
                    <div class="skeleton skeleton-text w-1/3"></div>
                    <div class="skeleton skeleton-text w-1/4" style="height:0.55rem"></div>
                </div>
            </div>
            <div class="space-y-2">
                <div class="skeleton skeleton-text w-3/4"></div>
                <div class="skeleton skeleton-text w-full"></div>
            </div>
        </div>
    `;
}

export function skeletonList(n = 3) {
    const count = Math.max(1, Number(n) || 3);
    return Array.from({ length: count }, () => skeletonCard()).join('');
}

export function skeletonGrid(n = 3) {
    const count = Math.max(1, Number(n) || 3);
    return `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 col-span-full">${Array.from({ length: count }, () => skeletonCard()).join('')}</div>`;
}

if (typeof window !== 'undefined') {
    window.injectSkeletonStyles = injectSkeletonStyles;
    window.skeletonCard = skeletonCard;
    window.skeletonList = skeletonList;
    window.skeletonGrid = skeletonGrid;
}

// ---------------------------------------------------------------------
// 12) LOCALSTORAGE CACHE MANAGER (5 DK VARSAYILAN TTL) (Özellik 4)
// ---------------------------------------------------------------------
const CACHE_PREFIX = 'uniportal_cache_';
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 dk

export function cacheGet(key) {
    if (typeof localStorage === 'undefined' || !key) return null;
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.ts !== 'number' || typeof parsed.ttl !== 'number') {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        if (Date.now() - parsed.ts > parsed.ttl) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return parsed.data !== undefined ? parsed.data : null;
    } catch (e) {
        try { localStorage.removeItem(CACHE_PREFIX + key); } catch (_) {}
        return null;
    }
}

export function cacheSet(key, data, ttlMs = DEFAULT_CACHE_TTL) {
    if (typeof localStorage === 'undefined' || !key) return false;
    const payload = JSON.stringify({
        data,
        ts: Date.now(),
        ttl: Number(ttlMs) > 0 ? Number(ttlMs) : DEFAULT_CACHE_TTL
    });
    try {
        localStorage.setItem(CACHE_PREFIX + key, payload);
        return true;
    } catch (e) {
        // QuotaExceededError durumunda süresi geçmiş veya mevcut önbellekleri temizleyip tekrar dene
        try {
            cacheCleanup(true);
            localStorage.setItem(CACHE_PREFIX + key, payload);
            return true;
        } catch (_) {
            return false;
        }
    }
}

export function cacheInvalidate(key) {
    if (typeof localStorage === 'undefined' || !key) return;
    try { localStorage.removeItem(CACHE_PREFIX + key); } catch (e) {}
}

export function cacheInvalidatePrefix(prefix = '') {
    if (typeof localStorage === 'undefined') return 0;
    let removed = 0;
    try {
        const targetPrefix = CACHE_PREFIX + prefix;
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(targetPrefix)) keysToRemove.push(k);
        }
        keysToRemove.forEach(k => {
            localStorage.removeItem(k);
            removed++;
        });
    } catch (e) {}
    return removed;
}

export function cacheCleanup(forceRemoveOldest = false) {
    if (typeof localStorage === 'undefined') return 0;
    let cleaned = 0;
    try {
        const now = Date.now();
        const entries = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith(CACHE_PREFIX)) continue;
            try {
                const raw = localStorage.getItem(k);
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed.ts !== 'number' || typeof parsed.ttl !== 'number' || (now - parsed.ts > parsed.ttl)) {
                    entries.push({ key: k, expired: true, ts: 0 });
                } else {
                    entries.push({ key: k, expired: false, ts: parsed.ts });
                }
            } catch (_) {
                entries.push({ key: k, expired: true, ts: 0 });
            }
        }
        entries.filter(e => e.expired).forEach(e => {
            localStorage.removeItem(e.key);
            cleaned++;
        });
        if (forceRemoveOldest && cleaned === 0 && entries.length > 0) {
            entries.sort((a, b) => a.ts - b.ts);
            const half = Math.max(1, Math.ceil(entries.length / 2));
            for (let i = 0; i < half; i++) {
                localStorage.removeItem(entries[i].key);
                cleaned++;
            }
        }
    } catch (e) {}
    return cleaned;
}

export function getCacheStats() {
    if (typeof localStorage === 'undefined') return { count: 0, bytes: 0 };
    let count = 0;
    let bytes = 0;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(CACHE_PREFIX)) {
                count++;
                const val = localStorage.getItem(k) || '';
                bytes += (k.length + val.length) * 2;
            }
        }
    } catch (e) {}
    return { count, bytes };
}

export const CacheManager = {
    get: cacheGet,
    set: cacheSet,
    invalidate: cacheInvalidate,
    invalidatePrefix: cacheInvalidatePrefix,
    cleanup: cacheCleanup,
    stats: getCacheStats
};

cacheCleanup();

if (typeof window !== 'undefined') {
    window.CacheManager = CacheManager;
    window.cacheGet = cacheGet;
    window.cacheSet = cacheSet;
    window.cacheInvalidate = cacheInvalidate;
    window.cacheInvalidatePrefix = cacheInvalidatePrefix;
    window.cacheCleanup = cacheCleanup;
    window.getCacheStats = getCacheStats;
}





// ═══════════════════════════════════════════════════════════
//  PWA KURULUM (Ana Ekrana Ekle) — Firebase okuma/yazma: 0
//  Buton profil menüsüne (#user-dropdown) eklenir.
// ═══════════════════════════════════════════════════════════
let _deferredInstallPrompt = null;

function _pwaIsStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function _pwaDetect() {
    const ua = navigator.userAgent || '';
    const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const android = /android/i.test(ua);
    const crios = /CriOS/i.test(ua), fxios = /FxiOS/i.test(ua), edgios = /EdgiOS/i.test(ua), opios = /OPiOS/i.test(ua);
    let browser = 'other';
    if (/SamsungBrowser/i.test(ua)) browser = 'samsung';
    else if (/Edg(e|A|iOS)?\//i.test(ua)) browser = 'edge';
    else if (/OPR\/|Opera|OPiOS/i.test(ua)) browser = 'opera';
    else if (/Firefox|FxiOS/i.test(ua)) browser = 'firefox';
    else if (/Chrome|CriOS/i.test(ua)) browser = 'chrome';
    else if (/Safari/i.test(ua)) browser = 'safari';
    const iosSafari = ios && browser === 'safari' && !crios && !fxios && !edgios && !opios;
    const inapp = /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|BytedanceWebview|musical_ly|TikTok|Snapchat|LinkedInApp|Twitter|Line\/|; wv\)/i.test(ua);
    return { ios, android, browser, iosSafari, inapp, desktop: !ios && !android };
}
function _pwaEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
}
function _pwaIcon(cls) { return _pwaEl('i', cls); }

async function _pwaCopy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) {}
    try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
    } catch (_) { return false; }
}

// steps: [{icon, title, text}] — actions: [{label, icon, primary, onClick(btn)}]
function _pwaShowModal({ title, subtitle, steps = [], actions = [], note }) {
    const old = document.getElementById('pwaInstallModal');
    if (old) old.remove();
    const overlay = _pwaEl('div', 'fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4');
    overlay.id = 'pwaInstallModal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100%;height:100dvh;display:flex;align-items:center;justify-content:center;';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    const box = _pwaEl('div', 'bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-5 text-slate-200 max-h-[85vh] overflow-y-auto');

    const head = _pwaEl('div', 'flex items-start justify-between mb-4 gap-3');
    const hl = _pwaEl('div', 'flex items-center gap-3');
    const logo = _pwaEl('div', 'w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0');
    logo.appendChild(_pwaIcon('fa-solid fa-graduation-cap text-white text-lg'));
    const ht = _pwaEl('div');
    ht.appendChild(_pwaEl('h3', 'font-bold text-white text-base leading-tight', title));
    if (subtitle) ht.appendChild(_pwaEl('p', 'text-xs text-slate-400 mt-0.5', subtitle));
    hl.appendChild(logo); hl.appendChild(ht);
    const close = _pwaEl('button', 'text-slate-400 hover:text-white w-8 h-8 shrink-0 rounded-lg hover:bg-slate-700 transition', '✕');
    close.type = 'button'; close.setAttribute('aria-label', 'Kapat');
    head.appendChild(hl); head.appendChild(close);
    box.appendChild(head);

    steps.forEach((s, i) => {
        const row = _pwaEl('div', 'flex items-start gap-3 bg-slate-900/60 border border-slate-700 rounded-xl p-3 mb-2');
        row.appendChild(_pwaEl('span', 'w-6 h-6 shrink-0 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-bold mt-0.5', String(i + 1)));
        const body = _pwaEl('div', 'flex-1 min-w-0');
        body.appendChild(_pwaEl('p', 'text-sm font-semibold text-white', s.title));
        if (s.text) body.appendChild(_pwaEl('p', 'text-xs text-slate-400 mt-0.5', s.text));
        row.appendChild(body);
        const ic = _pwaEl('div', 'w-9 h-9 shrink-0 rounded-lg bg-slate-700/70 flex items-center justify-center text-blue-300');
        ic.appendChild(_pwaIcon(s.icon || 'fa-solid fa-circle'));
        row.appendChild(ic);
        box.appendChild(row);
    });

    if (note) box.appendChild(_pwaEl('p', 'text-[11px] text-slate-500 mt-2 mb-1', note));

    const hide = () => overlay.remove();
    actions.forEach((a) => {
        const b = _pwaEl('button', (a.primary
            ? 'bg-blue-600 hover:bg-blue-500 text-white'
            : 'bg-slate-700 hover:bg-slate-600 text-slate-100') +
            ' mt-2 w-full py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2');
        b.type = 'button';
        if (a.icon) b.appendChild(_pwaIcon(a.icon));
        const sp = _pwaEl('span', '', a.label);
        b.appendChild(sp);
        b.addEventListener('click', async () => {
            try { await a.onClick({ btn: b, label: sp, hide }); } catch (e) { console.warn('PWA action:', e); }
        });
        box.appendChild(b);
    });
    const ok = _pwaEl('button', 'mt-2 w-full py-2 rounded-xl text-slate-400 hover:text-white text-xs transition', 'Kapat');
    ok.type = 'button';
    box.appendChild(ok);

    overlay.appendChild(box);
    close.addEventListener('click', hide);
    ok.addEventListener('click', hide);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { hide(); document.removeEventListener('keydown', esc); }
    });
    document.body.appendChild(overlay);
}

function _pwaCopyAction() {
    return {
        label: 'Bağlantıyı Kopyala', icon: 'fa-solid fa-copy',
        onClick: async ({ label }) => {
            const ok = await _pwaCopy(location.origin + '/portal/index.html');
            label.textContent = ok ? 'Kopyalandı ✓' : 'Kopyalanamadı — adresi elle kopyala';
        }
    };
}

function _pwaShowInstructions(env) {
    const portalUrl = location.origin + '/portal/index.html';
    if (env.inapp) { _pwaShowInAppModal(env); return; }
    if (env.ios) {
        if (!env.iosSafari) {
            _pwaShowModal({
                title: 'Safari ile Aç', subtitle: 'iOS\'ta yükleme yalnızca Safari\'den yapılır',
                steps: [
                    { icon: 'fa-solid fa-copy', title: 'Bağlantıyı kopyala', text: 'Aşağıdaki butonla adresi kopyala.' },
                    { icon: 'fa-brands fa-safari', title: 'Safari\'yi aç ve yapıştır', text: 'Adres çubuğuna yapıştırıp git.' },
                    { icon: 'fa-solid fa-arrow-up-from-bracket', title: 'Paylaş → Ana Ekrana Ekle', text: 'Safari\'de bu menüden ekle.' }
                ],
                actions: [Object.assign(_pwaCopyAction(), { primary: true })]
            });
            return;
        }
        const actions = [];
        if (navigator.share) {
            actions.push({
                label: 'Paylaş Menüsünü Aç', icon: 'fa-solid fa-arrow-up-from-bracket', primary: true,
                onClick: async () => { try { await navigator.share({ title: 'Üni Portal', url: portalUrl }); } catch (_) {} }
            });
        }
        _pwaShowModal({
            title: 'Ana Ekrana Ekle', subtitle: 'iPhone / iPad · Safari',
            steps: [
                { icon: 'fa-solid fa-arrow-up-from-bracket', title: 'Paylaş (↑) simgesine dokun', text: 'Safari\'nin alt çubuğunda (iPad\'de üstte) bulunur.' },
                { icon: 'fa-solid fa-square-plus', title: '"Ana Ekrana Ekle" seç', text: 'Listeyi aşağı kaydırman gerekebilir.' },
                { icon: 'fa-solid fa-check', title: 'Sağ üstten "Ekle"ye dokun', text: 'Üni Portal ana ekranında uygulama olarak görünür.' }
            ],
            actions,
            note: 'İpucu: Paylaş menüsünü açma butonu sana bir kısayol sağlar; son adımları sistem kendisi sorar.'
        });
        return;
    }
    if (env.android) {
        const menu = { icon: 'fa-solid fa-ellipsis-vertical', title: 'Tarayıcı menüsünü aç (⋮)' };
        let third = 'Uygulamayı yükle / Ana ekrana ekle';
        if (env.browser === 'firefox') third = 'Yükle';
        if (env.browser === 'samsung') { menu.title = 'Menüyü aç (≡)'; third = 'Geçerli sayfayı ekle → Ana ekran'; }
        _pwaShowModal({
            title: 'Uygulamayı Yükle', subtitle: 'Android · ' + ({ chrome: 'Chrome', samsung: 'Samsung Internet', firefox: 'Firefox', edge: 'Edge', opera: 'Opera' }[env.browser] || 'Tarayıcı'),
            steps: [
                menu,
                { icon: 'fa-solid fa-mobile-screen', title: '"' + third + '" seçeneğine dokun', text: 'Bulamazsan sayfayı yenileyip birkaç saniye bekle.' },
                { icon: 'fa-solid fa-check', title: 'Onayla', text: 'Uygulama ana ekranına eklenir.' }
            ],
            actions: [_pwaCopyAction()]
        });
        return;
    }
    // Masaüstü
    let steps;
    if (env.browser === 'safari') {
        steps = [
            { icon: 'fa-solid fa-arrow-up-from-bracket', title: 'Paylaş düğmesine tıkla', text: 'Safari araç çubuğunda (macOS Sonoma+).' },
            { icon: 'fa-solid fa-square-plus', title: '"Dock\'a Ekle" seç' }
        ];
    } else if (env.browser === 'firefox') {
        steps = [
            { icon: 'fa-solid fa-circle-info', title: 'Firefox masaüstü PWA yüklemeyi desteklemez', text: 'Chrome veya Edge ile açarak yükleyebilirsin.' }
        ];
    } else {
        steps = [
            { icon: 'fa-solid fa-download', title: 'Adres çubuğunun sağındaki yükle simgesine tıkla', text: 'Görünmüyorsa menüden "Uygulamayı yükle / Üni Portal\'ı yükle"yi seç.' },
            { icon: 'fa-solid fa-check', title: '"Yükle"yi onayla' }
        ];
    }
    _pwaShowModal({ title: 'Uygulamayı Yükle', subtitle: 'Masaüstü', steps, actions: [_pwaCopyAction()] });
}



function _pwaShowInAppModal(env) {
    const actions = [];
    if (env.android) {
        const u = new URL(location.href);
        const intentUrl = 'intent://' + u.host + u.pathname + u.search + '#Intent;scheme=' + u.protocol.replace(':', '') + ';package=com.android.chrome;end';
        actions.push({
            label: 'Chrome\'da Aç', icon: 'fa-brands fa-chrome', primary: true,
            onClick: () => { location.href = intentUrl; }
        });
    }
    actions.push(Object.assign(_pwaCopyAction(), { primary: !env.android }));
    _pwaShowModal({
        title: 'Tarayıcıda Aç', subtitle: 'Uygulama içi tarayıcı yüklemeyi desteklemez',
        steps: [
            { icon: 'fa-solid fa-ellipsis', title: 'Sağ üst / alt menüyü aç (⋯ veya ⋮)', text: 'Bu sayfayı açtığın uygulamanın menüsü.' },
            { icon: 'fa-solid fa-up-right-from-square', title: '"Tarayıcıda Aç" seçeneğini seç', text: env.ios ? 'Safari ile açılmalı.' : 'Chrome ile açılması önerilir.' },
            { icon: 'fa-solid fa-download', title: 'Tam uygulama deneyimi için tekrar "Uygulamayı Yükle"ye dokun' }
        ],
        actions,
        note: 'Tek tıkla ana ekrana ekleme yalnızca Chrome / Safari gibi gerçek tarayıcılarda çalışır.'
    });
}

function _pwaToast(msg) {
    const t = _pwaEl('div', 'fixed top-4 left-1/2 -translate-x-1/2 z-[320] bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 max-w-[92vw]');
    t.appendChild(_pwaIcon('fa-solid fa-circle-check'));
    t.appendChild(_pwaEl('span', '', msg));
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

const _PWA_DISMISS_KEY = 'up_pwa_banner_dismissed';
const _PWA_DISMISS_MS = 3 * 24 * 60 * 60 * 1000;
function _pwaBannerDismissed() {
    try {
        if (sessionStorage.getItem('up_pwa_banner_shown')) return true;
        const ts = parseInt(localStorage.getItem(_PWA_DISMISS_KEY) || '0', 10);
        return ts && (Date.now() - ts) < _PWA_DISMISS_MS;
    } catch (_) { return false; }
}

export function initPwaInstall() {
    if (typeof window === 'undefined' || window.__pwaInstallInit) return;
    window.__pwaInstallInit = true;
    if (_pwaIsStandalone()) return; // Zaten uygulama olarak açıldı: hiçbir kurulum arayüzü yok
    const env = _pwaDetect();
    let installed = false;
    let bannerEl = null;
    let bannerTimerDone = false;

    // ── Profil menüsü öğesi ──
    const item = _pwaEl('button', 'pwa-install-item w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-700/60 flex items-center justify-between transition');
    item.type = 'button';
    const left = _pwaEl('span', 'flex items-center space-x-2');
    left.appendChild(_pwaIcon('fa-solid fa-download text-emerald-400'));
    left.appendChild(_pwaEl('span', '', 'Uygulamayı Yükle'));
    const badge = _pwaEl('span', 'hidden bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30', 'Hazır');
    item.appendChild(left); item.appendChild(badge);
    item.setAttribute('data-pwa-menu-item', '1');

    // Sayfadaki data-pwa-install-btn düğmeleri uygun cihazda görünür
    const eligible = () => !installed && (!!_deferredInstallPrompt || env.ios || env.android || env.inapp);
    const updateButtons = () => {
        document.querySelectorAll('[data-pwa-install-btn]').forEach(b => b.classList.toggle('hidden', !eligible()));
        badge.classList.toggle('hidden', !( _deferredInstallPrompt && !installed));
    };

    const mountItem = () => {
        const dd = document.getElementById('user-dropdown');
        if (dd) {
            const tanitim = dd.querySelector('a[href$="tanitim.html"]');
            const logout = Array.from(dd.querySelectorAll('button')).find(b => (b.getAttribute('onclick') || '').includes('googleLogout'));
            const anchor = logout ? logout.previousElementSibling : null;
            if (tanitim && tanitim.parentNode) tanitim.parentNode.insertBefore(item, tanitim);
            else if (logout && anchor && anchor.parentNode) anchor.parentNode.insertBefore(item, anchor);
            else dd.appendChild(item);
        }
        updateButtons();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountItem);
    else mountItem();

    // ── Tıklama mantığı ──
    const trigger = async () => {
        try { localStorage.setItem(_PWA_DISMISS_KEY, String(Date.now())); } catch (_) {}
        hideBanner();
        if (env.inapp) { _pwaShowInAppModal(env); return; }
        if (_deferredInstallPrompt) {
            const p = _deferredInstallPrompt;
            _deferredInstallPrompt = null;
            updateButtons();
            try {
                p.prompt();
                const choice = await p.userChoice;
                if (choice && choice.outcome === 'accepted') return; // appinstalled olayı arayüzü temizler
                hideBanner();
                _pwaShowModal({
                    title: 'Kurulum İptal Edildi', subtitle: 'İstediğin zaman tekrar deneyebilirsin',
                    steps: [{ icon: 'fa-solid fa-rotate-right', title: 'Sayfayı yenileyip tekrar "Uygulamayı Yükle"ye dokun' }]
                });
            } catch (err) { console.warn('PWA install:', err); _pwaShowInstructions(env); }
            return;
        }
        _pwaShowInstructions(env);
    };
    item.addEventListener('click', trigger);
    document.addEventListener('click', (e) => {
        const b = e.target.closest && e.target.closest('[data-pwa-install-btn]');
        if (b) { e.preventDefault(); trigger(); }
    });

    // ── Akıllı kurulum şeridi ──
    function hideBanner() { if (bannerEl) { clearInterval(bannerEl._pwaTimer); window.removeEventListener('resize', bannerEl._pwaReposition); bannerEl.remove(); bannerEl = null; } }
    function maybeShowBanner() {
        if (bannerEl || installed || !bannerTimerDone || !eligible() || _pwaBannerDismissed()) return;
        bannerEl = _pwaEl('div', 'fixed right-4 z-[140] max-w-[calc(100vw-2rem)]');
        // Sağ alttaki diğer baloncuğun (asistan) hemen üstüne, 8px boşlukla diz
        const reposition = () => {
            if (!bannerEl) return;
            const w = document.getElementById('assistant-widget');
            const vis = w && getComputedStyle(w).display !== 'none' && w.getBoundingClientRect().height > 0;
            let bottom = 16;
            let right = 16;
            if (vis) { const r = w.getBoundingClientRect(); bottom = Math.max(16, Math.round(window.innerHeight - r.top + 8)); right = Math.max(8, Math.round(window.innerWidth - r.right)); }
            bannerEl.style.right = right + 'px';
            bannerEl.style.bottom = 'calc(' + bottom + 'px + env(safe-area-inset-bottom, 0px))';
        };
        reposition();
        bannerEl._pwaTimer = setInterval(reposition, 500);
        bannerEl._pwaReposition = reposition;
        window.addEventListener('resize', reposition);
        if (!document.getElementById('pwa-banner-style')) {
            const st = document.createElement('style'); st.id = 'pwa-banner-style';
            st.textContent = '@keyframes pwaBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes pwaPulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.7),0 8px 20px rgba(0,0,0,.4)}50%{box-shadow:0 0 0 8px rgba(16,185,129,0),0 8px 24px rgba(0,0,0,.5)}}.pwa-pill{animation:pwaPulse 2.5s ease-in-out infinite}.pwa-pill:hover .pwa-ico{animation:pwaBounce .6s ease infinite}';
            document.head.appendChild(st);
        }
        const pill = _pwaEl('div', 'pwa-pill group cursor-pointer flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white pl-3 pr-4 py-2.5 rounded-full shadow-2xl border border-emerald-300/40 transition-all');
        pill.setAttribute('role', 'button');
        pill.setAttribute('tabindex', '0');
        pill.setAttribute('aria-label', 'Üni Portal\'ı Ana Ekrana Ekle');
        const ico = _pwaEl('span', 'pwa-ico w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0');
        ico.appendChild(_pwaIcon('fa-solid fa-graduation-cap text-sm text-white'));
        const txt = _pwaEl('span', 'text-left leading-tight min-w-0');
        txt.appendChild(_pwaEl('span', 'block text-[10px] font-extrabold tracking-wide', 'ÜNİ PORTAL\'I UYGULAMA OLARAK YÜKLE'));
        txt.appendChild(_pwaEl('span', 'block text-[9px] font-medium opacity-90', _deferredInstallPrompt ? 'Tek dokunuşla hızlı kurulum' : 'Nasıl yükleneceğini görmek için tıkla'));
        pill.appendChild(ico); pill.appendChild(txt);
        pill.appendChild(_pwaIcon('fa-solid fa-arrow-right text-[10px] opacity-80 group-hover:translate-x-0.5 transition'));
        pill.addEventListener('click', () => { trigger(); });
        pill.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); trigger(); } });
        const x = _pwaEl('button', 'absolute -top-2 -right-2 z-10 w-6 h-6 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-full flex items-center justify-center text-[10px] border border-slate-600 hover:border-red-500 shadow-lg transition');
        x.type = 'button'; x.setAttribute('aria-label', 'Kapat');
        x.appendChild(_pwaIcon('fa-solid fa-xmark'));
        x.addEventListener('click', (ev) => {
            ev.stopPropagation();
            try { localStorage.setItem(_PWA_DISMISS_KEY, String(Date.now())); } catch (_) {}
            hideBanner();
        });
        const holder = _pwaEl('div', 'relative');
        holder.appendChild(pill); holder.appendChild(x);
        bannerEl.appendChild(holder);
        document.body.appendChild(bannerEl);
        try { sessionStorage.setItem('up_pwa_banner_shown', '1'); } catch (_) {}
    }
    setTimeout(() => { bannerTimerDone = true; maybeShowBanner(); }, 3000);

    // ── Olaylar ──
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        _deferredInstallPrompt = e;
        updateButtons();
        maybeShowBanner();
    });
    window.addEventListener('appinstalled', () => {
        installed = true;
        _deferredInstallPrompt = null;
        hideBanner();
        item.remove();
        updateButtons();
        const m = document.getElementById('pwaInstallModal'); if (m) m.remove();
        _pwaToast('Üni Portal ana ekranına eklendi 🎉');
    });
}

if (typeof window !== 'undefined') {
    window.initPwaInstall = initPwaInstall;
    initPwaInstall();
}
