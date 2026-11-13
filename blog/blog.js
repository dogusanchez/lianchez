import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, updateDoc, increment, serverTimestamp, query, orderBy, where, limit, startAfter } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { firebaseConfig } from '/firebase-config.js';

// --- REKLAM YÖNETİM SİSTEMİ BAŞLANGIÇ ---
let globalAds = []; // Reklamları hafızada tutacak değişken

// 1. Reklamları Veritabanından Çek (Yazı içi reklamlar için)
const fetchAds = async () => {
    try {
        const q = query(collection(db, "ads"));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            // Önce tüm veriyi alıyoruz
            const allAds = snapshot.docs.map(doc => doc.data());
            
            // FİLTRELEME İŞLEMİ BURADA YAPILIYOR:
            // "isActive" değeri "false" (pasif) OLANLARI eziyoruz.
            // (ad.isActive !== false) dememizin sebebi: Eski eklediğin reklamlarda 'isActive' ayarı yok.
            // Onlar kaybolmasın diye "false değilse göster" diyoruz.
            globalAds = allAds.filter(ad => ad.isActive !== false);

            // Kalan aktif reklamları karıştır (her seferinde farklı reklam çıksın)
            globalAds = globalAds.sort(() => Math.random() - 0.5);
        }
    } catch (error) {
        console.error("Reklam verisi çekilemedi:", error);
    }
};

// 2. Reklam HTML'i Oluşturucu (Yazı içi ve liste arası için)
const getAdHTML = (adData) => {
    if (!adData) return '';
    return `
        <div class="ad-box-dynamic" style="margin: 5px 0; text-align:center; clear:both;">
            <a href="${adData.linkUrl}" target="_blank" rel="nofollow" style="display:block; text-decoration:none;">
                <picture>
                    <source media="(max-width: 768px)" srcset="${adData.mobileImage}">
                    <img src="${adData.desktopImage}" alt="${adData.title}" style="max-width:100%; height:auto; border-radius:8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                </picture>
                <div style="font-size:0.75rem; color:#888; margin-top:5px; text-transform:uppercase; letter-spacing:1px;">Sponsorlu Bağlantı</div>
            </a>
        </div>
    `;
};

// 3. Sabit Reklam Alanlarını Doldur (Header, Footer ve Sidebar)
const fillStaticAds = () => {
    // Sayfadaki class="ad-box" olan tüm kutuları bul
    const adBoxes = document.querySelectorAll('.ad-box');
    if (globalAds.length === 0 || adBoxes.length === 0) return;

    adBoxes.forEach((box, index) => {
        // Sırayla bir reklam seç
        const ad = globalAds[index % globalAds.length];
        
        // Kutunun stilini temizle ve reklamı yerleştir
        box.style.background = "transparent";
        box.style.border = "none";
        box.style.padding = "0";
        box.innerHTML = getAdHTML(ad).replace('class="ad-box-dynamic"', ''); // İç div'e gerek yok
    });
};
// --- REKLAM YÖNETİM SİSTEMİ BİTİŞ ---

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper: Tarih Formatla
const formatDate = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
};

// --- SAYFA KONTROLÜ ---
// --- SAYFA KONTROLÜ (DÜZELTİLDİ) ---
// URL yerine sayfadaki benzersiz elementi kontrol ediyoruz.
// Böylece Clean URL (post.html yazmayan linkler) olsa bile doğru çalışır.
const detailElement = document.getElementById('post-content-area');
const isDetailPage = detailElement !== null;

