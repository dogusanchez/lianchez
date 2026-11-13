import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, setDoc, updateDoc, getDoc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

// --- Firebase Başlatma ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Global Değişkenler ---
let quill; // Blog Editörü için

// --- Yardımcı Fonksiyonlar ---
const formatDate = (timestamp) => {
    if (!timestamp) return 'Tarih Yok';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('tr-TR', { 
        day: 'numeric', month: 'long', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    }).format(date);
};

// Bildirim Gösterme (Toast)
const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-msg">${message}</div>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// --- LOGLAMA FONKSİYONU ---
const addLog = async (action, targetId = '-', details = '') => {
    const user = auth.currentUser;
    if (!user) return; 

    try {
        await addDoc(collection(db, "logs"), {
            action: action,      
            targetId: targetId,  
            details: details,    
            user: user.email,
            timestamp: serverTimestamp()
        });
        console.log("Log kaydı oluşturuldu:", action);
    } catch (error) {
        console.error("Log hatası:", error);
    }
};

// Buton Yükleniyor Animasyonu
const setButtonLoading = (btn, isLoading) => {
    if (!btn) return;
    if (isLoading) {
        btn.classList.add('loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
};

// --- Ana Uygulama Mantığı ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Admin Paneli Başlatılıyor...");

    // DOM Elementlerini Seç
    const elements = {
        loginContainer: document.getElementById('login-container'),
        adminPanel: document.getElementById('admin-panel'),
        loginForm: document.getElementById('login-form'),
        logoutBtn: document.getElementById('logout-btn'),
        menuItems: document.querySelectorAll('.menu-item[data-target]'),
        sections: document.querySelectorAll('.section'),
        pageTitle: document.getElementById('page-title'),
        hamburgerBtn: document.querySelector('.hamburger-btn'),
        sidebar: document.querySelector('.sidebar'),
        commentsList: document.getElementById('pending-comments-list'),
        pendingCommentsStat: document.getElementById('pending-comments-stat'),
        commentBadge: document.getElementById('comment-badge'),
        wheelLeadsList: document.getElementById('wheel-leads-list'),
        
        // İstatistikler
        totalProjects: document.getElementById('total-projects-stat'),
        totalMessages: document.getElementById('total-messages-stat'),
        totalAnnouncements: document.getElementById('total-announcements-stat'),
        totalBlogs: document.getElementById('total-blogs-stat'),
        totalWords: document.getElementById('total-words-stat'), 
        
        // Listeler
        projectsList: document.getElementById('projects-list'),
        messagesList: document.getElementById('messages-list'),
        announcementsList: document.getElementById('announcements-list'),
        wordsList: document.getElementById('words-list'), 
        
        // Formlar & Modallar
        modal: document.getElementById('add-project-modal'),
        openModalBtn: document.getElementById('show-add-project-modal-btn'),
        closeModalBtns: document.querySelectorAll('.close-modal, .close-modal-btn'),
        addProjectForm: document.getElementById('add-project-form'),
        addAnnouncementForm: document.getElementById('add-announcement-form'),
        
        // KELİME MODAL & BUTONLAR
        wordModal: document.getElementById('add-word-modal'),
        openWordModalBtn: document.getElementById('show-add-word-modal-btn'),
        closeWordModalBtns: document.querySelectorAll('.close-modal-word, .close-modal-word-btn'),
        addWordForm: document.getElementById('add-word-form'),

        // BLOG ELEMENTLERİ
        blogListView: document.getElementById('blog-list-view'),
        blogFormView: document.getElementById('blog-form-view'),
        toggleBlogBtn: document.getElementById('toggle-blog-view-btn'),
        blogPostsList: document.getElementById('blog-posts-list'),
        blogFormTitle: document.getElementById('blog-form-title'),
        blogIdInput: document.getElementById('blog-id'),
        blogForm: document.getElementById('blog-form'),
        cancelBlogBtn: document.getElementById('cancel-blog-btn')
    };

    // 1. Oturum Kontrolü (Auth Listener)
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Kullanıcı giriş yapmış:", user.email);
            elements.loginContainer.style.display = 'none';
            elements.adminPanel.style.display = 'flex';
            initDashboard();
        } else {
            console.log("Kullanıcı çıkış yapmış.");
            elements.loginContainer.style.display = 'flex';
            elements.adminPanel.style.display = 'none';
        }
    });

    // 2. Giriş Yapma İşlemi
    if(elements.loginForm) {
        elements.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const submitBtn = elements.loginForm.querySelector('button');

            setButtonLoading(submitBtn, true);

            try {
                await signInWithEmailAndPassword(auth, email, password);
                addLog("Giriş Yapıldı", "-", "Admin paneline giriş sağlandı.");
                showToast('Giriş başarılı!', 'success');
            } catch (error) {
                console.error(error);
                showToast('Giriş başarısız: ' + error.message, 'error');
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });
    }

    // 3. Çıkış Yapma İşlemi
    if(elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', () => {
            if(confirm('Çıkış yapmak istediğinize emin misiniz?')) {
                signOut(auth).then(() => showToast('Çıkış yapıldı', 'success'));
            }
        });
    }

    // 4. Menü Navigasyonu
    elements.menuItems.forEach(item => {
        item.addEventListener('click', () => {
            elements.menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const targetId = item.dataset.target;
            elements.sections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            
            elements.pageTitle.textContent = item.querySelector('span').textContent;
            
            if(targetId === 'comments-section') {
                loadPendingComments();
            }

            if(targetId === 'logs-section') {
                loadLogs();
            }
            
            if(targetId === 'words-section') {
                loadWords();
            }

            if (window.innerWidth <= 768 && elements.sidebar) {
                elements.sidebar.classList.remove('open');
            }
        });
    });

    if(elements.hamburgerBtn) {
        elements.hamburgerBtn.addEventListener('click', () => {
            elements.sidebar.classList.toggle('open');
        });
    }

    const closeSidebarMobileBtn = document.getElementById('close-sidebar-mobile');
    
    if (closeSidebarMobileBtn) {
        closeSidebarMobileBtn.addEventListener('click', () => {
            if (elements.sidebar) {
                elements.sidebar.classList.remove('open');
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && elements.sidebar && elements.sidebar.classList.contains('open')) {
            if (!elements.sidebar.contains(e.target) && !elements.hamburgerBtn.contains(e.target)) {
                elements.sidebar.classList.remove('open');
            }
        }
    });

    // 5. Dashboard Başlatıcı
    const initDashboard = async () => {
        console.log("Veriler yükleniyor...");
        await Promise.all([
            loadProjects(), 
            loadMessages(), 
            loadBlogStats(),
            loadAnnouncements(),
            loadBlogPosts(),
            loadPendingComments(),
            loadCommentStats(),
            loadLogs(),
            loadAds(),
            loadWordStats(), 
            loadWheelLeads(),
            loadWords() 
        ]);
    };

    /* =========================================
       PROJELER YÖNETİMİ
       ========================================= */
    const toggleModal = (show) => {
        if(elements.modal) elements.modal.style.display = show ? 'flex' : 'none';
    };

    if (elements.openModalBtn) elements.openModalBtn.onclick = () => toggleModal(true);
    elements.closeModalBtns.forEach(btn => btn.onclick = () => toggleModal(false));
    window.onclick = (e) => { if (e.target == elements.modal) toggleModal(false); };

    /* =========================================
       SADE VE HIZLI AI METİN ÜRETİCİ (Grok 4.1 Fast)
       ========================================= */
    
    const aiGenBtn = document.getElementById('generate-ai-btn');
    const aiSourceInput = document.getElementById('ai-source-text');

    if (aiGenBtn) {
        aiGenBtn.addEventListener('click', async () => {
            const sourceText = aiSourceInput.value;
            
            if (!sourceText.trim()) {
                showToast("Lütfen kaynak metni kutuya yapıştırın!", "error");
                return;
            }

            const btnTextSpan = aiGenBtn.querySelector('.btn-text');
            const originalBtnText = btnTextSpan.textContent;
            btnTextSpan.textContent = "Yazılıyor...";
            setButtonLoading(aiGenBtn, true);

            try {
                const API_KEY = "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";
                
                const systemPrompt = `
                    Sen uzman bir teknoloji editörüsün. Görevin, verilen ham metni analiz edip "Lianchez" blogu için profesyonel, kapsamlı ve detaylı bir blog yazısına dönüştürmektir.
                    
                    ÇOK ÖNEMLİ KURALLAR:
                    1. Yazıyı SIFIRDAN YAZ: Verilen kaynak metni sadece bir bilgi kaynağı olarak kullan, kopyalama yapma. İntihalden kaçınarak tamamen özgün bir içerik oluştur.
                    2. MARKA NÖTRALLİĞİ: Kaynak metindeki hiçbir marka adını (Lianchez hariç), web sitesi adını, yazar adını veya doğrudan alıntı cümlesini KULLANMA. Yazı, tamamen Lianchez'in kendi içeriği gibi özgün ve tarafsız olmalıdır.
                    3. DERİNLEMESİNE İNCELEME: Konuyu derinlemesine incele, örnekler ver ve okuyucuyu doyuracak uzunlukta (en az 500-600 kelime) bir içerik oluştur.
                    
                    Cevabı SADECE şu JSON formatında ver:
                    {
                        "title": "İlgi çekici, tıklanma odaklı Türkçe başlık",
                        "category": "Teknoloji, Yazılım veya Oyun Geliştirme",
                        "summary": "SEO uyumlu 150-160 karakterlik meta açıklama",
                        "keywords": "virgülle ayrılmış 5-6 anahtar kelime",
                        "content": "HTML formatında (h2, h3, p, ul, li etiketlerini kullan) uzun ve detaylı blog yazısı."
                    }
                `;

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://lianchez.com",
                    },
                    body: JSON.stringify({
                        "model": "x-ai/grok-4.1-fast",
                        "messages": [
                            {"role": "system", "content": systemPrompt},
                            {"role": "user", "content": `İşte kaynak metin:\n${sourceText}`}
                        ],
                        "temperature": 0.75 
                    })
                });

                if (!response.ok) {
                    throw new Error(`API Hatası: ${response.status}`);
                }

                const data = await response.json();
                let aiContent = data.choices[0].message.content;

                // Temizlik
                aiContent = aiContent.replace(/```json/g, '').replace(/```/g, '').trim();

                // JSON Parse Et
                const parsedData = JSON.parse(aiContent);

                // FORMLARI DOLDUR
                document.getElementById('post-title').value = parsedData.title;
                document.getElementById('post-category').value = parsedData.category;
                document.getElementById('post-meta-desc').value = parsedData.summary;
                document.getElementById('post-meta-keywords').value = parsedData.keywords;

                // Quill Editöre HTML İçeriği Bas
                if (quill) {
                    // Başlıkların (h2, h3) önüne TEK bir <br> ekliyoruz
                    let formattedContent = parsedData.content
                        .replace(/<h2>/g, '<br><h2>')
                        .replace(/<h3>/g, '<br><h3>');

                    quill.clipboard.dangerouslyPasteHTML(formattedContent);
                }

                // Başarı Mesajı
                showToast("✅ Uzun içerik başarıyla yazıldı! Görseli eklemeyi unutmayın.", "success");
                addLog("AI İçerik Üretimi", "-", parsedData.title);

                // Input'u temizle
                aiSourceInput.value = "";

            } catch (error) {
                console.error("AI Hatası:", error);
                showToast("Hata oluştu: " + error.message, "error");
            } finally {
                // Butonu eski haline getir
                btnTextSpan.textContent = originalBtnText;
                setButtonLoading(aiGenBtn, false);
            }
        });
    }

    async function loadProjects() {
        if(!elements.projectsList) return;
        elements.projectsList.innerHTML = '<p>Yükleniyor...</p>';
        try {
            const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            if(elements.totalProjects) elements.totalProjects.textContent = snap.size;
            
            elements.projectsList.innerHTML = '';
            if (snap.empty) {
                elements.projectsList.innerHTML = '<p class="text-muted">Proje yok.</p>';
                return;
            }

            snap.forEach((doc) => {
                const data = doc.data();
                const card = document.createElement('div');
                card.className = 'project-card';
                card.innerHTML = `
                    <div class="project-img-wrapper">
                        <img src="${data.imageUrl}" onerror="this.src='https://via.placeholder.com/300x200'">
                    </div>
                    <div class="project-info">
                        <h4 style="margin: 0 0 5px 0;">${data.title || 'Başlıksız Proje'}</h4>
                        <p style="font-size: 0.8rem; color: #888; margin: 0 0 10px 0;">${data.description || ''}</p>
                        <a href="${data.linkUrl}" target="_blank" class="project-link">${data.linkUrl}</a>
                    </div>
                    <div class="project-overlay">
                         <button class="btn btn-danger delete-project-btn" data-id="${doc.id}">Sil</button>
                    </div>
                `;
                elements.projectsList.appendChild(card);
            });
        } catch (error) { console.error(error); }
    }

    if(elements.addProjectForm) {
        elements.addProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = elements.addProjectForm.querySelector('button[type="submit"]');
            setButtonLoading(btn, true);
            try {
                const docRef = await addDoc(collection(db, "projects"), { 
                    title: document.getElementById('project-title').value,
                    description: document.getElementById('project-desc').value,
                    imageUrl: document.getElementById('project-image-url').value, 
                    linkUrl: document.getElementById('project-link').value,
                    createdAt: serverTimestamp() 
                });
                addLog("Proje Eklendi", docRef.id, document.getElementById('project-title').value);
                showToast('Proje eklendi');
                elements.addProjectForm.reset();
                toggleModal(false);
                loadProjects();
            } catch (err) { showToast(err.message, 'error'); }
            finally { setButtonLoading(btn, false); }
        });
    }

    if(elements.projectsList) {
        elements.projectsList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-project-btn')) {
                if (confirm("Silmek istediğinize emin misiniz?")) {
                    await deleteDoc(doc(db, "projects", e.target.dataset.id));
                    loadProjects();
                }
            }
        });
    }

    async function loadBlogStats() {
        if (!elements.totalBlogs) return; 

        try {
            const q = query(collection(db, "blog_posts"));
            const snap = await getDocs(q); 
            
            elements.totalBlogs.textContent = snap.size; 
        } catch (error) {
            console.error("Blog sayısı alınamadı:", error);
            elements.totalBlogs.textContent = "-";
        }
    }

    /* =========================================
       MESAJLAR & DUYURULAR
       ========================================= */
    async function loadMessages() {
        if(!elements.messagesList) return;
        try {
            const q = query(collection(db, "contact_messages"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            if(elements.totalMessages) elements.totalMessages.textContent = snap.size;
            
            const badge = document.getElementById('msg-badge');
            if(badge) {
                badge.textContent = snap.size;
                badge.style.display = snap.size > 0 ? 'inline-block' : 'none';
            }

            elements.messagesList.innerHTML = '';
            snap.forEach((doc) => {
                const msg = doc.data();
                const div = document.createElement('div');
                div.className = 'message-item';
                div.innerHTML = `
                    <div class="msg-header" style="flex-direction: column; align-items: flex-start; gap: 10px;">
                        <div style="display: flex; justify-content: space-between; width: 100%;">
                            <h4 style="margin: 0;">${msg.name} <small style="color:var(--text-muted);">${msg.email}</small></h4>
                            <button class="btn btn-danger delete-msg-btn" data-id="${doc.id}" style="padding:2px 8px; font-size:12px;">Sil</button>
                        </div>
                        <span class="msg-subject-label">${msg.subject || 'Konu Belirtilmemiş'}</span>
                    </div>
                    <div class="msg-contact">
                        <small>Telefon: ${msg.phone || 'Belirtilmemiş'}</small>
                        <small class="msg-date">${formatDate(msg.createdAt)}</small>
                    </div>
                    <div class="msg-body">${msg.message}</div>
                `;
                elements.messagesList.appendChild(div);
            });
        } catch (err) { console.error(err); }
    }

    if(elements.messagesList) {
        elements.messagesList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-msg-btn')) {
                if (confirm("Mesajı silmek istiyor musunuz?")) {
                    await deleteDoc(doc(db, "contact_messages", e.target.dataset.id));
                    addLog("Mesaj Silindi", e.target.dataset.id, "İletişim mesajı silindi");
                    loadMessages();
                }
            }
        });
    }

    async function loadAnnouncements() {
        if(!elements.announcementsList) return;
        try {
            const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            if(elements.totalAnnouncements) elements.totalAnnouncements.textContent = snap.size;
            
            elements.announcementsList.innerHTML = '';
            if (snap.empty) {
                elements.announcementsList.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">Duyuru yok.</p>';
                return;
            }
            snap.forEach((doc) => {
                const data = doc.data();
                const div = document.createElement('div');
                div.className = 'message-item'; 
                div.innerHTML = `
                    <div style="display: flex; gap: 15px; align-items: center; flex: 1;">
                        ${data.imageUrl ? `<img src="${data.imageUrl}" style="width: 80px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.style.display='none'">` : ''}
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 5px 0;">${data.title || 'Başlıksız Duyuru'}</h4>
                            <p style="font-size: 0.9rem; color: #888; margin: 0;">${data.text || ''}</p>
                            ${data.linkUrl ? `<a href="${data.linkUrl}" target="_blank" style="font-size: 0.8rem; color: var(--accent-color);">Linke Git</a>` : ''}
                        </div>
                    </div>
                    <button class="btn btn-danger delete-ann-btn" data-id="${doc.id}" style="padding:4px 8px;">Sil</button>
                `;
                elements.announcementsList.appendChild(div);
            });
        } catch (err) { console.error(err); }
    }

    if(elements.addAnnouncementForm) {
        elements.addAnnouncementForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('announcement-title').value;
            if(!title.trim()) return;
            try {
                const docRef = await addDoc(collection(db, "announcements"), { 
                    title: title,
                    text: document.getElementById('announcement-desc').value,
                    imageUrl: document.getElementById('announcement-image').value,
                    linkUrl: document.getElementById('announcement-link').value,
                    createdAt: serverTimestamp() 
                });
                addLog("Duyuru Eklendi", docRef.id, title);
                elements.addAnnouncementForm.reset();
                loadAnnouncements();
                showToast('Duyuru eklendi');
            } catch(err) { showToast(err.message, 'error'); }
        });
    }

    if(elements.announcementsList) {
        elements.announcementsList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-ann-btn')) {
                if (confirm("Silmek istediğinize emin misiniz?")) {
                    await deleteDoc(doc(db, "announcements", e.target.dataset.id));
                    addLog("Duyuru Silindi", e.target.dataset.id, "-");
                    loadAnnouncements();
                }
            }
        });
    }

    /* =========================================
       BLOG YÖNETİMİ 
       ========================================= */

    // 1. Editör Başlatma
    const initQuill = () => {
        console.log("Quill Editor başlatılıyor...");
        if (quill) return; 

        function imageHandler() {
            const range = this.quill.getSelection();
            const value = prompt('Lütfen görsel URL adresini yapıştırın:');
            if (value) {
                this.quill.insertEmbed(range.index, 'image', value, Quill.sources.USER);
            }
        }

        quill = new Quill('#editor-wrapper', {
            theme: 'snow',
            placeholder: 'Blog içeriğini buraya yazın...',
            modules: {
                toolbar: {
                    container: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'color': [] }, { 'background': [] }],
                        ['link', 'image', 'video'],
                        ['clean']
                    ],
                    handlers: { image: imageHandler }
                }
            }
        });
    };

    // 2. Görünüm Değiştirme (Liste <-> Form)
    const toggleBlogView = (showForm) => {
        if(!elements.blogListView || !elements.blogFormView) return;
        
        if (showForm) {
            elements.blogListView.style.display = 'none';
            elements.blogFormView.style.display = 'block';
            if(elements.toggleBlogBtn) elements.toggleBlogBtn.style.display = 'none';
            initQuill();
        } else {
            elements.blogListView.style.display = 'block';
            elements.blogFormView.style.display = 'none';
            if(elements.toggleBlogBtn) {
                elements.toggleBlogBtn.style.display = 'inline-flex';
                elements.toggleBlogBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Yeni Yazı Ekle`;
            }
        }
    };

    if(elements.toggleBlogBtn) {
        elements.toggleBlogBtn.addEventListener('click', () => {
            document.getElementById('post-meta-desc').value = '';     
            document.getElementById('post-meta-keywords').value = ''; 
            if(elements.blogForm) elements.blogForm.reset();
            if(elements.blogIdInput) elements.blogIdInput.value = '';
            if(elements.blogFormTitle) elements.blogFormTitle.textContent = 'Yeni Yazı Oluştur';
            if(quill) quill.setContents([]);
            toggleBlogView(true);
        });
    }

    if(elements.cancelBlogBtn) {
        elements.cancelBlogBtn.addEventListener('click', () => toggleBlogView(false));
    }

    // 3. Blog Listeleme
    async function loadBlogPosts() {
        if(!elements.blogPostsList) {
            return;
        }
        
        elements.blogPostsList.innerHTML = '<p>Yükleniyor...</p>';

        try {
            const q = query(collection(db, "blog_posts"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);

            elements.blogPostsList.innerHTML = '';
            if (snap.empty) {
                elements.blogPostsList.innerHTML = '<p class="text-muted">Henüz blog yazısı yok.</p>';
                return;
            }

            snap.forEach((doc) => {
                const data = doc.data();
                const card = document.createElement('div');
                card.className = 'project-card';
                const views = data.viewCount || 0; 

                card.innerHTML = `
                    <div style="height: 150px; overflow:hidden;">
                        <img src="${data.imageUrl}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/300x200'">
                    </div>
                    <div style="padding:15px;">
                        <h4 style="color:var(--text-main); margin-bottom:5px;">${data.title}</h4>
                        <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted);">
                            <span>${data.category}</span>
                            <span>👁️ ${views}</span>
                        </div>
                        <div style="margin-top:15px; display:flex; gap:10px;">
                            <button class="btn btn-secondary edit-blog-btn" data-id="${doc.id}" style="padding:5px 10px; font-size:12px;">Düzenle</button>
                            <button class="btn btn-danger delete-blog-btn" data-id="${doc.id}" style="padding:5px 10px; font-size:12px;">Sil</button>
                        </div>
                    </div>
                `;
                elements.blogPostsList.appendChild(card);
            });
        } catch (error) {
            elements.blogPostsList.innerHTML = '<p style="color:red">Yükleme hatası oluştu.</p>';
        }
    }

    // 4. Silme ve Düzenleme
    if(elements.blogPostsList) {
        elements.blogPostsList.addEventListener('click', async (e) => {
            // SİLME
            if (e.target.classList.contains('delete-blog-btn')) {
                if(confirm('Bu yazıyı silmek istediğinize emin misiniz?')) {
                    try {
                        await deleteDoc(doc(db, "blog_posts", e.target.dataset.id));
                        addLog("Blog Silindi", e.target.dataset.id, "Blog yazısı silindi");
                        showToast('Yazı silindi', 'success');
                        loadBlogPosts();
                    } catch(err) { showToast('Hata: ' + err.message, 'error'); }
                }
            }
            // DÜZENLEME
            if (e.target.classList.contains('edit-blog-btn')) {
                const id = e.target.dataset.id;
                try {
                    const docSnap = await getDoc(doc(db, "blog_posts", id));
                    if(docSnap.exists()) {
                        const data = docSnap.data();
                        toggleBlogView(true);
                        if(elements.blogFormTitle) elements.blogFormTitle.textContent = 'Yazıyı Düzenle';
                        if(elements.blogIdInput) elements.blogIdInput.value = id;
                        
                        document.getElementById('post-title').value = data.title;
                        document.getElementById('post-category').value = data.category;
                        document.getElementById('post-image').value = data.imageUrl;
                        document.getElementById('post-meta-desc').value = data.metaDescription || ''; 
                        document.getElementById('post-meta-keywords').value = data.metaKeywords || '';
                        quill.root.innerHTML = data.content;
                    }
                } catch(err) { showToast('Veri çekilemedi', 'error'); }
            }
        });
    }

    // 5. Kaydet (Ekle/Güncelle)
    if(elements.blogForm) {
        elements.blogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const id = elements.blogIdInput.value;
            const submitBtn = elements.blogForm.querySelector('button[type="submit"]');
            
            setButtonLoading(submitBtn, true);

            const title = document.getElementById('post-title').value;
            // Slug Oluşturma
            const slug = title.toLowerCase()
                .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-');

            const postData = {
                title: title,
                category: document.getElementById('post-category').value,
                imageUrl: document.getElementById('post-image').value,
                metaDescription: document.getElementById('post-meta-desc').value,
                metaKeywords: document.getElementById('post-meta-keywords').value,
                content: quill.root.innerHTML,
                summary: quill.getText().substring(0, 150) + '...',
                slug: slug,
                updatedAt: serverTimestamp()
            };

            try {
                if (id) {
                    await setDoc(doc(db, "blog_posts", id), postData, { merge: true });
                    showToast('Blog güncellendi', 'success');
                } else {
                    postData.createdAt = serverTimestamp();
                    postData.author = "Lianchez Admin";
                    const docRef = await addDoc(collection(db, "blog_posts"), postData);
                    addLog("Blog Eklendi", docRef.id, title);
                    showToast('Blog yayınlandı', 'success');
                }
                toggleBlogView(false);
                loadBlogPosts();
            } catch (error) {
                showToast('Hata: ' + error.message, 'error');
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });
    }

    /* =========================================
       YORUM YÖNETİMİ (ONAY & SİLME)
       ========================================= */
    
    async function loadPendingComments() {
        if (!elements.commentsList) return;
        
        elements.commentsList.innerHTML = '<p style="padding:20px;">Yorumlar taranıyor...</p>';

        try {
            const q = query(
                collection(db, "comments"), 
                where("status", "==", "pending"), 
                orderBy("createdAt", "desc")
            );
            
            const snap = await getDocs(q);
            
            elements.commentsList.innerHTML = '';
            
            if (snap.empty) {
                elements.commentsList.innerHTML = '<div style="padding:30px; text-align:center; color:#666;">Onay bekleyen yeni yorum yok. Hepsi temiz! 🎉</div>';
                return;
            }

            snap.forEach(doc => {
                const comment = doc.data();
                const div = document.createElement('div');
                div.className = 'message-item'; 
                div.innerHTML = `
                    <div class="msg-header">
                        <div style="display:flex; flex-direction:column;">
                            <h4 style="color:var(--accent-color); margin-bottom:5px;">${comment.author}</h4>
                            <a href="../blog/post.html?id=${comment.postId}" target="_blank" class="post-id-link">Konu ID: ${comment.postId}</a>
                        </div>
                        <small style="color:#888;">${formatDate(comment.createdAt)}</small>
                    </div>
                    
                    <div class="msg-body" style="margin: 15px 0; background: #222; padding: 15px; border-radius: 8px; border-left: 3px solid var(--accent-color);">
                        ${comment.content}
                    </div>
                    
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-secondary approve-comment-btn" data-id="${doc.id}" style="background: #22c55e; color:white; border:none;">
                            ✓ Yayına Al
                        </button>
                        <button class="btn btn-danger delete-comment-btn" data-id="${doc.id}">
                            ✕ Reddet ve Sil
                        </button>
                    </div>
                `;
                elements.commentsList.appendChild(div);
            });

        } catch (error) {
            elements.commentsList.innerHTML = `<p style="color:red; padding:20px;">Hata: ${error.message} <br> (Eğer 'Index' hatasıysa konsoldaki linke tıklayın)</p>`;
        }
    }

    // Buton Dinleyicileri (Event Delegation)
    if(elements.commentsList) {
        elements.commentsList.addEventListener('click', async (e) => {
            const target = e.target.closest('button'); 
            if(!target) return;

            const id = target.dataset.id;

            // ONAYLA
            if (target.classList.contains('approve-comment-btn')) {
                if(confirm("Bu yorumu yayınlamak istiyor musunuz?")) {
                    try {
                        await updateDoc(doc(db, "comments", id), {
                            status: "approved" 
                        });
                        addLog("Yorum Onaylandı", id, "Kullanıcı yorumu yayına alındı");
                        showToast("Yorum onaylandı ve blogda yayınlandı.", "success");
                        loadPendingComments(); 
                    } catch(err) { 
                        showToast("Hata: " + err.message, "error"); 
                    }
                }
            }
            
            // SİL
            if (target.classList.contains('delete-comment-btn')) {
                if(confirm("Bu yorumu kalıcı olarak silmek istiyor musunuz?")) {
                    try {
                        await deleteDoc(doc(db, "comments", id));
                        addLog("Yorum Silindi", id, "Onay bekleyen yorum reddedildi/silindi");
                        showToast("Yorum silindi.", "success");
                        loadPendingComments();
                    } catch(err) { 
                        showToast("Hata: " + err.message, "error"); 
                    }
                }
            }
        });
    }

    /* =========================================
       REKLAM YÖNETİMİ
       ========================================= */
    
    // 1. Reklamları Listele
    async function loadAds() {
        const listContainer = document.getElementById('ads-list');
        if (!listContainer) return;

        listContainer.innerHTML = '<p>Yükleniyor...</p>';

        try {
            const q = query(collection(db, "ads"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);

            listContainer.innerHTML = '';
            if (snap.empty) {
                listContainer.innerHTML = '<p class="text-muted">Henüz ekli reklam yok.</p>';
                return;
            }

            snap.forEach((doc) => {
                const data = doc.data();
                const isActive = data.isActive !== false; 
                
                const card = document.createElement('div');
                card.className = `project-card ${isActive ? '' : 'passive-ad'}`;
                card.innerHTML = `
                    <div style="height: 100px; padding:10px; background:#000; display:flex; align-items:center; justify-content:center; position:relative;">
                        <img src="${data.desktopImage}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.style.display='none'">
                        <span class="status-badge ${isActive ? 'status-active' : 'status-passive'}" style="position:absolute; top:5px; right:5px;">
                            ${isActive ? 'AKTİF' : 'PASİF'}
                        </span>
                    </div>
                    <div style="padding:15px;">
                        <h4 style="font-size:1rem; margin-bottom:5px;">${data.title}</h4>
                        <a href="${data.linkUrl}" target="_blank" style="font-size:0.8rem; color:var(--accent-color); display:block; margin-bottom:15px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${data.linkUrl}</a>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
                            <button class="btn btn-secondary toggle-ad-status-btn" data-id="${doc.id}" data-status="${isActive}" style="font-size:0.8rem; padding:8px;">
                                ${isActive ? 'Pasife Al' : 'Aktif Et'}
                            </button>
                            <button class="btn btn-secondary edit-ad-btn" data-id="${doc.id}" style="font-size:0.8rem; background:#3b82f6; color:white; padding:8px;">Düzenle</button>
                        </div>
                        <button class="btn btn-danger delete-ad-btn" data-id="${doc.id}" style="width:100%; padding:5px; font-size:0.9rem;">Sil</button>
                    </div>
                `;
                listContainer.appendChild(card);
            });
        } catch (error) {
            listContainer.innerHTML = '<p style="color:red">Yükleme hatası.</p>';
        }
    }

    // 2. Reklam Ekleme 
    const addAdForm = document.getElementById('add-ad-form');
    if (addAdForm) {
        addAdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = addAdForm.querySelector('button[type="submit"]');
            setButtonLoading(btn, true);

            try {
                const title = document.getElementById('ad-title').value;
                const desktopImg = document.getElementById('ad-image-desktop').value;
                const mobileImg = document.getElementById('ad-image-mobile').value;
                const linkUrl = document.getElementById('ad-link').value;

                await addDoc(collection(db, "ads"), {
                    title: title,
                    desktopImage: desktopImg,
                    mobileImage: mobileImg,
                    linkUrl: linkUrl,
                    isActive: true, 
                    createdAt: serverTimestamp()
                });

                addLog("Reklam Eklendi", "-", title);
                showToast('Reklam başarıyla eklendi', 'success');
                addAdForm.reset();
                loadAds();
            } catch (error) {
                showToast('Hata: ' + error.message, 'error');
            } finally {
                setButtonLoading(btn, false);
            }
        });
    }

    // 3. Buton İşlemleri (Silme, Düzenleme, Durum Değiştirme)
    const adsList = document.getElementById('ads-list');
    if (adsList) {
        adsList.addEventListener('click', async (e) => {
            const target = e.target;
            const id = target.dataset.id;

            // SİLME
            if (target.classList.contains('delete-ad-btn')) {
                if (confirm("Bu reklamı kaldırmak istediğinize emin misiniz?")) {
                    try {
                        await deleteDoc(doc(db, "ads", id));
                        addLog("Reklam Silindi", id, "-");
                        showToast('Reklam silindi', 'success');
                        loadAds();
                    } catch (err) {
                        showToast('Silme hatası: ' + err.message, 'error');
                    }
                }
            }

            // DURUM DEĞİŞTİRME (AKTİF/PASİF)
            if (target.classList.contains('toggle-ad-status-btn')) {
                const currentStatus = target.dataset.status === "true";
                const newStatus = !currentStatus;
                
                try {
                    await updateDoc(doc(db, "ads", id), {
                        isActive: newStatus
                    });
                    showToast(`Reklam ${newStatus ? 'aktif edildi' : 'pasife alındı'}.`, 'success');
                    loadAds();
                } catch (err) {
                    showToast('Hata: ' + err.message, 'error');
                }
            }

            // DÜZENLEME MODALINI AÇMA
            if (target.classList.contains('edit-ad-btn')) {
                try {
                    const docSnap = await getDoc(doc(db, "ads", id));
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        
                        // Modalı Doldur
                        document.getElementById('edit-ad-id').value = id;
                        document.getElementById('edit-ad-title').value = data.title;
                        document.getElementById('edit-ad-desktop').value = data.desktopImage;
                        document.getElementById('edit-ad-mobile').value = data.mobileImage;
                        document.getElementById('edit-ad-link').value = data.linkUrl;
                        document.getElementById('edit-ad-status').value = (data.isActive !== false).toString();

                        // Modalı Göster
                        document.getElementById('edit-ad-modal').style.display = 'flex';
                    }
                } catch (err) {
                    showToast('Veri çekilemedi', 'error');
                }
            }
        });
    }

    // 4. Düzenleme Formu Gönderimi (YENİ)
    const editAdForm = document.getElementById('edit-ad-form');
    if (editAdForm) {
        editAdForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = editAdForm.querySelector('button[type="submit"]');
            setButtonLoading(btn, true);

            const id = document.getElementById('edit-ad-id').value;
            const isActive = document.getElementById('edit-ad-status').value === "true";

            try {
                await updateDoc(doc(db, "ads", id), {
                    title: document.getElementById('edit-ad-title').value,
                    desktopImage: document.getElementById('edit-ad-desktop').value,
                    mobileImage: document.getElementById('edit-ad-mobile').value,
                    linkUrl: document.getElementById('edit-ad-link').value,
                    isActive: isActive,
                    updatedAt: serverTimestamp()
                });

                addLog("Reklam Güncellendi", id, document.getElementById('edit-ad-title').value);
                showToast('Reklam güncellendi', 'success');
                
                // Modalı Kapat
                document.getElementById('edit-ad-modal').style.display = 'none';
                loadAds();

            } catch (error) {
                showToast('Hata: ' + error.message, 'error');
            } finally {
                setButtonLoading(btn, false);
            }
        });
    }

    // Modal Kapatma İşlemleri
    const editAdModal = document.getElementById('edit-ad-modal');
    const closeEditBtns = document.querySelectorAll('.close-modal-edit-ad, .close-modal-edit-ad-btn');

    if (editAdModal) {
        closeEditBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                editAdModal.style.display = 'none';
            });
        });
        // Dışarı tıklayınca kapat
        window.addEventListener('click', (e) => {
            if (e.target === editAdModal) {
                editAdModal.style.display = 'none';
            }
        });
    }

    async function loadCommentStats() {
        if (!elements.pendingCommentsStat || !elements.commentBadge) return;

        try {
            const q = query(collection(db, "comments"), where("status", "==", "pending"));
            const snap = await getDocs(q);
            const count = snap.size;
            
            // Genel Bakış'taki sayıyı güncelle
            elements.pendingCommentsStat.textContent = count;
            
            // Kenar çubuğundaki balonu (badge) güncelle
            if (count > 0) {
                elements.pendingCommentsStat.style.color = "#ef4444"; // Kırmızı
                elements.commentBadge.textContent = count;
                elements.commentBadge.style.display = 'inline-block';
            } else {
                elements.pendingCommentsStat.style.color = "var(--text-main)"; // Normal
                elements.commentBadge.style.display = 'none';
            }

        } catch (error) {
            elements.pendingCommentsStat.textContent = "-";
            if (elements.commentBadge) {
                elements.commentBadge.style.display = 'none';
            }
        }
    }

    
    const refreshLogsBtn = document.getElementById('refresh-logs-btn');
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', () => {
            loadLogs();
            showToast('Kayıtlar güncellendi.', 'success');
        });
    }

    // --- LOGLARI LİSTELEME ---
    async function loadLogs() {
        const listContainer = document.getElementById('logs-list');
        if (!listContainer) return;

        listContainer.innerHTML = '<p style="padding:20px;">Kayıtlar güncelleniyor...</p>';

        try {
            const q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
            const snap = await getDocs(q);

            if (snap.empty) {
                listContainer.innerHTML = '<p style="padding:20px; text-align:center; color:#666;">Henüz sistem kaydı yok.</p>';
                return;
            }

            listContainer.innerHTML = ''; 

            snap.forEach(doc => {
                const data = doc.data();
                
                // İşlem türüne göre CSS sınıfı belirle
                let actionClass = 'update';
                if (data.action.includes('Sil')) actionClass = 'delete';
                else if (data.action.includes('Ekle') || data.action.includes('Yayın')) actionClass = 'add';
                else if (data.action.includes('Giriş')) actionClass = 'auth';

                const div = document.createElement('div');
                div.className = 'log-item';
                div.innerHTML = `
                    <div><span class="log-action ${actionClass}">${data.action}</span></div>
                    <div style="word-break: break-all;">${data.details || '-'} <br> <small style="color:#666;">ID: ${data.targetId}</small></div>
                    <div>${data.user}</div>
                    <div>${formatDate(data.timestamp)}</div>
                `;
                listContainer.appendChild(div);
            });

        } catch (error) {
            listContainer.innerHTML = '<p style="color:red; padding:20px;">Loglar yüklenemedi.</p>';
        }
    }


    /* =========================================
       KELİME İSTATİSTİKLERİ (GENEL BAKIŞ)
       ========================================= */
    async function loadWordStats() {
        if (!elements.totalWords) return;

        try {
            const q = query(collection(db, "english_words"));
            const snap = await getDocs(q);
            
            elements.totalWords.textContent = snap.size;
        } catch (error) {
            elements.totalWords.textContent = "-";
        }
    }

    /* =========================================
       KELİME YÖNETİMİ (CRUD İŞLEMLERİ)
       ========================================= */
    const toggleWordModal = (show) => {
        // Kontrol 1: Modal elementi var mı?
        if(!elements.wordModal) {
            console.error("HATA: Kelime modal elementi (ID: add-word-modal) bulunamadı!");
            return;
        }

        // Kontrol 2: Modal görünürlüğünü değiştir
        if(show) {
            elements.wordModal.style.display = 'flex';
        } else {
            elements.wordModal.style.display = 'none';
        }
    };

    // Açma Butonu Olay Dinleyicisi
    if (elements.openWordModalBtn) {
        elements.openWordModalBtn.onclick = () => {
            document.getElementById('word-modal-title').textContent = 'Yeni Kelime Ekle';
            document.getElementById('word-id-input').value = '';
            elements.addWordForm.reset();
            toggleWordModal(true);
        };
    } else {
        console.warn("Kelime Ekle butonu (ID: show-add-word-modal-btn) bulunamadı!");
    }

    // Kapatma Butonları Olay Dinleyicileri
    elements.closeWordModalBtns.forEach(btn => btn.onclick = () => toggleWordModal(false));
    
    // Dışarı Tıklama Olayı (window.onclick) - Sadece kelime modalı için özelleştirilmiş
    window.addEventListener('click', (e) => { 
        if (e.target === elements.wordModal) {
            toggleWordModal(false);
        }
    });

    async function loadWords() {
        if(!elements.wordsList) return;
        elements.wordsList.innerHTML = '<p style="padding: 20px; color: #888;">Kelimeler yükleniyor...</p>';

        try {
            const q = query(collection(db, "english_words"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);

            elements.wordsList.innerHTML = '';
            if (snap.empty) {
                elements.wordsList.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">Henüz kelime eklenmemiş.</p>';
                return;
            }

            snap.forEach((doc) => {
                const data = doc.data();
                const div = document.createElement('div');
                div.className = 'message-item';
                div.innerHTML = `
                    <div class="msg-header" style="align-items: center;">
                        <div style="display:flex; flex-direction:column;">
                            <h4 style="color:var(--text-main); margin-bottom: 5px;">${data.word} <span style="font-size:0.8rem; color:var(--accent-color); padding: 2px 6px; border-radius: 4px; background: rgba(253, 6, 6, 0.1);">${data.level}</span></h4>
                            <small style="color:#aaa;">Çeviri: ${data.translation}</small>
                        </div>
                        <div style="display:flex; gap: 10px;">
                            <button class="btn btn-secondary edit-word-btn" data-id="${doc.id}" style="padding:4px 8px; font-size:12px;">Düzenle</button>
                            <button class="btn btn-danger delete-word-btn" data-id="${doc.id}" style="padding:4px 8px; font-size:12px;">Sil</button>
                        </div>
                    </div>
                    <div class="msg-body" style="font-size:0.9rem;">
                        <strong>Örnek Cümle:</strong> ${data.example} <br>
                        <strong>Türkçe Örnek:</strong> ${data.turkishExample}
                    </div>
                    <small style="color:#666;">Eklenme: ${formatDate(data.createdAt)}</small>
                `;
                elements.wordsList.appendChild(div);
            });
        } catch (error) {
            elements.wordsList.innerHTML = '<p style="color:red; padding: 20px;">Yükleme hatası oluştu. (FireStore Kurallarını Kontrol Edin)</p>';
        }
    }

    if(elements.addWordForm) {
        elements.addWordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('word-id-input').value;
            const submitBtn = elements.addWordForm.querySelector('button[type="submit"]');
            setButtonLoading(submitBtn, true);

            const wordData = {
                word: document.getElementById('word-english').value,
                translation: document.getElementById('word-turkish').value,
                example: document.getElementById('word-example-english').value,
                turkishExample: document.getElementById('word-example-turkish').value,
                level: document.getElementById('word-level').value,
                updatedAt: serverTimestamp()
            };

            try {
                if (id) {
                    await setDoc(doc(db, "english_words", id), wordData, { merge: true });
                    addLog("Kelime Güncellendi", id, wordData.word);
                    showToast('Kelime güncellendi', 'success');
                } else {
                    wordData.createdAt = serverTimestamp();
                    const docRef = await addDoc(collection(db, "english_words"), wordData);
                    addLog("Kelime Eklendi", docRef.id, wordData.word);
                    showToast('Kelime eklendi', 'success');
                }
                toggleWordModal(false);
                elements.addWordForm.reset();
                loadWords();
                loadWordStats();
            } catch (err) {
                showToast('Hata: ' + err.message, 'error');
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });
    }

    if(elements.wordsList) {
        elements.wordsList.addEventListener('click', async (e) => {
            const target = e.target.closest('button');
            if(!target) return;

            const id = target.dataset.id;
            
            // SİLME
            if (target.classList.contains('delete-word-btn')) {
                if (confirm("Bu kelimeyi silmek istediğinize emin misiniz?")) {
                    try {
                        await deleteDoc(doc(db, "english_words", id));
                        addLog("Kelime Silindi", id, "-");
                        showToast('Kelime silindi', 'success');
                        loadWords();
                        loadWordStats();
                    } catch(err) { showToast('Silme hatası: ' + err.message, 'error'); }
                }
            }
            
            // DÜZENLEME
            if (target.classList.contains('edit-word-btn')) {
                try {
                    const docSnap = await getDoc(doc(db, "english_words", id));
                    if(docSnap.exists()) {
                        const data = docSnap.data();
                        document.getElementById('word-modal-title').textContent = 'Kelimeyi Düzenle';
                        document.getElementById('word-id-input').value = id;
                        document.getElementById('word-english').value = data.word;
                        document.getElementById('word-turkish').value = data.translation;
                        document.getElementById('word-example-english').value = data.example;
                        document.getElementById('word-example-turkish').value = data.turkishExample;
                        document.getElementById('word-level').value = data.level;
                        toggleWordModal(true);
                    }
                } catch(err) { showToast('Veri çekilemedi', 'error'); }
            }
        });
    }

    /* =========================================
    ÇARKIFELEK LEAD YÖNETİMİ
    ========================================= */
    async function loadWheelLeads() {
        const listContainer = document.getElementById('wheel-leads-list');
        if (!listContainer) return;

        try {
            const q = query(collection(db, "wheel_leads"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);

            if (snap.empty) {
                listContainer.innerHTML = '<p style="padding:20px; text-align:center; color:#666;">Henüz kimse çarkı çevirmedi.</p>';
                return;
            }

            listContainer.innerHTML = ''; 

            snap.forEach(doc => {
                const data = doc.data();
                const div = document.createElement('div');
                div.className = 'log-item'; // Mevcut log-item stilini kullanıyoruz
                div.style.gridTemplateColumns = "2fr 1.5fr 1fr 0.5fr"; // Grid yapısını uyarlıyoruz
                
                div.innerHTML = `
                    <div style="font-weight: 500; color: var(--text-main);">${data.email}</div>
                    <div><span class="log-action add" style="background: rgba(253, 6, 6, 0.1); color: var(--accent-color); border: 1px solid rgba(253, 6, 6, 0.2);">${data.prize}</span></div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${formatDate(data.createdAt)}</div>
                    <div>
                        <button class="btn btn-danger delete-lead-btn" data-id="${doc.id}" style="padding: 5px; font-size: 10px;">Sil</button>
                    </div>
                `;
                listContainer.appendChild(div);
            });

        } catch (error) {
            listContainer.innerHTML = '<p style="color:red; padding:20px;">Leadler yüklenemedi.</p>';
        }
    }

    // Lead Silme İşlemi (Event Delegation)
    document.getElementById('wheel-leads-list').addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-lead-btn')) {
            if (confirm("Bu kaydı silmek istediğinize emin misiniz?")) {
                try {
                    const id = e.target.dataset.id;
                    await deleteDoc(doc(db, "wheel_leads", id));
                    showToast("Lead kaydı silindi.", "success");
                    loadWheelLeads();
                } catch (err) {
                    showToast("Silme hatası: " + err.message, "error");
                }
            }
        }
    });

    // Konsola Yazdırma (Basit Export)
    const exportBtn = document.getElementById('export-leads-btn');
    if (exportBtn) {
        exportBtn.onclick = async () => {
            const q = query(collection(db, "wheel_leads"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            let csvContent = "Email,Odul,Tarih\n";
            snap.forEach(doc => {
                const d = doc.data();
                csvContent += `${d.email},${d.prize},${d.createdAt?.toDate().toLocaleDateString()}\n`;
            });
            console.log("%c--- Çarkıfelek Lead Listesi ---", "color: #fd0606; font-size: 15px; font-weight: bold;");
            console.log(csvContent);
            showToast("Liste tarayıcı konsoluna yazdırıldı (F12).", "success");
        };
    }


});