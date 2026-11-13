/* Lianchez — UI iyileştirmeleri (script.js'e dokunmaz, bağımsız çalışır) */
(() => {
    'use strict';
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* 1) Header: kaydırınca cam efekti */
    const header = $('header');
    if (header) {
        const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
        onScroll();
        addEventListener('scroll', onScroll, { passive: true });
    }

    /* 2) Mobil menü: aria, Escape, tüm linklerde kapanma, masaüstüne geçişte sıfırlama */
    const toggle = $('.menu-toggle');
    const list = $('nav ul');
    if (toggle && list) {
        const sync = () => toggle.setAttribute('aria-expanded', String(list.classList.contains('open')));
        const close = () => {
            list.classList.remove('open');
            toggle.classList.remove('active');
            document.body.style.overflow = '';
            sync();
        };
        // script.js kendi click'ini işledikten sonra aria'yı eşitle
        toggle.addEventListener('click', () => requestAnimationFrame(sync));
        $$('a', list).forEach(a => a.addEventListener('click', () => requestAnimationFrame(close)));
        addEventListener('keydown', e => { if (e.key === 'Escape' && list.classList.contains('open')) { close(); toggle.focus(); } });
        matchMedia('(min-width: 768px)').addEventListener('change', e => { if (e.matches) close(); });
    }

    /* 3) Scroll reveal */
    const revealTargets = $$('.service-item, .pricing-card, .testimonial-card, .cta-card, .contact-form, section h2, #about p, .hero-content, .hero-visual');
    if ('IntersectionObserver' in window && !reduceMotion) {
        document.documentElement.classList.add('js-reveal');
        const io = new IntersectionObserver((entries) => {
            entries.forEach(en => {
                if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
        revealTargets.forEach((el, i) => {
            el.classList.add('reveal');
            el.style.setProperty('--reveal-delay', `${(i % 4) * 80}ms`);
            io.observe(el);
        });
        // Dinamik eklenen kartlar (blog) için
        const blog = $('#blog-posts-container');
        if (blog) new MutationObserver(() => $$('.service-item:not(.reveal)', blog).forEach(el => { el.classList.add('reveal'); io.observe(el); }))
            .observe(blog, { childList: true });
    }

    /* 4) Kart spot ışığı (imleci takip eder) */
    if (canHover) {
        $$('.service-item, .pricing-card').forEach(card => {
            card.addEventListener('pointermove', e => {
                const r = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${e.clientX - r.left}px`);
                card.style.setProperty('--my', `${e.clientY - r.top}px`);
            }, { passive: true });
        });
    }

    /* 5) Hero 3D tilt */
    const tilt = $('[data-tilt]');
    if (tilt && canHover && !reduceMotion) {
        const zone = $('#hero');
        const base = 'rotateY(-14deg) rotateX(8deg)';
        zone.addEventListener('pointermove', e => {
            const r = zone.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            tilt.classList.add('is-tilting');
            tilt.style.transform = `rotateY(${-14 + x * 18}deg) rotateX(${8 - y * 14}deg)`;
        }, { passive: true });
        zone.addEventListener('pointerleave', () => {
            tilt.style.transform = base;
            setTimeout(() => { tilt.classList.remove('is-tilting'); tilt.style.transform = ''; }, 260);
        });
    }

    /* 6) Çark modalı: Escape ile kapat, arka plana tıklayınca kapat, odak yönetimi */
    const overlay = $('#wheel-overlay');
    if (overlay) {
        const closeBtn = $('#wheel-close');
        const isOpen = () => getComputedStyle(overlay).display !== 'none';
        addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) closeBtn?.click(); });
        overlay.addEventListener('click', e => { if (e.target === overlay) closeBtn?.click(); });
        let wasOpen = false;
        new MutationObserver(() => {
            const open = isOpen();
            if (open && !wasOpen) setTimeout(() => $('#wheel-email')?.focus({ preventScroll: true }), 400);
            wasOpen = open;
        }).observe(overlay, { attributes: true, attributeFilter: ['style'] });
    }
})();

/* ===== v2 eklentileri ===== */
(() => {
    'use strict';
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Mobil menü: body.menu-open ile arka plan kararması */
    const list = $('nav ul');
    if (list) {
        const apply = () => document.body.classList.toggle('menu-open', list.classList.contains('open'));
        new MutationObserver(apply).observe(list, { attributes: true, attributeFilter: ['class'] });
        apply();
    }

    /* Buton ripple (mikro-etkileşim) */
    if (!reduceMotion) {
        document.addEventListener('pointerdown', e => {
            const btn = e.target.closest('.button, .form-submit-button');
            if (!btn) return;
            const r = btn.getBoundingClientRect();
            const dot = document.createElement('span');
            dot.className = 'ripple';
            dot.style.left = `${e.clientX - r.left}px`;
            dot.style.top = `${e.clientY - r.top}px`;
            btn.appendChild(dot);
            dot.addEventListener('animationend', () => dot.remove(), { once: true });
        }, { passive: true });
    }

    /* Hero: ekran dışındayken veya sekme gizliyken animasyonları durdur */
    const hero = $('#hero');
    if (hero && 'IntersectionObserver' in window) {
        let inView = true;
        const update = () => hero.classList.toggle('is-paused', !inView || document.hidden);
        new IntersectionObserver(([en]) => { inView = en.isIntersecting; update(); }, { threshold: 0.05 }).observe(hero);
        document.addEventListener('visibilitychange', update);
    }

    /* Konsol kirliliği: engellenen üçüncü parti istekleri için sessiz koruma */
    addEventListener('unhandledrejection', e => {
        const msg = String(e.reason && (e.reason.message || e.reason));
        if (/gtag|googletagmanager|google-analytics|ERR_BLOCKED|Failed to fetch.*(google|doubleclick)/i.test(msg)) e.preventDefault();
    });
    addEventListener('error', e => {
        if (/googletagmanager|google-analytics|doubleclick|gtag/i.test(String(e.filename || '') + String(e.message || ''))) e.preventDefault();
    }, true);
    if (typeof window.gtag !== 'function') window.gtag = () => {};
    window.dataLayer = window.dataLayer || [];
})();
