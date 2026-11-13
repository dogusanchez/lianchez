const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();

// =====================================================
// 1. SİTEMAP FONKSİYONU (değiştirilmedi)
// =====================================================
exports.sitemap = onRequest(async (req, res) => {
    const db = admin.firestore();
    const snapshot = await db.collection("blog_posts").get();
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>https://lianchez.com/</loc>
        <priority>1.0</priority>
      </url>
      <url>
        <loc>https://lianchez.com/blog/index.html</loc>
        <priority>0.9</priority>
      </url>`;

    snapshot.forEach(doc => {
        const post = doc.data();
        const url = `https://lianchez.com/blog/${post.slug || doc.id}`;
        xml += `
      <url>
        <loc>${url}</loc>
        <lastmod>${post.createdAt ? new Date(post.createdAt.seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
        <priority>0.8</priority>
      </url>`;
    });

    xml += `</urlset>`;

    res.set("Content-Type", "text/xml");
    res.status(200).send(xml);
});

// =====================================================
// 2. STATİK HTML OLUŞTURUCU
// Blog yazısı eklenince veya güncellenince tetiklenir
// Firestore: blog_posts/{postId}
// =====================================================
exports.generateStaticBlogPage = onDocumentWritten("blog_posts/{postId}", async (event) => {
    const change = event.data;
    const context = { params: event.params };

    const db = admin.firestore();
    const bucket = admin.storage().bucket();

    // Yazı silindiyse HTML'i de sil
    if (!change.after.exists) {
      const deletedData = change.before.data();
      if (deletedData && deletedData.slug) {
        try {
          await bucket.file(`blog/${deletedData.slug}.html`).delete();
          console.log(`Silindi: blog/${deletedData.slug}.html`);
        } catch (e) {
          console.log("Dosya silinemedi (zaten yok olabilir):", e.message);
        }
      }
      return null;
    }

    const post = change.after.data();
    const postId = context.params.postId;

    if (!post.slug) {
      console.log("Slug yok, HTML oluşturulmadı. postId:", postId);
      return null;
    }

    // Tarih formatlama
    const formatDate = (timestamp) => {
      if (!timestamp) return "";
      return new Date(timestamp.seconds * 1000).toLocaleDateString("tr-TR", {
        year: "numeric", month: "long", day: "numeric",
      });
    };

    const publishedDate = post.createdAt
      ? new Date(post.createdAt.seconds * 1000).toISOString()
      : new Date().toISOString();

    const canonicalUrl = `https://www.lianchez.com/blog/${post.slug}`;

    // Paylaşım URL'leri
    const encodedUrl = encodeURIComponent(canonicalUrl);
    const encodedTitle = encodeURIComponent(post.title || "");

    // Schema.org JSON-LD
    const schemaJson = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.metaDescription || post.summary || "",
      "image": post.imageUrl || "",
      "author": { "@type": "Person", "name": post.author || "Lianchez" },
      "publisher": {
        "@type": "Organization",
        "name": "Lianchez",
        "logo": { "@type": "ImageObject", "url": "https://www.lianchez.com/logo.png" },
      },
      "datePublished": publishedDate,
      "mainEntityOfPage": { "@type": "WebPage", "@id": canonicalUrl },
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(post.title)} | Lianchez Blog</title>
    <meta name="description" content="${escapeHtml(post.metaDescription || post.summary || "")}">
    <meta name="keywords" content="${escapeHtml(post.metaKeywords || "")}">
    <meta name="author" content="${escapeHtml(post.author || "Lianchez")}">
    <link rel="canonical" href="${canonicalUrl}">
    <link rel="icon" href="/favicon.png">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(post.title)}">
    <meta property="og:description" content="${escapeHtml(post.metaDescription || post.summary || "")}">
    <meta property="og:image" content="${post.imageUrl || ""}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:site_name" content="Lianchez Blog">
    <meta property="article:published_time" content="${publishedDate}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(post.title)}">
    <meta name="twitter:description" content="${escapeHtml(post.metaDescription || post.summary || "")}">
    <meta name="twitter:image" content="${post.imageUrl || ""}">
    <script type="application/ld+json">${schemaJson}</script>
    <link rel="stylesheet" href="/style.css">
    <link rel="stylesheet" href="/blog/blog-style.css">
    <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
