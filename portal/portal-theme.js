(function () {
    var THEME_KEY = 'portal_theme';
    var saved = 'dark';
    try { saved = localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) {}
    if (saved === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    var THEME_CSS = [
        '/* ===================================================================== */',
        '/* 1. TEMA GEÇİŞ ANAHTARI (HEADER SWITCH)                                */',
        '/* ===================================================================== */',
        '.up-theme-switch{position:relative;display:inline-flex;align-items:center;width:46px;height:24px;padding:2px;border-radius:9999px;background:#0f172a;border:1px solid #475569;cursor:pointer;transition:background .25s ease,border-color .25s ease,box-shadow .25s ease;flex-shrink:0;}',
        '.up-theme-switch:hover{border-color:#a855f7;box-shadow:0 0 0 2px rgba(168,85,247,.2);}',
        '.up-theme-thumb{width:18px;height:18px;border-radius:9999px;background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;font-size:9px;display:flex;align-items:center;justify-content:center;transform:translateX(0);transition:transform .25s cubic-bezier(.4,0,.2,1),background .25s ease;box-shadow:0 1px 4px rgba(0,0,0,.4);}',
        'html[data-theme="light"] .up-theme-switch{background:#d5dfed;border-color:#b0c0d6;}',
        'html[data-theme="light"] .up-theme-switch:hover{border-color:#7c3aed;box-shadow:0 0 0 2px rgba(124,58,237,.18);}',
        'html[data-theme="light"] .up-theme-thumb{transform:translateX(22px);background:linear-gradient(135deg,#f59e0b,#ea580c);color:#fff;box-shadow:0 2px 5px rgba(234,88,12,.35);}',
        '@media (min-width:640px){.up-theme-switch{width:50px;height:26px;}.up-theme-thumb{width:20px;height:20px;font-size:10px;}html[data-theme="light"] .up-theme-thumb{transform:translateX(24px);}}',

        '/* ===================================================================== */',
        '/* 2. KATMANLI YÜZEY MİMARİSİ (NORDIC SOFT SLATE & PEARL PALETİ)         */',
        '/* ===================================================================== */',
        'html[data-theme="light"]{',
        '  --bg-base:#e6ecf5 !important;',
        '  --bg-surface:rgba(244,247,251,.94) !important;',
        '  --border-subtle:#cfd9e6 !important;',
        '  --border-bright:#b0c0d6 !important;',
        '  background-color:#e6ecf5 !important;',
        '  color:#0f172a !important;',
        '  color-scheme:light;',
        '}',
        'html[data-theme="light"] body,',
        'html[data-theme="light"] body.bg-slate-900,',
        'html[data-theme="light"] body.bg-slate-950,',
        'html[data-theme="light"] .bg-slate-950,',
        'html[data-theme="light"] [class*="bg-slate-950/"]{',
        '  background-color:#e6ecf5 !important;',
        '  color:#0f172a !important;',
        '}',

        '/* Katman 1: Ana Kartlar, Modallar ve Paneller (#f4f7fb) */',
        'html[data-theme="light"] .bg-slate-800,',
        'html[data-theme="light"] [class*="bg-slate-800/"]{',
        '  background-color:#f4f7fb !important;',
        '  box-shadow:0 4px 14px -2px rgba(15,23,42,.06),0 1px 3px rgba(15,23,42,.04);',
        '}',
        'html[data-theme="light"] .glass,',
        'html[data-theme="light"] .glass-strong{',
        '  background:rgba(244,247,251,.92) !important;',
        '  border-color:#cfd9e6 !important;',
        '  box-shadow:0 6px 20px -4px rgba(15,23,42,.06) !important;',
        '}',

        '/* Katman 2: Kart İçi Yuvalar, Alt Kutular ve Form Çerçeveleri (#f9fbfd) */',
        'html[data-theme="light"] .bg-slate-900:not(body),',
        'html[data-theme="light"] [class*="bg-slate-900/"]{',
        '  background-color:#f9fbfd !important;',
        '}',
        'html[data-theme="light"] .social-input{background:#ffffff !important;border-color:#c5d2e3 !important;color:#0f172a !important;box-shadow:inset 0 1px 2px rgba(15,23,42,.03);}',
        'html[data-theme="light"] .social-input:focus-within{border-color:#ec4899 !important;box-shadow:0 0 0 2px rgba(236,72,153,.15) !important;}',
        'html[data-theme="light"] .social-input input{background:transparent !important;color:#0f172a !important;border:none !important;box-shadow:none !important;}',
        'html[data-theme="light"] .fa-x-twitter:empty::before{content:"\\f099";}',

        '/* Katman 3: İkincil Butonlar, Seçiciler, Çipler ve Hover Durumları (#dfe7f2) */',
        'html[data-theme="light"] .bg-slate-700,',
        'html[data-theme="light"] [class*="bg-slate-700/"],',
        'html[data-theme="light"] .bg-slate-600,',
        'html[data-theme="light"] [class*="bg-slate-600/"],',
        'html[data-theme="light"] [class*="bg-white/5"],',
        'html[data-theme="light"] [class*="bg-white/10"],',
        'html[data-theme="light"] [class*="bg-white/15"]{',
        '  background-color:#dfe7f2 !important;',
        '  color:#1e293b !important;',
        '}',
        'html[data-theme="light"] [class*="hover:bg-slate-8"]:hover:not(.bg-indigo-600):not(.bg-emerald-600):not(.bg-purple-600),',
        'html[data-theme="light"] [class*="hover:bg-slate-7"]:hover:not(.bg-indigo-600):not(.bg-emerald-600):not(.bg-purple-600),',
        'html[data-theme="light"] [class*="hover:bg-slate-6"]:hover:not(.bg-indigo-600):not(.bg-emerald-600):not(.bg-purple-600){',
        '  background-color:#cfd9e8 !important;',
        '  color:#0f172a !important;',
        '}',
        'html[data-theme="light"] .cat-pill.bg-indigo-600:hover{background-color:#4338ca !important;color:#ffffff !important;}',
        'html[data-theme="light"] .club-cat-pill.bg-emerald-600:hover{background-color:#047857 !important;color:#ffffff !important;}',
        'html[data-theme="light"] .cat-pill .cat-count,html[data-theme="light"] .club-cat-pill [data-club-count]{background-color:#e2e8f0 !important;color:#334155 !important;}',
        'html[data-theme="light"] .cat-pill.bg-indigo-600 .cat-count,html[data-theme="light"] .club-cat-pill.bg-emerald-600 [data-club-count]{background-color:rgba(255,255,255,.22) !important;color:#ffffff !important;}',
        'html[data-theme="light"] [class*="hover:text-white"]:hover:not([class*="bg-red-"]):not([class*="hover:bg-red-"]):not([class*="bg-purple-"]):not([class*="bg-indigo-"]):not([class*="bg-blue-"]):not([class*="bg-emerald-"]):not([class*="bg-cyan-"]):not([class*="bg-pink-"]):not([class*="bg-rose-"]){',
        '  color:#0f172a !important;',
        '}',
        'html[data-theme="light"] [class*="bg-[#070b14]"]{background-color:rgba(244,247,251,.94) !important;}',
        'html[data-theme="light"] button.bg-white,html[data-theme="light"] a.bg-white,html[data-theme="light"] div.bg-white{border:1px solid #c5d2e3 !important;box-shadow:0 2px 6px rgba(15,23,42,.06) !important;color:#0f172a !important;}',
        'html[data-theme="light"] button.bg-white *,html[data-theme="light"] a.bg-white *{color:#0f172a !important;}',
        'html[data-theme="light"] #kesfet a[class*="bg-slate-950/"]{background-color:rgba(15,23,42,.38) !important;border-color:rgba(255,255,255,.35) !important;color:#ffffff !important;}',
        'html[data-theme="light"] #kesfet a[class*="bg-slate-950/"]:hover{background-color:rgba(15,23,42,.55) !important;}',

        '/* Koyu 900/950 Tonlu Yarı Saydam Kutular (Alıntı, Anket, Özel Rozetler) */',
        'html[data-theme="light"] [class*="bg-purple-9"],html[data-theme="light"] [class*="bg-indigo-9"]{background-color:rgba(124,58,237,.1) !important;}',
        'html[data-theme="light"] [class*="bg-amber-9"],html[data-theme="light"] [class*="bg-yellow-9"]{background-color:rgba(245,158,11,.12) !important;}',
        'html[data-theme="light"] [class*="bg-emerald-9"],html[data-theme="light"] [class*="bg-teal-9"]{background-color:rgba(16,185,129,.12) !important;}',
        'html[data-theme="light"] [class*="bg-rose-9"],html[data-theme="light"] [class*="bg-pink-9"],html[data-theme="light"] [class*="bg-red-9"]{background-color:rgba(244,63,94,.1) !important;}',
        'html[data-theme="light"] [class*="bg-blue-9"],html[data-theme="light"] [class*="bg-cyan-9"]{background-color:rgba(14,165,233,.1) !important;}',

        '/* ===================================================================== */',
        '/* 3. KENARLIKLAR, HEADER, FOOTER VE GÖLGELER                            */',
        '/* ===================================================================== */',
        'html[data-theme="light"] .border-slate-900,',
        'html[data-theme="light"] .border-slate-800,',
        'html[data-theme="light"] [class*="border-slate-800/"],',
        'html[data-theme="light"] .border-slate-700,',
        'html[data-theme="light"] [class*="border-slate-700/"],',
        'html[data-theme="light"] .border-slate-600,',
        'html[data-theme="light"] [class*="border-slate-600/"],',
        'html[data-theme="light"] [class*="border-white/"]{',
        '  border-color:#cfd9e6 !important;',
        '}',
        'html[data-theme="light"] header{',
        '  background-color:rgba(244,247,251,.92) !important;',
        '  backdrop-filter:blur(16px) !important;',
        '  -webkit-backdrop-filter:blur(16px) !important;',
        '  border-color:#cfd9e6 !important;',
        '  box-shadow:0 2px 12px rgba(15,23,42,.05) !important;',
        '}',
        'html[data-theme="light"] #main-header .nav-link.text-white,html[data-theme="light"] #main-header .nav-link:hover{color:#0f172a !important;}',
        'html[data-theme="light"] footer{',
        '  background-image:linear-gradient(180deg,#edf2f8 0%,#dfe7f2 100%) !important;',
        '  background-color:#e6ecf5 !important;',
        '  border-color:#cfd9e6 !important;',
        '}',

        '/* ===================================================================== */',
        '/* 4. UYUMLU VE MANTIKLI AÇIK TEMA GRADYANLARI (HERO & VİTRİN KARTLARI)  */',
        '/* ===================================================================== */',
        'html[data-theme="light"] [class*="from-slate-8"],',
        'html[data-theme="light"] [class*="from-slate-9"],',
        'html[data-theme="light"] [class*="from-slate-6"],',
        'html[data-theme="light"] [class*="via-slate-9"],',
        'html[data-theme="light"] [class*="to-slate-9"]{',
        '  --tw-gradient-from:#f4f7fb !important;',
        '  --tw-gradient-to:#eaeff7 !important;',
        '  --tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to) !important;',
        '  background-image:linear-gradient(135deg,#f4f7fb 0%,#eaeff7 100%) !important;',
        '  background-color:#f4f7fb !important;',
        '}',
        'html[data-theme="light"] [class*="from-rose-9"],',
        'html[data-theme="light"] [class*="from-pink-9"]{',
        '  background-image:linear-gradient(135deg,#fdf2f8 0%,#fae8ff 50%,#f3e8ff 100%) !important;',
        '  background-color:#fdf2f8 !important;',
        '}',
        'html[data-theme="light"] [class*="from-amber-9"],',
        'html[data-theme="light"] [class*="from-yellow-9"]{',
        '  background-image:linear-gradient(135deg,#fffbeb 0%,#fef3c7 55%,#ffedd5 100%) !important;',
        '  background-color:#fffbeb !important;',
        '}',
        'html[data-theme="light"] [class*="from-purple-9"],',
        'html[data-theme="light"] [class*="from-indigo-9"]{',
        '  background-image:linear-gradient(135deg,#f3e8ff 0%,#e0e7ff 55%,#eef2ff 100%) !important;',
        '  background-color:#f3e8ff !important;',
        '}',
        'html[data-theme="light"] [class*="from-emerald-9"],',
        'html[data-theme="light"] [class*="from-teal-9"]{',
        '  background-image:linear-gradient(135deg,#ecfdf5 0%,#ccfbf1 100%) !important;',
        '  background-color:#ecfdf5 !important;',
        '}',
        'html[data-theme="light"] [class*="from-cyan-9"],',
        'html[data-theme="light"] [class*="from-blue-9"]{',
        '  background-image:linear-gradient(135deg,#ecfeff 0%,#e0f2fe 100%) !important;',
        '  background-color:#ecfeff !important;',
        '}',
        'html[data-theme="light"] .reel-card{',
        '  background-image:linear-gradient(155deg,#f7f9fc 0%,#eaeff8 100%) !important;',
        '  background-color:#f4f7fb !important;',
        '  border-color:#c5d2e3 !important;',
        '  box-shadow:0 18px 42px -12px rgba(15,23,42,.14),0 2px 6px rgba(15,23,42,.05) !important;',
        '}',
        'html[data-theme="light"] .reel-card [class*="bg-slate-950/"]{background-color:rgba(255,255,255,.55) !important;border-color:rgba(203,213,225,.75) !important;}',

        '/* ===================================================================== */',
        '/* 5. GRADYAN BAŞLIKLAR (bg-clip-text) VE TİPOGRAFİ HİYERARŞİSİ          */',
        '/* ===================================================================== */',
        'html[data-theme="light"] [class*="from-white"][class*="bg-clip-text"]{',
        '  background-image:linear-gradient(90deg,#1e3a8a,#4338ca,#6d28d9) !important;',
        '}',
        'html[data-theme="light"] [class*="bg-clip-text"][class*="from-yellow-"],',
        'html[data-theme="light"] [class*="bg-clip-text"][class*="from-amber-"]{',
        '  background-image:linear-gradient(90deg,#b45309,#d97706,#ea580c) !important;',
        '}',
        'html[data-theme="light"] [class*="bg-clip-text"][class*="from-emerald-"]{',
        '  background-image:linear-gradient(90deg,#047857,#0d9488) !important;',
        '}',
        'html[data-theme="light"] [class*="bg-clip-text"][class*="from-blue-"],',
        'html[data-theme="light"] [class*="bg-clip-text"][class*="from-indigo-"]{',
        '  background-image:linear-gradient(90deg,#1d4ed8,#4338ca,#6d28d9) !important;',
        '}',

        '/* Ana Metin Tonları */',
        'html[data-theme="light"] .text-white,',
        'html[data-theme="light"] .text-slate-50,',
        'html[data-theme="light"] .text-slate-100,',
        'html[data-theme="light"] [class*="text-slate-100/"],',
        'html[data-theme="light"] .text-slate-200,',
        'html[data-theme="light"] [class*="text-slate-200/"]{color:#0f172a !important;}',
        'html[data-theme="light"] .text-slate-300,',
        'html[data-theme="light"] [class*="text-slate-300/"]{color:#334155 !important;}',
        'html[data-theme="light"] .text-slate-400,',
        'html[data-theme="light"] [class*="text-slate-400/"]{color:#475569 !important;}',
        'html[data-theme="light"] .text-slate-500{color:#64748b !important;}',

        '/* Vurgu ve Pastel Metinlerin Uyumlu Mücevher Tonlarına (-600/-700) Dönüşümü */',
        'html[data-theme="light"] .text-purple-100,html[data-theme="light"] .text-purple-200,html[data-theme="light"] [class*="text-purple-200/"],html[data-theme="light"] .text-purple-300,html[data-theme="light"] [class*="text-purple-300/"],html[data-theme="light"] .text-purple-400,html[data-theme="light"] .text-violet-200,html[data-theme="light"] .text-violet-300,html[data-theme="light"] .text-violet-400{color:#6d28d9 !important;}',
        'html[data-theme="light"] .text-fuchsia-200,html[data-theme="light"] .text-fuchsia-300,html[data-theme="light"] .text-fuchsia-400{color:#a21caf !important;}',
        'html[data-theme="light"] .text-indigo-100,html[data-theme="light"] .text-indigo-200,html[data-theme="light"] [class*="text-indigo-200/"],html[data-theme="light"] .text-indigo-300,html[data-theme="light"] [class*="text-indigo-300/"],html[data-theme="light"] .text-indigo-400{color:#4338ca !important;}',
        'html[data-theme="light"] .text-blue-100,html[data-theme="light"] .text-blue-200,html[data-theme="light"] [class*="text-blue-200/"],html[data-theme="light"] .text-blue-300,html[data-theme="light"] [class*="text-blue-300/"],html[data-theme="light"] .text-blue-400{color:#1d4ed8 !important;}',
        'html[data-theme="light"] .text-sky-200,html[data-theme="light"] .text-sky-300,html[data-theme="light"] .text-sky-400,html[data-theme="light"] .text-cyan-200,html[data-theme="light"] [class*="text-cyan-200/"],html[data-theme="light"] .text-cyan-300,html[data-theme="light"] .text-cyan-400{color:#0284c7 !important;}',
        'html[data-theme="light"] .text-emerald-100,html[data-theme="light"] .text-emerald-200,html[data-theme="light"] [class*="text-emerald-200/"],html[data-theme="light"] .text-emerald-300,html[data-theme="light"] .text-emerald-400,html[data-theme="light"] [class*="text-emerald-400/"],html[data-theme="light"] .text-green-200,html[data-theme="light"] .text-green-300,html[data-theme="light"] .text-green-400{color:#047857 !important;}',
        'html[data-theme="light"] .text-teal-200,html[data-theme="light"] .text-teal-300,html[data-theme="light"] .text-teal-400{color:#0f766e !important;}',
        'html[data-theme="light"] .text-lime-200,html[data-theme="light"] .text-lime-300,html[data-theme="light"] .text-lime-400{color:#4d7c0f !important;}',
        'html[data-theme="light"] .text-amber-100,html[data-theme="light"] .text-amber-200,html[data-theme="light"] [class*="text-amber-200/"],html[data-theme="light"] .text-amber-300,html[data-theme="light"] .text-yellow-200,html[data-theme="light"] .text-yellow-300{color:#d97706 !important;}',
        'html[data-theme="light"] .text-amber-400,html[data-theme="light"] .text-yellow-400,html[data-theme="light"] [class*="text-yellow-500"]{color:#eab308 !important;}',
        'html[data-theme="light"] #user-coins,html[data-theme="light"] #user-coins-box .fa-coins,html[data-theme="light"] div:has(>#user-coins) .fa-coins{color:#d97706 !important;}',
        'html[data-theme="light"] #user-coins-box .fa-coins,html[data-theme="light"] div:has(>#user-coins) .fa-coins{color:#f59e0b !important;filter:drop-shadow(0 1px 1px rgba(217,119,6,.25));}',
        'html[data-theme="light"] #user-coins-box,html[data-theme="light"] div:has(>#user-coins){background-color:#fef9c3 !important;border-color:#fde047 !important;box-shadow:0 1px 4px rgba(234,179,8,.18) !important;}',
        'html[data-theme="light"] #user-dropdown{background-color:#fafcfe !important;border-color:#d8e1ec !important;box-shadow:0 14px 34px -6px rgba(15,23,42,.14),0 4px 12px rgba(15,23,42,.06) !important;}',
        'html[data-theme="light"] #user-dropdown a:hover,html[data-theme="light"] #user-dropdown button:not([onclick*="Logout"]):hover{background-color:#eef3f9 !important;}',
        'html[data-theme="light"] #dropdown-notif-count{background-color:#e9eff7 !important;border-color:#d5dfec !important;color:#334155 !important;}',
        'html[data-theme="light"] .text-orange-200,html[data-theme="light"] .text-orange-300,html[data-theme="light"] .text-orange-400{color:#c2410c !important;}',
        'html[data-theme="light"] .text-pink-100,html[data-theme="light"] .text-pink-200,html[data-theme="light"] [class*="text-pink-200/"],html[data-theme="light"] .text-pink-300,html[data-theme="light"] .text-pink-400,html[data-theme="light"] .text-rose-200,html[data-theme="light"] [class*="text-rose-200/"],html[data-theme="light"] .text-rose-300,html[data-theme="light"] .text-rose-400{color:#be185d !important;}',
        'html[data-theme="light"] .text-red-200,html[data-theme="light"] .text-red-300,html[data-theme="light"] .text-red-400,html[data-theme="light"] [class*="text-red-400/"]{color:#b91c1c !important;}',

        '/* Modal Perdeleri, Gölge Yumuşatma ve Kaydırma Çubuğu */',
        'html[data-theme="light"] [class*="bg-black/7"],html[data-theme="light"] [class*="bg-black/8"]{background-color:rgba(15,23,42,.42) !important;}',
        'html[data-theme="light"] [class*="shadow-black/"]{--tw-shadow-color:rgba(15,23,42,.14) !important;}',
        'html[data-theme="light"] .liked{background-color:rgba(124,58,237,.12) !important;border-color:#7c3aed !important;color:#6d28d9 !important;}',
        'html[data-theme="light"] .action-rail-btn:not(.liked-active){background:rgba(255,255,255,.92) !important;border-color:#cbd5e1 !important;color:#1e293b !important;box-shadow:0 6px 16px rgba(15,23,42,.12) !important;}',
        'html[data-theme="light"] .action-rail-btn.liked-active{background:rgba(244,63,94,.14) !important;border-color:rgba(225,29,72,.45) !important;color:#e11d48 !important;box-shadow:0 4px 14px rgba(225,29,72,.18) !important;}',
        'html[data-theme="light"] input::placeholder,html[data-theme="light"] textarea::placeholder{color:#64748b !important;opacity:1;}',
        'html[data-theme="light"] ::-webkit-scrollbar{width:8px;height:8px;}',
        'html[data-theme="light"] ::-webkit-scrollbar-track{background:#e6ecf5;}',
        'html[data-theme="light"] ::-webkit-scrollbar-thumb{background:#b8c5d6;border-radius:9999px;}',
        'html[data-theme="light"] ::-webkit-scrollbar-thumb:hover{background:#94a3b8;}',

        '/* ===================================================================== */',
        '/* 6. DOLU RENKLİ BUTONLARDA VE ROZETLERDE BEYAZ METİN KORUMASI          */',
        '/* ===================================================================== */',
        'html[data-theme="light"] .bg-purple-600,html[data-theme="light"] .bg-purple-500,html[data-theme="light"] .bg-indigo-600,html[data-theme="light"] .bg-indigo-500,html[data-theme="light"] .bg-blue-600,html[data-theme="light"] .bg-blue-500,html[data-theme="light"] .bg-sky-600,html[data-theme="light"] .bg-cyan-600,html[data-theme="light"] .bg-cyan-500,html[data-theme="light"] .bg-teal-600,html[data-theme="light"] .bg-emerald-600,html[data-theme="light"] .bg-emerald-500,html[data-theme="light"] .bg-amber-600,html[data-theme="light"] .bg-orange-600,html[data-theme="light"] .bg-pink-600,html[data-theme="light"] .bg-pink-500,html[data-theme="light"] .bg-rose-600,html[data-theme="light"] .bg-rose-500,html[data-theme="light"] .bg-red-600,html[data-theme="light"] .bg-red-500,' +
        'html[data-theme="light"] [class~="from-purple-600"],html[data-theme="light"] [class~="from-purple-500"],html[data-theme="light"] [class~="from-violet-600"],html[data-theme="light"] [class~="from-violet-500"],html[data-theme="light"] [class~="from-indigo-600"],html[data-theme="light"] [class~="from-indigo-500"],html[data-theme="light"] [class~="from-blue-600"],html[data-theme="light"] [class~="from-blue-500"],html[data-theme="light"] [class~="from-sky-500"],html[data-theme="light"] [class~="from-cyan-600"],html[data-theme="light"] [class~="from-cyan-500"],html[data-theme="light"] [class~="from-teal-600"],html[data-theme="light"] [class~="from-teal-500"],html[data-theme="light"] [class~="from-emerald-600"],html[data-theme="light"] [class~="from-emerald-500"],html[data-theme="light"] [class~="from-amber-600"],html[data-theme="light"] [class~="from-amber-500"],html[data-theme="light"] [class~="from-orange-500"],html[data-theme="light"] [class~="from-pink-600"],html[data-theme="light"] [class~="from-pink-500"],html[data-theme="light"] [class~="from-rose-600"],html[data-theme="light"] [class~="from-rose-500"],html[data-theme="light"] [class~="from-red-600"],html[data-theme="light"] [class~="from-red-500"],' +
        'html[data-theme="light"] .cat-pill.active,html[data-theme="light"] .up-akis-bubble,html[data-theme="light"] .assistant-btn,' +
        'html[data-theme="light"] .bg-purple-600 *,html[data-theme="light"] .bg-purple-500 *,html[data-theme="light"] .bg-indigo-600 *,html[data-theme="light"] .bg-blue-600 *,html[data-theme="light"] .bg-cyan-600 *,html[data-theme="light"] .bg-teal-600 *,html[data-theme="light"] .bg-emerald-600 *,html[data-theme="light"] .bg-pink-600 *,html[data-theme="light"] .bg-rose-600 *,html[data-theme="light"] .bg-red-500 *,html[data-theme="light"] .bg-red-600 *,' +
        'html[data-theme="light"] [class~="from-purple-600"] *,html[data-theme="light"] [class~="from-purple-500"] *,html[data-theme="light"] [class~="from-violet-500"] *,html[data-theme="light"] [class~="from-indigo-600"] *,html[data-theme="light"] [class~="from-blue-600"] *,html[data-theme="light"] [class~="from-blue-500"] *,html[data-theme="light"] [class~="from-cyan-600"] *,html[data-theme="light"] [class~="from-cyan-500"] *,html[data-theme="light"] [class~="from-teal-500"] *,html[data-theme="light"] [class~="from-emerald-600"] *,html[data-theme="light"] [class~="from-emerald-500"] *,html[data-theme="light"] [class~="from-amber-500"] *,html[data-theme="light"] [class~="from-orange-500"] *,html[data-theme="light"] [class~="from-pink-600"] *,html[data-theme="light"] [class~="from-pink-500"] *,html[data-theme="light"] [class~="from-rose-600"] *,html[data-theme="light"] [class~="from-rose-500"] *,html[data-theme="light"] .assistant-btn *,html[data-theme="light"] .cat-pill.active *,html[data-theme="light"] .up-akis-bubble *{color:#ffffff !important;}',

        '/* Sarı/Amber Ödül & Satın Alma Butonlarında Koyu Kontrast Metin */',
        'html[data-theme="light"] .bg-amber-500,html[data-theme="light"] .bg-amber-400,html[data-theme="light"] [class~="from-amber-400"],html[data-theme="light"] [class~="from-yellow-500"],html[data-theme="light"] .bg-amber-500 *,html[data-theme="light"] [class~="from-amber-400"] *,html[data-theme="light"] [class~="from-yellow-500"] *{color:#0f172a !important;}',
        '/* Kart İkon Kutularında Hover Kontrastı (group-hover:bg-* + group-hover:text-*) */',
        'html[data-theme="light"] .group:hover [class*="group-hover:text-white"],html[data-theme="light"] .group:hover [class*="group-hover:text-white"] i{color:#ffffff !important;}',
        'html[data-theme="light"] .group:hover [class*="group-hover:text-slate-900"],html[data-theme="light"] .group:hover [class*="group-hover:text-slate-900"] i{color:#0f172a !important;}',
        'html[data-theme="light"] #admin-panel-link:hover,html[data-theme="light"] #admin-panel-link:hover *,html[data-theme="light"] [class*="hover:bg-red-600"][class*="hover:text-white"]:hover,html[data-theme="light"] [class*="hover:bg-red-600"][class*="hover:text-white"]:hover *{color:#ffffff !important;}',

        '/* ===================================================================== */',
        '/* 7. RÜTBE, KÜNYE, UNVAN, MAĞAZA, OYUN VE EDİTÖR ÖZEL BİLEŞENLERİ       */',
        '/* ===================================================================== */',
        'html[data-theme="light"] .store-chip.active{color:#4c1d95 !important;border-color:#8b5cf6 !important;background:linear-gradient(90deg,rgba(139,92,246,.18),rgba(99,102,241,.18)) !important;}',
        'html[data-theme="light"] .game-chip.active{color:#92400e !important;border-color:#f59e0b !important;background:linear-gradient(90deg,rgba(245,158,11,.2),rgba(234,88,12,.18)) !important;}',
        'html[data-theme="light"] .coupon-edge{background-image:radial-gradient(circle at 0 50%,#f4f7fb 7px,transparent 8px),radial-gradient(circle at 100% 50%,#f4f7fb 7px,transparent 8px) !important;}',
        'html[data-theme="light"] .uname-l1{color:#059669 !important;}',
        'html[data-theme="light"] .uname-l2{color:#65a30d !important;text-shadow:none !important;}',
        'html[data-theme="light"] .uname-l3{color:#0d9488 !important;text-shadow:none !important;}',
        'html[data-theme="light"] .uname-l4{color:#d97706 !important;text-shadow:none !important;}',
        'html[data-theme="light"] .uname-l5{background:linear-gradient(90deg,#0284c7,#4f46e5,#0284c7) !important;background-size:200% auto !important;-webkit-background-clip:text !important;background-clip:text !important;color:transparent !important;filter:none !important;}',
        'html[data-theme="light"] .uname-l6{background:linear-gradient(90deg,#b45309,#d97706,#ea580c,#b45309) !important;background-size:200% auto !important;-webkit-background-clip:text !important;background-clip:text !important;color:transparent !important;filter:none !important;}',
        'html[data-theme="light"] .uname-admin{background:linear-gradient(90deg,#b91c1c,#dc2626,#e11d48,#b91c1c) !important;background-size:200% auto !important;-webkit-background-clip:text !important;background-clip:text !important;color:transparent !important;filter:none !important;}',
        'html[data-theme="light"] .uname-mod,html[data-theme="light"] .name-mod{color:#ea580c !important;text-shadow:none !important;}',
        'html[data-theme="light"] .name-admin{color:#dc2626 !important;text-shadow:none !important;}',
        'html[data-theme="light"] .frame-diamond{box-shadow:0 0 0 2px #38bdf8,0 0 0 4px rgba(186,230,253,.8),0 0 18px rgba(56,189,248,.5) !important;}',
        'html[data-theme="light"] .kunye-uni{color:#3730a3 !important;background:rgba(99,102,241,.14) !important;border-color:rgba(99,102,241,.35) !important;}',
        'html[data-theme="light"] .kunye-dep{color:#0369a1 !important;background:rgba(14,165,233,.14) !important;border-color:rgba(14,165,233,.35) !important;}',
        'html[data-theme="light"] .kunye-grade{color:#6d28d9 !important;background:rgba(139,92,246,.14) !important;border-color:rgba(139,92,246,.35) !important;}',
        'html[data-theme="light"] .title-violet{color:#5b21b6 !important;background:rgba(139,92,246,.15) !important;}',
        'html[data-theme="light"] .title-gold{color:#92400e !important;background:rgba(245,158,11,.18) !important;}',
        'html[data-theme="light"] .title-emerald{color:#065f46 !important;background:rgba(16,185,129,.16) !important;}',
        'html[data-theme="light"] .title-crimson{color:#991b1b !important;background:rgba(220,38,38,.15) !important;}',
        'html[data-theme="light"] .title-ice,html[data-theme="light"] .title-neonblue{color:#075985 !important;background:rgba(14,165,233,.16) !important;}',
        'html[data-theme="light"] .title-night,html[data-theme="light"] .title-obsidian{color:#1e293b !important;background:#cfd9e6 !important;}',
        'html[data-theme="light"] .title-pink{color:#9d174d !important;background:rgba(236,72,153,.15) !important;}',
        'html[data-theme="light"] .title-amber{color:#9a3412 !important;background:rgba(249,115,22,.16) !important;}',
        'html[data-theme="light"] .title-cyber{color:#86198f !important;}',
        'html[data-theme="light"] .title-aurora{color:#115e59 !important;}',

        '/* Form Alanları, Oyun Tahtası ve Profesyonel Markdown Editörü */',
        'html[data-theme="light"] input[type="text"],html[data-theme="light"] input[type="number"],html[data-theme="light"] input[type="email"],html[data-theme="light"] input[type="url"],html[data-theme="light"] input[type="search"],html[data-theme="light"] input[type="password"],html[data-theme="light"] input[type="tel"],html[data-theme="light"] textarea,html[data-theme="light"] select{background-color:#ffffff !important;color:#0f172a !important;border-color:#c5d2e3 !important;box-shadow:inset 0 1px 2px rgba(15,23,42,.03);}',
        'html[data-theme="light"] .word-tile:not(.correct):not(.present):not(.absent){background:#ffffff !important;border-color:#c5d2e3 !important;color:#0f172a !important;}',
        'html[data-theme="light"] .kb-key:not(.correct):not(.present):not(.absent){background:#dfe7f2 !important;border-color:#c5d2e3 !important;color:#0f172a !important;}',
        'html[data-theme="light"] .mention-suggestions{background:#f4f7fb !important;border-color:#c5d2e3 !important;box-shadow:0 12px 28px rgba(15,23,42,.15) !important;}',
        'html[data-theme="light"] .mention-item{border-color:#dfe7f2 !important;}',
        'html[data-theme="light"] .mention-item:hover,html[data-theme="light"] .mention-item.active{background:#e6ecf5 !important;}',
        'html[data-theme="light"] .mention-text,html[data-theme="light"] .msg-embed-link{color:#4f46e5 !important;}',
        'html[data-theme="light"] .pro-md-editor,html[data-theme="light"] .pro-md-editor.is-fullscreen{background:#ffffff !important;border-color:#c5d2e3 !important;}',
        'html[data-theme="light"] .pro-md-header{background:#eef3f9 !important;border-color:#cfd9e6 !important;}',
        'html[data-theme="light"] .pro-md-tabs{background:#dfe7f2 !important;border-color:#c5d2e3 !important;}',
        'html[data-theme="light"] .pro-md-tab{color:#475569 !important;}',
        'html[data-theme="light"] .pro-md-tab.active{background:#ffffff !important;color:#6d28d9 !important;box-shadow:0 1px 3px rgba(15,23,42,.1) !important;}',
        'html[data-theme="light"] .pro-md-btn{color:#475569 !important;}',
        'html[data-theme="light"] .pro-md-btn:hover{background:rgba(124,58,237,.12) !important;color:#6d28d9 !important;}',
        'html[data-theme="light"] .pro-md-textarea{color:#0f172a !important;background:transparent !important;box-shadow:none !important;}',
        'html[data-theme="light"] .pro-md-preview{color:#1e293b !important;}',
        'html[data-theme="light"] .pro-md-footer{background:#eef3f9 !important;border-color:#cfd9e6 !important;color:#64748b !important;}',
        'html[data-theme="light"] .pro-md-kbd{background:#ffffff !important;border-color:#c5d2e3 !important;color:#475569 !important;}',
        'html[data-theme="light"] .pro-md-popover{background:#f4f7fb !important;border-color:#c5d2e3 !important;box-shadow:0 12px 28px rgba(15,23,42,.15) !important;}',
        'html[data-theme="light"] .md-toolbar{background:#eef3f9 !important;border-color:#c5d2e3 !important;}',
        'html[data-theme="light"] .md-tool{color:#475569 !important;}',
        'html[data-theme="light"] .md-body .md-strong,html[data-theme="light"] .md-body .md-h3{color:#0f172a !important;}',
        'html[data-theme="light"] .md-body .md-em{color:#334155 !important;}',
        'html[data-theme="light"] .md-color .md-strong,html[data-theme="light"] .md-color .md-em,html[data-theme="light"] .md-color .md-h3,html[data-theme="light"] .md-color del,html[data-theme="light"] .md-color u{color:inherit !important;}',
        'html[data-theme="light"] .md-body .md-pre{background:#eef3f9 !important;border-color:#c5d2e3 !important;color:#0f172a !important;}',
        'html[data-theme="light"] .md-body .md-code{background:#e6ecf5 !important;border-color:#c5d2e3 !important;color:#be185d !important;}',
        'html[data-theme="light"] .md-body .md-quote,html[data-theme="light"] .md-callout{background:#ebe7f6 !important;border-top:1px solid #d8d0ec !important;border-right:1px solid #d8d0ec !important;border-bottom:1px solid #d8d0ec !important;border-left:3px solid #7c3aed !important;color:#1e293b !important;}',
        'html[data-theme="light"] [data-quoted-uid],html[data-theme="light"] .border-l-4.border-purple-500{background-color:#ebe7f6 !important;border-top:1px solid #d8d0ec !important;border-right:1px solid #d8d0ec !important;border-bottom:1px solid #d8d0ec !important;border-left:4px solid #7c3aed !important;color:#334155 !important;}',
        'html[data-theme="light"] [data-quoted-uid] strong{color:#4c1d95 !important;}',
        'html[data-theme="light"] #active-quote-banner{background-color:#ebe7f6 !important;border-color:#c4b5fd !important;}',
        'html[data-theme="light"] .md-spoiler{background:#cbd5e1 !important;}',
        'html[data-theme="light"] .md-spoiler.revealed{background:rgba(124,58,237,.14) !important;color:#5b21b6 !important;}',
        'html[data-theme="light"] .skeleton{background:linear-gradient(90deg,#dfe7f2 25%,#eaeff7 50%,#dfe7f2 75%) !important;background-size:200% 100% !important;}',
        'html[data-theme="light"] .skeleton-card{background:#f4f7fb !important;border-color:#cfd9e6 !important;}',
        'html[data-theme="light"] .up-chip{background:#dfe7f2 !important;border-color:#c5d2e3 !important;color:#334155 !important;}'
    ].join('\n');

    function injectThemeStyles() {
        var existing = document.getElementById('portal-theme-styles');
        if (existing) { existing.textContent = THEME_CSS; return; }
        var s = document.createElement('style');
        s.id = 'portal-theme-styles';
        s.textContent = THEME_CSS;
        (document.head || document.documentElement).appendChild(s);
    }
    injectThemeStyles();

    window.applyPortalTheme = function (theme) {
        var isLight = theme === 'light';
        if (isLight) document.documentElement.setAttribute('data-theme', 'light');
        else document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark'); } catch (e) {}
        var btn = document.getElementById('up-theme-switch');
        if (btn) {
            btn.setAttribute('aria-checked', String(isLight));
            btn.title = isLight ? 'Karanlık Temaya Geç' : 'Aydınlık Temaya Geç';
            var icon = btn.querySelector('i');
            if (icon) icon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        }
    };

    window.togglePortalTheme = function () {
        var isLight = document.documentElement.getAttribute('data-theme') === 'light';
        window.applyPortalTheme(isLight ? 'dark' : 'light');
    };

    function mountSwitch() {
        if (document.getElementById('up-theme-switch')) return;
        var authSec = document.getElementById('auth-section');
        var header = document.querySelector('header');
        if (!authSec && !header) return;
        var isLight = document.documentElement.getAttribute('data-theme') === 'light';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'up-theme-switch';
        btn.className = 'up-theme-switch';
        btn.setAttribute('role', 'switch');
        btn.setAttribute('aria-checked', String(isLight));
        btn.setAttribute('aria-label', 'Tema Değiştir');
        btn.title = isLight ? 'Karanlık Temaya Geç' : 'Aydınlık Temaya Geç';
        btn.innerHTML = '<span class="up-theme-thumb"><i class="fa-solid ' + (isLight ? 'fa-sun' : 'fa-moon') + '"></i></span>';
        btn.addEventListener('click', window.togglePortalTheme);
        if (authSec && authSec.parentNode) {
            authSec.parentNode.insertBefore(btn, authSec);
        } else if (header) {
            var rightGroup = header.querySelector('.flex.items-center.gap-2\\.5, .flex.items-center.space-x-2');
            if (rightGroup) {
                rightGroup.insertBefore(btn, rightGroup.firstChild);
            } else {
                var container = header.querySelector('.flex.items-center.justify-between') || header;
                container.appendChild(btn);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountSwitch, { once: true });
    } else {
        mountSwitch();
    }
})();