const loadRelatedPosts = async (currentPostId) => {
    const relatedGrid = document.getElementById('related-posts-grid');
    if (!relatedGrid) return;

    try {
        // Tarayıcı hafızasında veri var mı kontrol et
        let posts = JSON.parse(sessionStorage.getItem('related_posts_cache'));

        if (!posts) {
            // Yoksa çek ve hafızaya at (Sadece 6 tane çekmek yeterli)
            const q = query(collection(db, "blog_posts"), limit(6));
            const snapshot = await getDocs(q);
            posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            sessionStorage.setItem('related_posts_cache', JSON.stringify(posts));
        }

        // Şu anki yazıyı listeden çıkar ve karıştır
        const filtered = posts.filter(p => p.id !== currentPostId);
        const shuffled = filtered.sort(() => 0.5 - Math.random()).slice(0, 3);

        relatedGrid.innerHTML = shuffled.map(post => {
            const linkUrl = post.slug ? `/blog/${post.slug}` : `/blog/post.html?id=${post.id}`;
            return `
                <a href="${linkUrl}" class="blog-card" style="font-size: 0.9rem; min-height: auto;">
                    <div style="height: 140px; overflow: hidden;">
                        <img src="${post.imageUrl}" class="blog-img" style="height: 100%; object-fit: cover;">
                    </div>
                    <div class="blog-info" style="padding: 15px;">
                        <span class="blog-cat" style="font-size: 0.7rem; color: var(--primary-color);">${post.category}</span>
                        <h4 class="blog-title" style="font-size: 1rem; margin: 5px 0; color: white;">${post.title}</h4>
                    </div>
                </a>`;
        }).join('');

    } catch (error) { console.error("Önerilenler hatası:", error); }
};