</head>
<body>

    <header class="blog-header">
        <div class="container header-inner">
            <a href="/index.html" class="blog-logo">
                <img src="/logo.png" alt="Lianchez">
            </a>
            <button class="hamburger-menu-btn" id="open-sidebar" aria-label="Menüyü Aç">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
            </button>
        </div>
    </header>

    <div class="blog-sidebar-overlay" id="sidebar-overlay"></div>
    <div class="blog-sidebar" id="blog-sidebar">
        <div class="sidebar-header">
            <h3>Menü</h3>
            <button class="close-sidebar-btn" id="close-sidebar">&times;</button>
        </div>
        <div class="sidebar-content">
            <ul class="sidebar-nav">
                <li>
                    <a href="/index.html" class="nav-link main-home-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        Ana Siteye Dön
                    </a>
                </li>
                <li><a href="/blog/index.html" class="nav-link">Blog Ana Sayfa</a></li>
            </ul>
            <hr class="sidebar-divider">
            <div class="ad-box sidebar-ad"></div>
            <h4 class="sidebar-title">Kategoriler</h4>
            <ul class="sidebar-nav">
                <li><a href="/blog/index.html" class="nav-link">Teknoloji</a></li>
                <li><a href="/blog/index.html" class="nav-link">Yazılım</a></li>
                <li><a href="/blog/index.html" class="nav-link">Oyun Geliştirme</a></li>
                <li><a href="/blog/index.html" class="nav-link">Haberler</a></li>
            </ul>
            <div class="sidebar-cta" style="background:#1a1a1a; padding:20px; border-radius:10px; margin:20px 0; border:1px solid #333;">
                <h4 style="color:var(--primary-color); margin-bottom:10px;">Yardıma mı İhtiyacınız Var?</h4>
                <p style="font-size:0.85rem; color:#888;">Dijital stratejinizi beraber belirleyelim.</p>
                <a href="https://wa.me/905322879237" class="nav-link" style="background:#25D366; color:#fff; justify-content:center; margin-top:10px;">WhatsApp'tan Yaz</a>
            </div>
        </div>
        <div class="sidebar-footer"><p>&copy; 2026 Lianchez</p></div>
    </div>

    <div class="container ad-section" style="padding: 20px 15px; max-width: 800px;">
        <div class="ad-box">Reklam Alanı (728x90)</div>
    </div>

    <article id="post-content-area" class="container" style="padding: 20px 15px; max-width: 800px;">
        <span class="blog-cat" style="font-size:1rem;">${escapeHtml(post.category || "")}</span>
        <h1 class="post-main-title">${escapeHtml(post.title || "")}</h1>
        <div style="color:#888; margin-bottom:30px; display:flex; align-items:center; gap:15px; flex-wrap:wrap;">
            <span>${formatDate(post.createdAt)}</span> •
            <span>Yazar: ${escapeHtml(post.author || "Lianchez")}</span> •
            <span>👁️ <span id="view-count-display">${post.viewCount || 0}</span> Görüntülenme</span>
        </div>
        <img src="${post.imageUrl || ""}" class="post-header-img" alt="${escapeHtml(post.title || "")}">
        <div class="post-body">${post.content || ""}</div>

        <div class="share-section-container">
            <h4 class="share-title">Bu Yazıyı Paylaş:</h4>
            <div class="share-buttons">
                <a href="https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}" target="_blank" class="share-btn whatsapp" aria-label="WhatsApp'ta Paylaş">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67Z"/></svg>
                    <span>WhatsApp</span>
                </a>
                <a href="https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}" target="_blank" class="share-btn twitter" aria-label="X'te Paylaş">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    <span>X</span>
                </a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" class="share-btn facebook" aria-label="Facebook'ta Paylaş">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.15 5.96C15.21 5.96 16.16 6.05 16.16 6.05V8.51H15.03C13.78 8.51 13.39 9.3 13.39 10.09V12.06H16.13L15.69 14.96H13.39V21.96C18.16 21.21 21.82 17.06 21.82 12.06C21.82 6.53 17.32 2.04 12 2.04Z"/></svg>
                    <span>Facebook</span>
                </a>
                <a href="https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}" target="_blank" class="share-btn linkedin" aria-label="LinkedIn'de Paylaş">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 3A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3H19M18.5 18.5V13.2A3.26 3.26 0 0 0 15.24 9.94C14.39 9.94 13.4 10.46 12.92 11.24V10.13H10.13V18.5H12.92V13.57C12.92 12.8 13.54 12.17 14.31 12.17A1.4 1.4 0 0 1 15.71 13.57V18.5H18.5M6.88 8.56A1.68 1.68 0 0 0 8.56 6.88C8.56 5.95 7.81 5.19 6.88 5.19A1.69 1.69 0 0 0 5.19 6.88C5.19 7.81 5.95 8.56 6.88 8.56M8.27 18.5V10.13H5.5V18.5H8.27Z"/></svg>
                    <span>LinkedIn</span>
                </a>
            </div>
        </div>
    </article>

    <div class="container ad-section" style="padding-bottom: 20px; max-width: 800px;">
        <div class="ad-box">Reklam Alanı (728x90)</div>
    </div>

    <section id="related-posts-section" class="container" style="max-width: 800px; margin-top: 50px;">
        <h3 style="color: white; margin-bottom: 25px; border-left: 4px solid var(--primary-color); padding-left: 15px;">
            Bunlara da Göz Atmalısın
        </h3>
        <div id="related-posts-grid" class="blog-grid" style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px;">
            <div class="loader-placeholder">Önerilen yazılar hazırlanıyor...</div>
        </div>
    </section>

    <section id="comments-section" class="container" style="padding-bottom: 60px; max-width: 800px;">
        <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 40px 0;">
        <h3 style="color: white; margin-bottom: 20px;">Yorumlar</h3>
        <div id="approved-comments-list" style="margin-bottom: 40px;">
            <div class="loader-placeholder">Yorumlar yükleniyor...</div>
        </div>
        <div class="comment-form-box" style="background: var(--card-bg); padding: 25px; border-radius: 12px; border: 1px solid var(--border-color);">
            <h4 style="margin-bottom: 15px; color: var(--primary-color);">Yorum Yap</h4>
            <form id="comment-form">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; color: var(--text-muted-color); margin-bottom: 5px; font-size: 0.9rem;">Adınız Soyadınız</label>
                    <input type="text" id="comment-author" required style="width: 100%; padding: 10px; background: var(--dark-bg); border: 1px solid var(--border-color); color: white; border-radius: 6px;">
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; color: var(--text-muted-color); margin-bottom: 5px; font-size: 0.9rem;">Yorumunuz</label>
                    <div id="comment-editor" style="height: 150px; background: var(--dark-bg); color: white;"></div>
                </div>
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                    <div style="font-weight: bold; color: var(--primary-color); font-size: 1.1rem;">Güvenlik Sorusu:</div>
                    <div id="captcha-question" style="background: #fff; color: #000; padding: 5px 10px; border-radius: 4px; font-weight: bold; font-family: monospace; font-size: 1.2rem;">? + ? =</div>
                    <input type="number" id="captcha-input" placeholder="Sonuç?" required style="width: 100px; padding: 8px; border-radius: 4px; border: 1px solid #555; background: #222; color: white;">
                </div>
                <button type="submit" class="slide-btn" style="width: 100%; margin: 0; text-align: center; cursor: pointer; background-color: var(--primary-color); border-color: var(--primary-color); color: white;">Onay İçin Gönder</button>
            </form>
        </div>
    </section>

    <footer class="site-footer">
        <div class="container">
            <div class="footer-top">
                <div class="footer-col brand-col">
                    <img src="/logo.png" alt="Lianchez Logo" class="footer-logo">
                    <p class="footer-desc">Lianchez ile işletmenizi dijitale taşıyın. Modern web tasarımı, profesyonel sosyal medya yönetimi ve kurumsal dijital kimlik çözümleri sunuyoruz. Firmanız için profesyonel web sitesi yaptırın.</p>
                    <div class="footer-contact-item">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        <a href="mailto:info@lianchez.com">info@lianchez.com</a>
                    </div>
                    <div class="footer-contact-item">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <a href="tel:+905322879237">+90 532 287 9237</a>
                    </div>
                </div>
                <div class="footer-col">
                    <h4 class="footer-heading">Hızlı Erişim</h4>
                    <ul class="footer-links">
                        <li><a href="/index.html">Ana Sayfa</a></li>
                        <li><a href="/index.html#services">Hizmetlerimiz</a></li>
                        <li><a href="/blog/index.html">Blog & Haberler</a></li>
                        <li><a href="/index.html#contact">Fiyat Teklifi Al</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4 class="footer-heading">Kurumsal & Partnerlik</h4>
                    <ul class="footer-links">
                        <li><a href="/chat.html">Reklam Verin</a></li>
                        <li><a href="/chat.html">Sponsorluklar</a></li>
                        <li><a href="/chat.html">Çözüm Ortaklığı</a></li>
                        <li><a href="/chat.html">Kariyer (Bize Katılın)</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4 class="footer-heading">Lianchez Social</h4>
                    <div class="social-buttons">
                        <a href="https://instagram.com/lianchez.tr" target="_blank" class="social-btn instagram" aria-label="Instagram">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                        </a>
                        <a href="https://www.linkedin.com/company/lianchez" target="_blank" class="social-btn linkedin" aria-label="LinkedIn">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                        </a>
                        <a href="https://wa.me/905322879237" target="_blank" class="social-btn whatsapp" aria-label="WhatsApp">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        </a>
                        <a href="#" class="social-btn youtube" aria-label="YouTube">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                        </a>
                    </div>
                    <h4 class="footer-heading" style="margin-top: 25px;">Yasal</h4>
                    <ul class="footer-links small-links">
                        <li><a href="#">Gizlilik Politikası</a></li>
                        <li><a href="#">Kullanım Şartları</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 Lianchez. Tüm hakları saklıdır.</p>
                <p class="made-with">Antalya'da ❤️ ile tasarlandı.</p>
            </div>
        </div>
    </footer>

    <script>
        // blog.js'e bu sayfanın hangi post olduğunu bildiriyoruz
        window.__STATIC_POST_ID__ = "${postId}";
        window.__STATIC_POST_SLUG__ = "${post.slug}";
    </script>
    <script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
    <script type="module" src="/blog/blog.js"></script>
