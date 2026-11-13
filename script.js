import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp, 
    query, 
    orderBy, 
    getDocs, 
    limit 
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


/**
 * =================================================================
 * GENERIC SLIDER FUNCTION
 * Creates a fully functional, auto-playing, and controllable slider.
 * =================================================================
 */
/**
 * =================================================================
 * GENERIC SLIDER FUNCTION (Blog Yapısı İle Birebir Aynı)
 * =================================================================
 */
const createSlider = (sliderId, data) => {
    const sliderSection = document.getElementById(sliderId);
    if (!sliderSection) {
        console.error(`Slider section with ID "${sliderId}" not found.`);
        return;
    }

    const wrapper = sliderSection.querySelector('.slider-wrapper');
    const prevBtn = sliderSection.querySelector('.prev-btn');
    const nextBtn = sliderSection.querySelector('.next-btn');
    const dotsContainer = sliderSection.querySelector('.slider-dots');

    if (!wrapper || !prevBtn || !nextBtn || !dotsContainer) {
        console.error(`Slider component missing inside "#${sliderId}".`);
        return;
    }

    if (data.length === 0) {
        wrapper.innerHTML = '<div class="slide-item" style="display:flex; justify-content:center; align-items:center; color:#888; font-size: 1.2rem; text-align: center; padding: 20px; background:#000;">Bu bölümde gösterilecek içerik henüz yok.</div>';
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        dotsContainer.style.display = 'none';
        return;
    }

    // --- YAPISAL DEĞİŞİKLİK BURADA ---
    // slide-content div'i görselin üzerine biner.
    // container div'i ise yazıları ortalar ve hizalar.
    wrapper.innerHTML = data.map(item => `
        <div class="slide-item">
            <img src="${item.imageUrl}" class="slide-bg" loading="lazy" onerror="this.style.backgroundColor='#1a1a1a';">
            <div class="slide-content">
                <div class="container">
                    ${item.category ? `<span class="slide-cat">${item.category}</span>` : ''}
                    <h2 class="slide-title">${item.title}</h2>
                    <p class="slide-summary">${item.description}</p>
                    ${item.linkUrl ? `<a href="${item.linkUrl}" class="slide-btn" target="_blank">İncele</a>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    
    dotsContainer.innerHTML = data.map((_, index) => `<span class="dot" data-slide="${index}"></span>`).join('');

    // --- State Değişkenleri ---
    let currentSlide = 0;
    const slides = wrapper.querySelectorAll('.slide-item');
    const dots = dotsContainer.querySelectorAll('.dot');
    const slideCount = slides.length;
    let autoPlayInterval;

    // --- Slider Hareket Fonksiyonları ---
    const goToSlide = (slideIndex) => {
        wrapper.style.transform = `translateX(-${slideIndex * 100}%)`;
        dots.forEach(dot => dot.classList.remove('active'));
        if(dots[slideIndex]) {
            dots[slideIndex].classList.add('active');
        }
        currentSlide = slideIndex;
    };

    const nextSlide = () => {
        const nextIndex = (currentSlide + 1) % slideCount;
        goToSlide(nextIndex);
    };

    const prevSlide = () => {
        const prevIndex = (currentSlide - 1 + slideCount) % slideCount;
        goToSlide(prevIndex);
    };
    
    const startAutoPlay = () => {
        if(slideCount > 1) {
            stopAutoPlay();
            autoPlayInterval = setInterval(nextSlide, 5000);
        }
    };
    
    const stopAutoPlay = () => {
        clearInterval(autoPlayInterval);
    };

    // --- Event Listener'lar ---
    nextBtn.addEventListener('click', () => {
        nextSlide();
        stopAutoPlay();
        startAutoPlay();
    });

    prevBtn.addEventListener('click', () => {
        prevSlide();
        stopAutoPlay();
        startAutoPlay();
    });

    dots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            const slideIndex = parseInt(e.target.dataset.slide, 10);
            goToSlide(slideIndex);
            stopAutoPlay();
            startAutoPlay();
        });
    });
    
    if (slideCount <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        dotsContainer.style.display = 'none';
    }
    
    // --- Başlatma ---
    goToSlide(0);
    startAutoPlay();
};