document.addEventListener('DOMContentLoaded', async () => {

    // Reklamları çek ve sabit kutuları doldur
    await fetchAds();
    fillStaticAds();

    // --- REKLAM ALANLARINI DOLDUR (YENİ) ---
    // --- REKLAM ALANLARINI DOLDUR (RESPONSIVE) ---
    // --- 2. Kısım: initAds (Sabit ve Responsive Kutular için) ---
    const initAds = async () => {
        const adBoxes = document.querySelectorAll('.ad-box');
        if (adBoxes.length === 0) return;

        // 1. KONTROL: Eğer reklamlar fetchAds ile zaten çekilmişse tekrar Firebase'e gitme
        if (globalAds && globalAds.length > 0) {
            fillStaticAds(); // Mevcut veriyi kutulara yerleştirir
            return;
        }

        // 2. YÜKLEME: Eğer bellek boşsa veriyi çek ve yerleştir
        try {
            await fetchAds(); // Reklamları bir kez çeker
            fillStaticAds();
        } catch (error) {
            console.error("Reklamlar yüklenirken hata:", error);
            // Hata olursa kutuları gizle ki boş kalmasın
            adBoxes.forEach(box => box.style.display = 'none');
        }
    };

    // Fonksiyonu başlat
    initAds();
    
    // --- GÜNCEL TARİHİ GÖSTER ---
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        const today = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        currentDateElement.textContent = today.toLocaleDateString('tr-TR', options);
    }
    // --- TOPLAM YAZI SAYISINI ÇEK (İNCE BİLGİ ÇUBUĞU) ---
    try {
        const totalPostsQuery = query(collection(db, "blog_posts"));
        const totalPostsSnap = await getDocs(totalPostsQuery);
        const postCount = totalPostsSnap.size;
        const postCountElement = document.getElementById('total-posts-count');
        if (postCountElement) {
            postCountElement.textContent = postCount;
        }
    } catch (error) {
        console.error("Yazı sayısı çekilemedi:", error);
    }

    // --- TOPLAM OKUR SAYISINI ÇEK (TÜM YAZILARIN viewCount TOPLAMI) ---
    try {
        const allPostsSnap = await getDocs(collection(db, "blog_posts"));
        let totalViews = 0;
        allPostsSnap.forEach(doc => {
            totalViews += doc.data().viewCount || 0;
        });
        const readersElement = document.getElementById('total-readers-count');
        if (readersElement) {
            readersElement.textContent = totalViews.toLocaleString('tr-TR');
        }
    } catch (error) {
        console.error("Okur sayısı çekilemedi:", error);
    }

    // --- LİSTELEME SAYFASI İŞLEMLERİ ---
    if (!isDetailPage) {
        const grid = document.getElementById('posts-grid');
        const catContainer = document.getElementById('category-filters');
        
        // --- SLIDER MANTIĞI ---
        const sliderWrapper = document.getElementById('slider-wrapper');
        const dotsContainer = document.getElementById('slider-dots');
        
        if (sliderWrapper) {
            try {
                const sliderQuery = query(collection(db, "blog_posts"), orderBy("createdAt", "desc"), limit(5));
                const sliderSnap = await getDocs(sliderQuery);
                
                if (!sliderSnap.empty) {
                    let sliderHTML = '';
                    let dotsHTML = '';
                    let slidesCount = 0;

                    sliderSnap.forEach((doc, index) => {
                        const post = doc.data();
                        slidesCount++;
                        const postSlug = post.slug ? `/blog/${post.slug}` : `/blog/post.html?id=${doc.id}`;
                        sliderHTML += `
                            <div class="slide-item">
                                <img src="${post.imageUrl}" class="slide-bg" onerror="this.src='https://via.placeholder.com/1200x600?text=Lianchez'">
                                <div class="slide-content">
                                    <div class="container">
                                        <span class="slide-cat">${post.category}</span>
                                        <h2 class="slide-title">${post.title}</h2>
                                        <p class="slide-summary">${post.summary}</p>
                                        <a href="${postSlug}" class="slide-btn">Devamını Oku</a>
                                    </div>
                                </div>
                            </div>
                        `;
                        dotsHTML += `<div class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`;
                    });

                    sliderWrapper.innerHTML = sliderHTML;
                    dotsContainer.innerHTML = dotsHTML;

                    // Slider Hareketi
                    let currentSlide = 0;
                    const slides = document.querySelectorAll('.slide-item');
                    const dots = document.querySelectorAll('.dot');
                    const totalSlides = slides.length;

                    const updateSlider = () => {
                        sliderWrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
                        dots.forEach(d => d.classList.remove('active'));
                        if(dots[currentSlide]) dots[currentSlide].classList.add('active');
                    };

                    const nextSlide = () => {
                        currentSlide = (currentSlide + 1) % totalSlides;
                        updateSlider();
                    };

                    const prevSlide = () => {
                        currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
                        updateSlider();
                    };

                    document.getElementById('next-slide').addEventListener('click', () => { nextSlide(); resetTimer(); });
                    document.getElementById('prev-slide').addEventListener('click', () => { prevSlide(); resetTimer(); });

                    dots.forEach(dot => {
                        dot.addEventListener('click', (e) => {
                            currentSlide = parseInt(e.target.dataset.index);
                            updateSlider();
                            resetTimer();
                        });
                    });

                    let slideInterval = setInterval(nextSlide, 5000);
                    const resetTimer = () => { clearInterval(slideInterval); slideInterval = setInterval(nextSlide, 5000); };
                } else {
                    sliderWrapper.innerHTML = '<p style="color:white; text-align:center; padding:50px;">Öne çıkan yazı bulunamadı.</p>';
                }
            } catch (error) { console.error("Slider hatası:", error); }
        }

        // blog.js içindeki Yazı Listeleme Bölümü (GÜNCEL)

        let lastVisible = null; // En son yüklenen dökümanı takip eder
        let allLoadedPosts = []; // Filtreleme için tüm yüklenenleri tutar
        const POSTS_PER_PAGE = 12;

        const loadPosts = async (isFirstLoad = true) => {
            const grid = document.getElementById('posts-grid');
            const loadMoreContainer = document.getElementById('load-more-container');
            const loadMoreBtn = document.getElementById('load-more-btn');

            try {
                if (isFirstLoad) {
                    grid.innerHTML = '<div class="loader-placeholder">Yazılar yükleniyor...</div>';
                    lastVisible = null;
                    allLoadedPosts = [];
                }

                // Sorguyu oluştur
                let q;
                if (lastVisible) {
                    q = query(collection(db, "blog_posts"), orderBy("createdAt", "desc"), startAfter(lastVisible), limit(POSTS_PER_PAGE));
                } else {
                    q = query(collection(db, "blog_posts"), orderBy("createdAt", "desc"), limit(POSTS_PER_PAGE));
                }

                const snapshot = await getDocs(q);

                if (snapshot.empty && isFirstLoad) {
                    grid.innerHTML = '<p style="text-align:center; width:100%;">Henüz blog yazısı yok.</p>';
                    loadMoreContainer.style.display = 'none';
                    return;
                }

                // Son dökümanı güncelle (pagination için)
                lastVisible = snapshot.docs[snapshot.docs.length - 1];

                // Gelen verileri işle
                const newPosts = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    data.id = doc.id;
                    data.readTime = calculateReadTime(data.content || '');
                    newPosts.push(data);
                    allLoadedPosts.push(data);
                });

                // Ekrana bas
                renderPosts(newPosts, isFirstLoad);

                // "Daha Fazla" butonunu göster/gizle
                if (snapshot.docs.length < POSTS_PER_PAGE) {
                    loadMoreContainer.style.display = 'none';
                } else {
                    loadMoreContainer.style.display = 'block';
                }

            } catch (error) {
                console.error("Yükleme hatası:", error);
                grid.innerHTML = '<p>Yazılar yüklenirken hata oluştu.</p>';
            }
        };

        // blog.js içindeki renderPosts fonksiyonunun REKLAM DESTEKLİ hali
        const renderPosts = (posts, clearGrid = true) => {
            const grid = document.getElementById('posts-grid');
            if (clearGrid) grid.innerHTML = '';

            posts.forEach((post, index) => {
                const views = post.viewCount || 0;
                const card = document.createElement('a');
                const linkUrl = post.slug ? `/blog/${post.slug}` : `/blog/post.html?id=${post.id}`;
                card.href = linkUrl;
                card.className = 'blog-card';
                card.setAttribute('data-category', post.category);
                card.innerHTML = `
                    <div class="blog-img-wrapper">
                        <img src="${post.imageUrl}" alt="${post.title}" class="blog-img" onerror="this.src='https://via.placeholder.com/400x200?text=Lianchez'">
                    </div>
                    <div class="blog-info">
                        <span class="blog-cat">${post.category}</span>
                        <h3 class="blog-title">${post.title}</h3>
                        <p class="blog-summary">${post.summary}</p>
                        <div class="blog-meta" style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <span>${formatDate(post.createdAt)}</span> • 
                                <span style="color: var(--primary-color); font-weight:bold;">${post.readTime}</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:4px; font-size:0.8rem; color:#888;">
                                <span>👁️ ${views}</span>
                            </div>
                        </div>
                    </div>
                `;
                grid.appendChild(card);

                // --- REKLAM MANTIĞI GERİ GELDİ ---
                // Her 4 postta bir reklam göster (Eğer globalAds yüklüyse)
                // clearGrid false ise (yani "Daha Fazla"ya basıldıysa) index üzerinden hesaplama devam eder
                const globalIndex = grid.querySelectorAll('.blog-card:not(.ad-card-in-grid)').length;
                if (globalIndex % 4 === 0 && globalAds && globalAds.length > 0) {
                    // BURASI DEĞİŞTİ: index % length yerine doğrudan Math.random() kullanıyoruz
                    const randomAd = globalAds[Math.floor(Math.random() * globalAds.length)];
                    
                    const adCard = document.createElement('div');
                    adCard.className = 'blog-card ad-card-in-grid';
                    adCard.style.cssText = "border: 2px dashed #333; background: #000; cursor: pointer;"; 
                    adCard.innerHTML = `
                        <a href="${randomAd.linkUrl}" target="_blank" rel="nofollow" style="display:block; height:100%; text-decoration:none;">
                            <div style="height:200px; overflow:hidden;">
                                <img src="${randomAd.mobileImage}" style="width:100%; height:100%; object-fit:cover;">
                            </div>
                            <div class="blog-info" style="text-align:center; padding:20px;">
                                <h3 class="blog-title" style="margin:0; font-size:1.1rem;">${randomAd.title}</h3>
                                <span class="blog-cat" style="margin-top:10px; background:#444;">SPONSORLU</span>
                            </div>
                        </a>`;
                    grid.appendChild(adCard);
                }
            });
        };

        // Okuma süresi yardımcısı
        const calculateReadTime = (htmlContent) => {
            const text = htmlContent.replace(/<[^>]*>/g, '');
            const wordCount = text.split(/\s+/).length;
            return Math.ceil(wordCount / 200) + ' dk okuma';
        };

        // Event Listeners
        document.getElementById('load-more-btn')?.addEventListener('click', () => loadPosts(false));

        // Başlatma (Listeleme sayfasındaysak)
        if (!isDetailPage) {
            loadPosts(true);
        }

    } 
    
    // --- DETAY SAYFASI İŞLEMLERİ ---
    // --- DETAY SAYFASI İŞLEMLERİ (YENİ SİSTEM) ---
    else {
        const contentArea = document.getElementById('post-content-area');
        
        // Statik sayfa mı yoksa dinamik post.html mi?
        // Cloud Function tarafından oluşturulan statik sayfalarda
        // window.__STATIC_POST_ID__ değişkeni tanımlıdır.
        const isStaticPage = typeof window.__STATIC_POST_ID__ !== 'undefined';
    
        // 1. URL'den Slug veya ID'yi Al
        const pathSegments = window.location.pathname.split('/');
        const lastSegment = pathSegments[pathSegments.length - 1];
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
    
        // Statik sayfada ID ve slug zaten biliniyor
        let resolvedPostId = isStaticPage ? window.__STATIC_POST_ID__ : null;
        let resolvedSlug = isStaticPage ? window.__STATIC_POST_SLUG__ : null;
    
        if (!isStaticPage && (!lastSegment || lastSegment === 'post.html') && !urlId) {
            window.location.href = '/blog/index.html';
            return;
        }
    
        try {
            let docSnap;
            let currentPostId = resolvedPostId;
    
            if (!isStaticPage) {
                // Dinamik yükleme (eski post.html?id= sistemi veya slug)
                if (urlId) {
                    const docRef = doc(db, "blog_posts", urlId);
                    docSnap = await getDoc(docRef);
                    if (docSnap.exists()) currentPostId = docSnap.id;
                } else {
                    const q = query(collection(db, "blog_posts"), where("slug", "==", lastSegment));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        docSnap = querySnapshot.docs[0];
                        currentPostId = docSnap.id;
                    }
                }
    
                if (docSnap && docSnap.exists()) {
                    const post = docSnap.data();
    
                    // Schema.org
                    const schemaData = {
                        "@context": "https://schema.org",
                        "@type": "BlogPosting",
                        "headline": post.title,
                        "description": post.summary,
                        "image": post.imageUrl,
                        "author": { "@type": "Person", "name": post.author || "Lianchez" },
                        "datePublished": new Date(post.createdAt.seconds * 1000).toISOString()
                    };
                    const script = document.createElement('script');
                    script.type = 'application/ld+json';
                    script.text = JSON.stringify(schemaData);
                    document.head.appendChild(script);
    
                    // SEO
                    document.title = `${post.title} | Lianchez Blog`;
                    const metaDesc = document.querySelector('meta[name="description"]');
                    if (metaDesc) metaDesc.setAttribute("content", post.metaDescription || post.summary);
    
                    // Canonical
                    let canonicalLink = document.querySelector("link[rel='canonical']");
                    if (!canonicalLink) {
                        canonicalLink = document.createElement("link");
                        canonicalLink.setAttribute("rel", "canonical");
                        document.head.appendChild(canonicalLink);
                    }
                    canonicalLink.setAttribute("href", `https://www.lianchez.com/blog/${post.slug || currentPostId}`);
    
                    // İçerik bas (reklam enjeksiyonuyla birlikte)
                    let formattedContent = post.content;
                    if (typeof globalAds !== 'undefined' && globalAds.length > 0) {
                        let paragraphs = formattedContent.split('</p>');
                        for (let i = 1; i < paragraphs.length; i += 4) {
                            const randomIndex = Math.floor(Math.random() * globalAds.length);
                            const adHTML = getAdHTML(globalAds[randomIndex]);
                            paragraphs[i] += adHTML;
                        }
                        formattedContent = paragraphs.join('</p>');
                    }
    
                    const currentPageUrl = encodeURIComponent(window.location.href);
                    const shareTitle = encodeURIComponent(post.title);
    
                    contentArea.innerHTML = `
                        <span class="blog-cat" style="font-size:1rem;">${post.category}</span>
                        <h1 class="post-main-title">${post.title}</h1>
                        <div style="color:#888; margin-bottom:30px; display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
                            <span>${formatDate(post.createdAt)}</span> •
                            <span>Yazar: ${post.author || 'Lianchez'}</span> •
                            <span>👁️ ${post.viewCount || 0} Görüntülenme</span>
                        </div>
                        <img src="${post.imageUrl}" class="post-header-img" alt="${post.title}">
                        <div class="post-body">${formattedContent}</div>
                        <div class="share-section-container">
                            <h4 class="share-title">Bu Yazıyı Paylaş:</h4>
                            <div class="share-buttons">
                                <a href="https://api.whatsapp.com/send?text=${shareTitle}%20${currentPageUrl}" target="_blank" class="share-btn whatsapp"><span>WhatsApp</span></a>
                                <a href="https://twitter.com/intent/tweet?text=${shareTitle}&url=${currentPageUrl}" target="_blank" class="share-btn twitter"><span>X</span></a>
                                <a href="https://www.facebook.com/sharer/sharer.php?u=${currentPageUrl}" target="_blank" class="share-btn facebook"><span>Facebook</span></a>
                            </div>
                        </div>
                    `;
                } else {
                    contentArea.innerHTML = '<h2>Yazı bulunamadı.</h2><a href="/blog/index.html" style="color:red;">Geri Dön</a>';
                    return;
                }
            }
            
            // ==============================================
            // ORTAK: Hem statik hem dinamik sayfalarda çalışır
            // Görüntülenme sayacı + yorumlar + ilgili yazılar
            // ==============================================
            
            if (currentPostId) {
                // Görüntülenme Sayacı
                const viewKey = `viewed_${currentPostId}`;
                if (!sessionStorage.getItem(viewKey)) {
                    updateDoc(doc(db, "blog_posts", currentPostId), { viewCount: increment(1) });
                    sessionStorage.setItem(viewKey, 'true');
                    
                    // Statik sayfada ekranda görünen sayıyı da güncelle
                    const viewDisplay = document.getElementById('view-count-display');
                    if (viewDisplay) {
                        viewDisplay.textContent = parseInt(viewDisplay.textContent || 0) + 1;
                    }
                }
    
                // İlgili Yazılar
                loadRelatedPosts(currentPostId);
    
                // Yorum Editörü
                let commentQuill;
                try {
                    commentQuill = new Quill('#comment-editor', {
                        theme: 'snow',
                        placeholder: 'Düşüncelerinizi paylaşın...',
                        modules: { toolbar: [['bold', 'italic', 'underline'], ['clean']] }
                    });
                } catch(e) { console.error(e); }
    
                // Captcha
                let captchaCorrectAnswer = 0;
                const generateCaptcha = () => {
                    const num1 = Math.floor(Math.random() * 10) + 1;
                    const num2 = Math.floor(Math.random() * 10) + 1;
                    captchaCorrectAnswer = num1 + num2;
                    const questionEl = document.getElementById('captcha-question');
                    if(questionEl) questionEl.textContent = `${num1} + ${num2} = ?`;
                };
                generateCaptcha();
    
                // Yorum Gönderme
                const commentForm = document.getElementById('comment-form');
                if(commentForm) {
                    commentForm.onsubmit = async (e) => {
                        e.preventDefault();
                        const captchaInput = parseInt(document.getElementById('captcha-input').value);
                        if (captchaInput !== captchaCorrectAnswer) {
                            alert("Güvenlik sorusu yanlış!");
                            generateCaptcha();
                            return;
                        }
                        const author = document.getElementById('comment-author').value;
                        const content = commentQuill.root.innerHTML;
                        if (commentQuill.getText().trim().length === 0) { alert("Lütfen bir yorum yazın."); return; }
                        const btn = commentForm.querySelector('button');
                        btn.textContent = "Gönderiliyor...";
                        btn.disabled = true;
                        try {
                            await addDoc(collection(db, "comments"), {
                                postId: currentPostId,
                                author: author,
                                content: content,
                                status: "pending",
                                createdAt: serverTimestamp()
                            });
                            alert("Yorumunuz başarıyla gönderildi! Onaylandıktan sonra yayınlanacaktır.");
                            commentForm.reset();
                            commentQuill.setContents([]);
                            generateCaptcha();
                        } catch (error) {
                            alert("Yorum gönderilemedi.");
                        } finally {
                            btn.textContent = "Onay İçin Gönder";
                            btn.disabled = false;
                        }
                    };
                }
    
                // Onaylı Yorumları Listele
                const commentsList = document.getElementById('approved-comments-list');
                if(commentsList) {
                    try {
                        const qComments = query(
                            collection(db, "comments"),
                            where("postId", "==", currentPostId),
                            where("status", "==", "approved"),
                            orderBy("createdAt", "desc")
                        );
                        const snapComments = await getDocs(qComments);
                        if(snapComments.empty) {
                            commentsList.innerHTML = '<p style="color:#888;">Henüz yorum yok. İlk yorumu sen yap!</p>';
                        } else {
                            commentsList.innerHTML = '';
                            snapComments.forEach(doc => {
                                const c = doc.data();
                                const div = document.createElement('div');
                                div.style.cssText = "background:var(--card-bg); padding:15px; margin-bottom:15px; border-radius:8px; border:1px solid var(--border-color);";
                                div.innerHTML = `
                                    <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                        <strong style="color:var(--primary-color);">${c.author}</strong>
                                        <small style="color:#666;">${formatDate(c.createdAt)}</small>
                                    </div>
                                    <div style="color:#ddd;">${c.content}</div>
                                `;
                                commentsList.appendChild(div);
                            });
                        }
                    } catch (err) { console.error("Yorum listesi hatası:", err); }
                }
            }
    
        } catch (error) {
            console.error(error);
            if (!isStaticPage && contentArea) {
                contentArea.innerHTML = '<p>İçerik yüklenirken hata oluştu.</p>';
            }
        }
    }



    // --- ORTAK: HAMBURGER MENÜ ---
    const openSidebarBtn = document.getElementById('open-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('blog-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function toggleSidebar(show) {
        if(!sidebar) return;
        if (show) {
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    if(openSidebarBtn) openSidebarBtn.addEventListener('click', () => toggleSidebar(true));
    if(closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => toggleSidebar(false));
    if(overlay) overlay.addEventListener('click', () => toggleSidebar(false));
    window.closeSidebar = () => toggleSidebar(false);

    initSocialWidget();

});

// --- BÜLTEN ABONELİK SİSTEMİ (SLIM BAR) ---
const initNewsletter = () => {
    const subscribeForm = document.getElementById('blog-subscribe-form');
    if (subscribeForm) {
        subscribeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('subscriber-email');
            const popup = document.getElementById('subscribe-status');
            const btn = subscribeForm.querySelector('.special-btn');

            if(!emailInput.value) return;

            // Buton durumunu güncelle
            btn.disabled = true;
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<span>...</span>';

            try {
                // newsletter_subscribers koleksiyonuna kaydet
                await addDoc(collection(db, "newsletter_subscribers"), {
                    email: emailInput.value,
                    source: "blog_slim_bar",
                    createdAt: serverTimestamp()
                });

                // Başarı Bildirimi
                if (popup) {
                    popup.textContent = "🚀 Listeye eklendiniz! Teşekkürler.";
                    popup.style.background = "#22c55e";
                    popup.style.display = "block";
                    setTimeout(() => { popup.style.display = "none"; }, 4000);
                }
                
                subscribeForm.reset();
            } catch (error) {
                console.error("Abonelik hatası:", error);
                if (popup) {
                    popup.textContent = "Hata oluştu, lütfen tekrar deneyin.";
                    popup.style.background = "#ef4444";
                    popup.style.display = "block";
                    setTimeout(() => { popup.style.display = "none"; }, 4000);
                }
            } finally {
                btn.innerHTML = originalContent;
                btn.disabled = false;
            }
        });
    }
};