</body>
</html>`;

    // HTML'i Firebase Storage'a kaydet
    const filePath = `blog/${post.slug}.html`;
    const file = bucket.file(filePath);

    await file.save(htmlContent, {
      contentType: "text/html; charset=utf-8",
      metadata: {
        cacheControl: "public, max-age=3600",
      },
    });

    // Public erişim ver (Firebase Hosting okuyabilsin)
    await file.makePublic();

    console.log(`✅ Statik HTML oluşturuldu: ${filePath}`);
    return null;
  });

// HTML özel karakterleri kaçış fonksiyonu (XSS önlemi)
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// functions/index.js içine ekle
exports.serveBlogPost = onRequest({ 
    memory: "512MiB", // En düşük RAM (en ucuz maliyet)
    maxInstances: 10  // Gereksiz kaynak tüketimini önler
}, async (req, res) => {
    const bucket = admin.storage().bucket();
    // URL sonundaki slug'ı alıyoruz
    const slug = req.path.split('/').pop();

    if (!slug || slug === 'index.html') {
        return res.status(404).send("Geçersiz link.");
    }

    try {
        const file = bucket.file(`blog/${slug}.html`);
        const [exists] = await file.exists();

        if (!exists) {
            return res.status(404).send("Yazı henüz oluşturulmamış.");
        }

        const [content] = await file.download();

        // --- KRİTİK SEO VE CACHE AYARI ---
        // max-age=3600: Ziyaretçinin tarayıcısı 1 saat saklar.
        // s-maxage=2592000: Firebase CDN bu dosyayı 30 GÜN boyunca saklar.
        res.set('Cache-Control', 'public, max-age=3600, s-maxage=2592000');
        res.set('Content-Type', 'text/html; charset=utf-8');
        
        return res.status(200).send(content.toString());

    } catch (error) {
        console.error("Yazı sunma hatası:", error);
        return res.status(500).send("Bir hata oluştu.");
    }
});