/**
 * Lianchez Canlı Durum ve Akıllı Karşılama Sistemi
 */
const initStatusSystem = () => {
    const statusEl = document.getElementById('dynamic-status');
    const dotEl = document.querySelector('.status-dot');
    if (!statusEl) return;

    const hour = new Date().getHours();
    let message = "";
    let dotColor = "#22c55e"; // Varsayılan Yeşil (Aktif)

    if (hour >= 5 && hour < 12) {
        message = "Günaydın! Kahve & Kod zamanı ☕";
    } else if (hour >= 12 && hour < 18) {
        message = "Tünaydın! Projeler geliştiriliyor 🚀";
    } else if (hour >= 18 && hour < 23) {
        message = "İyi akşamlar! Lianchez yayında 🌆";
    } else {
        // Gece 23:00 - 05:00 arası "Uyku/Dinlenme" modu
        message = "Gece mesaisi! Fikirler demleniyor 🦉";
        dotColor = "#facc15"; // Sarı (Meşgul/Gece Modu)
    }

    statusEl.innerHTML = message;
    if (dotEl) {
        dotEl.style.backgroundColor = dotColor;
        dotEl.style.boxShadow = `0 0 8px ${dotColor}`;
    }
};

// Sayfa yüklendiğinde ve her 1 dakikada bir kontrol et (saat değişimi için)
initStatusSystem();
setInterval(initStatusSystem, 60000);

/**
 * Lianchez Parçalı Işık Takibi (Glow Effect)
 */
const initCursorGlow = () => {
    let glow = document.querySelector('.cursor-glow');
    if (!glow) {
        glow = document.createElement('div');
        glow.className = 'cursor-glow';
        document.body.appendChild(glow);
    }

    let rotation = 0;

    const updateGlow = (x, y) => {
        // Her harekette çok hafif döndürerek parçaların yerini değiştiriyoruz
        rotation += 0.5; 
        requestAnimationFrame(() => {
            glow.style.left = `${x}px`;
            glow.style.top = `${y}px`;
            glow.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        });
    };

    window.addEventListener('mousemove', (e) => updateGlow(e.clientX, e.clientY));

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            updateGlow(e.touches[0].clientX, e.touches[0].clientY);
        }
    });
};

initCursorGlow();

// Firebase üzerinden son blog yazılarını çekme fonksiyonu
const initLatestBlogPosts = async () => {
    const blogContainer = document.getElementById('blog-posts-container');
    if (!blogContainer) return;

    try {
        // En güncel 3 yazıyı çek
        const q = query(collection(db, "blog_posts"), orderBy("createdAt", "desc"), limit(3));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            blogContainer.innerHTML = '<p style="text-align:center; color:#888;">Henüz blog yazısı yayınlanmadı.</p>';
            return;
        }

        let blogHTML = '';
        querySnapshot.forEach((doc) => {
            const post = doc.data();
            // Linkleme yaparken blog klasörü altında olduğunu unutma
            const linkUrl = post.slug ? `/blog/${post.slug}` : `/blog/post.html?id=${doc.id}`;
            
            blogHTML += `
                <div class="service-item" style="text-align: left; display: flex; flex-direction: column;">
                    <img src="${post.imageUrl}" alt="${post.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;" loading="lazy">
                    <span style="color: var(--primary-color); font-size: 0.8rem; font-weight: bold; text-transform: uppercase;">${post.category || 'Teknoloji'}</span>
                    <h3 style="font-size: 1.3rem; margin: 10px 0; color: #fff;">${post.title}</h3>
                    <p style="font-size: 0.95rem; color: var(--text-muted-color); flex-grow: 1;">
                        ${post.summary ? post.summary.substring(0, 100) : ''}...
                    </p>
                    <a href="${linkUrl}" style="margin-top: 15px; color: var(--primary-color); font-weight: bold; text-decoration: none;">Devamını Oku →</a>
                </div>
            `;
        });

        blogContainer.innerHTML = blogHTML;
    } catch (error) {
        console.error("Blog yükleme hatası:", error);
        blogContainer.innerHTML = '<p style="text-align:center; color:#888;">Yazılar yüklenirken bir sorun oluştu.</p>';
    }
};