// Sayfa yüklendiğinde çalıştır
initNewsletter();

// --- KATEGORİ FİLTRELEME FONKSİYONU ---
window.filterPosts = (category) => {
    // Butonları güncelle
    const allBtns = document.querySelectorAll('.cat-btn');
    allBtns.forEach(btn => {
        if (btn.getAttribute('data-cat') === category) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Grid'deki kartları filtrele (reklam kartlarını hariç tut)
    const posts = document.querySelectorAll('.blog-card:not(.ad-card-in-grid)');
    posts.forEach(card => {
        const cardCat = card.getAttribute('data-category');
        if (category === 'all' || cardCat === category) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
};

// Kategori butonlarına tıklama olaylarını bağla (DOM yüklendikten sonra)
document.addEventListener('DOMContentLoaded', () => {
    const categoryButtons = document.querySelectorAll('.cat-btn');
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = btn.getAttribute('data-cat');
            if (category) {
                window.filterPosts(category);
            }
        });
    });
});

// --- SOSYAL MEDYA WIDGET (KAPATILABİLİR) ---
const initSocialWidget = () => {
    const widget = document.getElementById('social-follow-widget');
    const closeBtn = document.getElementById('close-widget');
    
    if (!widget) return;
    
    const isClosed = sessionStorage.getItem('social_widget_closed');
    
    if (isClosed === 'true') {
        widget.style.display = 'none';
        return;
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            widget.style.display = 'none';
            sessionStorage.setItem('social_widget_closed', 'true');
        });
    }
};