// Blog bandını başlatan fonksiyon
const initBlogTicker = async () => {
    const tickerWrapper = document.getElementById('blog-ticker-wrapper');
    if (!tickerWrapper) return;

    try {
        const q = query(collection(db, "blog_posts"), orderBy("createdAt", "desc"), limit(5));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            tickerWrapper.innerHTML = '<div class="ticker-item active">Yeni içerikler çok yakında!</div>';
            return;
        }

        const tickerData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                title: data.title,
                readTime: data.readTime || "3 dk", // Firestore'da yoksa varsayılan 3 dk
                url: data.slug ? `/blog/${data.slug}` : `/blog/post.html?id=${doc.id}`
            };
        });

        tickerWrapper.innerHTML = tickerData.map((item, index) => `
            <div class="ticker-item ${index === 0 ? 'active' : ''}">
                <a href="${item.url}" class="ticker-link">${item.title}</a>
                <span class="ticker-meta">| <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/></svg> ${item.readTime} okuma</span>
            </div>
        `).join('');

        // Bandın otomatik dönme animasyonu
        let currentTickerIndex = 0;
        const items = tickerWrapper.querySelectorAll('.ticker-item');
        
        if (items.length > 1) {
            setInterval(() => {
                items[currentTickerIndex].classList.remove('active');
                currentTickerIndex = (currentTickerIndex + 1) % items.length;
                items[currentTickerIndex].classList.add('active');
            }, 4000); // 4 saniyede bir değişir
        }

    } catch (error) {
        console.error("Ticker hatası:", error);
    }
};

// DOMContentLoaded içine eklemeyi unutma:
document.addEventListener('DOMContentLoaded', () => {
    initBlogTicker(); // Yeni fonksiyonu çağır
    // ... diğer init fonksiyonların
});


/**
 * =================================================================
 * DATA FETCHING AND SLIDER INITIALIZATION
 * =================================================================
 */

const initAnnouncementsSlider = async () => {
    try {
        const announcementsQuery = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(announcementsQuery);
        const announcementsData = querySnapshot.docs.map(doc => {
            const d = doc.data();
            return {
                title: d.title || 'Duyuru',
                description: d.text || '',
                imageUrl: d.imageUrl || '',
                linkUrl: d.linkUrl || '',
                category: 'Duyuru'
            };
        });
        createSlider('announcements-slider-section', announcementsData);
    } catch (error) {
        console.error("Error fetching announcements:", error);
    }
};

const initPortfolioSlider = async () => {
    try {
        const projectsQuery = query(collection(db, "projects"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(projectsQuery);
        const projectsData = querySnapshot.docs.map(doc => {
            const d = doc.data();
            return {
                title: d.title || 'Proje',
                description: d.description || '',
                imageUrl: d.imageUrl || '',
                linkUrl: d.linkUrl || '',
                category: 'Portfolyo'
            };
        });
        createSlider('portfolio-slider-section', projectsData);
    } catch (error) {
        console.error("Error fetching projects:", error);
    }
};


document.addEventListener('DOMContentLoaded', () => {

    initAnnouncementsSlider();
    initPortfolioSlider();
    initLatestBlogPosts();
    initBlogTicker();


    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('nav ul');
    const navLinks = document.querySelectorAll('.nav-link'); // Menü linkleri

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            // Hem menüye hem butona class ekle/çıkar
            navMenu.classList.toggle('open');
            menuToggle.classList.toggle('active');
            
            // Menü açıkken sayfanın kaymasını engelle (İsteğe bağlı)
            if (navMenu.classList.contains('open')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        // Menüdeki bir linke tıklandığında menüyü kapat
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('open');
                menuToggle.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    /**
     * Lianchez Dinamik Alt Metin Yazım Efekti
     */
    const initDynamicSubtext = () => {
        const textElement = document.getElementById('dynamic-subtext');
        if (!textElement) return;

        // Mevcut mesajlarını buraya aldım
        const messages = [
            "Web Tasarım Çözümleri",
            "Sosyal Medya Yönetimi",
            "Dijital Pazarlama Stratejileri",
            "Kurumsal Kimlik Tasarımı"
        ];

        let messageIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        let delay = 100; // Yazma hızı

        const type = () => {
            const currentMessage = messages[messageIndex];
            
            if (isDeleting) {
                // Silerken daha hızlı olsun
                charIndex--;
                delay = 50;
            } else {
                // Yazarken normal hız
                charIndex++;
                delay = 100;
            }

            // Metni bas ve sonuna imleç ekle
            textElement.innerHTML = currentMessage.substring(0, charIndex) + '<span class="typewriter-cursor"></span>';

            // Kelime tam yazıldıysa bekle ve silmeye başla
            if (!isDeleting && charIndex === currentMessage.length) {
                isDeleting = true;
                delay = 2500; // Kelime bittiğinde 2.5 saniye ekranda kalsın
            } 
            // Kelime tamamen silindiyse bir sonrakine geç
            else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                messageIndex = (messageIndex + 1) % messages.length;
                delay = 500; // Yeni kelimeye geçmeden önce yarım saniye boşluk
            }

            setTimeout(type, delay);
        };

        type();
    };

    initDynamicSubtext();


    
    
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        
        // Form Başlığı için Yeni Dinamik Metin Alanı
        const dynamicWordElement = document.getElementById('dynamic-word'); 
        const formInputs = contactForm.querySelectorAll('.form-input');
        const submitButton = contactForm.querySelector('.form-submit-button');
        const loaderIcon = submitButton.querySelector('.loader');
        const successIcon = submitButton.querySelector('.success');

        // *** BAŞLANGIÇ: YENİ DİNAMİK BAŞLIK MANTIĞI ***
        if (dynamicWordElement) {
            const phrases = [
                "Geri bildirimlerinizi iletebilirsiniz.",
                "Projeleriniz için detaylı teklif alabilirsiniz.",
                "Reklam ve sponsorluk başvurusu yapabilirsiniz.",
                "Kariyer fırsatları hakkında bilgi alabilirsiniz.",
                "Tüm sorularınızı ekibimize iletebilirsiniz."
            ];
            let phraseIndex = 0;
            
            // Başlangıçta ilk metni göster
            dynamicWordElement.textContent = phrases[0];

            function changePhrase() {
                dynamicWordElement.style.opacity = '0';
                dynamicWordElement.style.transform = 'translateY(10px)'; // Hafif aşağı kayma efekti
                setTimeout(() => {
                    phraseIndex = (phraseIndex + 1) % phrases.length;
                    dynamicWordElement.textContent = phrases[phraseIndex];
                    dynamicWordElement.style.opacity = '1';
                    dynamicWordElement.style.transform = 'translateY(0)'; // Yukarıdan gelme efekti
                }, 300);
            }
            // 3.5 saniyede bir değişsin
            setInterval(changePhrase, 3500); 
        }
        // *** BİTİŞ: YENİ DİNAMİK BAŞLIK MANTIĞI ***
        

        formInputs.forEach(input => {
            if (input.value.trim() !== '') input.classList.add('has-value');
            input.addEventListener('focus', function() { this.parentElement.classList.add('focused'); });
            input.addEventListener('blur', function() { this.parentElement.classList.remove('focused'); });
            input.addEventListener('input', function() {
                this.value.trim() !== '' ? this.classList.add('has-value') : this.classList.remove('has-value');
            });
            // Select elemanı için de değer kontrolü ekleyelim (özellikle form resetlendiğinde)
            if (input.tagName === 'SELECT') {
                 input.addEventListener('change', function() {
                    this.value.trim() !== '' ? this.classList.add('has-value') : this.classList.remove('has-value');
                });
            }
        });

        contactForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            // Tüm form alanlarını alalım
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value.trim();

            // Sıkı Kontrol: Eğer herhangi bir alan boşsa gönderimi durdur
            if (!name || !email || !phone || !subject || !message) {
                alert("Lütfen tüm alanları eksiksiz doldurunuz."); // Kullanıcıya uyarı ver
                return; // Fonksiyonu burada sonlandır, Firebase'e veri gönderme
            }

            submitButton.classList.add('loading');
            submitButton.disabled = true;
            loaderIcon.style.display = 'block';
            
            try {
                // **DEĞİŞİKLİK:** subject alanını ekledik
                await addDoc(collection(db, "contact_messages"), {
                    name: document.getElementById('name').value,
                    email: document.getElementById('email').value,
                    phone: document.getElementById('phone').value,
                    subject: subject, // YENİ ALAN
                    message: document.getElementById('message').value,
                    createdAt: serverTimestamp()
                });
                
                loaderIcon.style.display = 'none';
                successIcon.style.display = 'block';
                submitButton.classList.remove('loading');
                submitButton.classList.add('success');

                setTimeout(() => {
                    contactForm.reset();
                    // Seçim alanını varsayılan değere sıfırlamayı unutmayın
                    document.getElementById('subject').value = ''; 
                    formInputs.forEach(input => input.classList.remove('has-value'));
                    successIcon.style.display = 'none';
                    submitButton.classList.remove('success');
                    submitButton.disabled = false;
                }, 2000);

            } catch (error) {
                console.error("Error adding document: ", error);
                loaderIcon.style.display = 'none';
                submitButton.classList.remove('loading');
                submitButton.disabled = false;
                alert('Mesajınız gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
            }
        });
    }
});

/*
// Çarkıfelek Ayarları
const sectors = [
    { label: "%10 İndirim", color: "#e5ff00" },
    { label: "Ücretsiz SEO Analizi", color: "#2ffd06" },
    { label: "Ücretsiz Reklam Planlama", color: "#0011ff" },
    { label: "%20 İndirim", color: "#fd06bf" },
    { label: "1 Ay Sosyal Medya Yönetimi", color: "#ff7b00" },
    { label: "Ücretsiz Hosting", color: "#06d8fd" }
];

const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const arc = Math.PI / (sectors.length / 2);
let ang = 0;

// Çarkı Çiz
const drawSector = (sector, i) => {
    const angDeg = (180 / Math.PI) * ang;
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = sector.color;
    ctx.moveTo(150, 150);
    ctx.arc(150, 150, 150, arc * i, arc * (i + 1));
    ctx.lineTo(150, 150);
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.stroke();
    // Yazı
    ctx.translate(150, 150);
    ctx.rotate(arc * (i + 0.5));
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px Exo 2";
    ctx.fillText(sector.label, 140, 5);
    ctx.restore();
};

sectors.forEach(drawSector);

// Pop-up'ı Göster (Örn: 5 saniye sonra)
setTimeout(() => {
    if(!localStorage.getItem('wheel_played')) {
        document.getElementById('wheel-overlay').style.display = 'flex';
    }
}, 8000);

// Form ve Dönüş Mantığı
document.getElementById('wheel-lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('wheel-email').value;
    const spinBtn = document.getElementById('spin-button');
    
    spinBtn.disabled = true;
    spinBtn.innerText = "Dönüyor...";

    // Rastgele duruş açısı
    const randomSpin = Math.floor(Math.random() * 360) + 1440; // En az 4 tur
    canvas.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)';
    canvas.style.transform = `rotate(${randomSpin}deg)`;

    setTimeout(async () => {
        const actualDeg = randomSpin % 360;
        const sectorIndex = Math.floor((360 - actualDeg) / (360 / sectors.length)) % sectors.length;
        const result = sectors[sectorIndex].label;

        // Firebase'e kaydet
        try {
            await addDoc(collection(db, "wheel_leads"), {
                email: email,
                prize: result,
                createdAt: serverTimestamp()
            });
            alert(`Tebrikler! ${result} kazandınız. Detaylar e-postanıza gönderilecek.`);
            localStorage.setItem('wheel_played', 'true');
            document.getElementById('wheel-overlay').style.display = 'none';
        } catch (err) {
            console.error("Firebase Error:", err);
        }
    }, 4000);
});
*/

/**
 * Lianchez Akıllı Sekme Başlığı Yönetimi
 */
const initTabMessage = () => {
    const originalTitle = document.title;
    
    window.addEventListener("blur", () => {
        document.title = "Bizi Özlediniz mi? 👋";
    });
    
    window.addEventListener("focus", () => {
        document.title = "Hoş Geldiniz! ✨";
        setTimeout(() => {
            document.title = originalTitle;
        }, 2000);
    });
};

initTabMessage();

// Kapatma butonu
document.getElementById('wheel-close').onclick = () => {
    document.getElementById('wheel-overlay').style.display = 'none';
};