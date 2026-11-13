// chat.js - Lianchez AI Chat Logic

// DOM Elementleri
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// --- API KONFİGÜRASYONU ---
const API_KEY = "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";
const MODEL_ID = "x-ai/grok-4.1-fast"; // Alternatif: "x-ai/grok-2"
const API_URL = "https://openrouter.ai/api/v1/chat/completions";

// --- SİSTEM TALİMATI (PROMPT) ---
const SYSTEM_PROMPT = `
Sen "Lianchez" dijital ajansının yapay zeka satış ve destek asistanısın.
Adın: Lianchez Asistan.
Konum: Kastamonu ve Antalya.
Misyon: Kullanıcılara ürünlerimizi tanıtmak, bilgi vermek ve satışa yönlendirmek.

KURALLAR:
1. Sadece Lianchez hizmetleri hakkında konuş (Web, Mobil, Oyun, Sosyal Medya).
2. Genel sohbet (hava durumu, şiir yazma, matematik) yapma. Konuyu nazikçe Lianchez hizmetlerine getir.
3. Dil: Türkçe. Samimi ama profesyonel bir "Biz" dili kullan.
4. Fiyatları sorarlarsa "index.html"deki paket fiyatlarını baz alarak cevap ver.
5. ASLA kod yazma. Biz kod yazan bir firmayız, sen sadece asistansın.

HİZMETLER VE FİYATLAR (BİLGİ TABANI):
- Web Sitesi: Başlangıç 12.500₺, Profesyonel 20.000₺.
- Mobil Uygulama: Başlangıç 25.000₺.
- Oyun Geliştirme (Prototip): 30.000₺.
- Sosyal Medya: Başlangıç 4.000₺/ay, Pro 5.000₺/ay.
- İletişim: info@lianchez.com, +90 532 287 9237.

ÖZEL DURUMLAR (YÖNLENDİRME):
Eğer kullanıcı şu konuları açarsa (Reklam, Sponsorluk, Kariyer/İş Başvurusu):
Onlara bu konularda yetkili olmadığını, taleplerini iletmek için "İletişim Formunu" doldurmaları veya WhatsApp/Mail üzerinden iletişime geçmeleri gerektiğini söyle.

ÖRNEK CEVAP TARZI:
User: "Web sitesi kaça?"
AI: "Başlangıç paketi web sitelerimiz 12.500₺'den başlamaktadır. İşletmeniz için modern ve hızlı bir site tasarlayabiliriz. Detaylı teklif ister misiniz?"
`;

// Sohbet Geçmişi
let conversationHistory = [
    { role: "system", content: SYSTEM_PROMPT }
];

// 1. Mesaj Ekleme Fonksiyonu
function addMessage(content, sender) {
    const div = document.createElement('div');
    div.classList.add('message', sender);
    div.innerHTML = content; 
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 2. Yükleniyor Animasyonu
function showTypingIndicator() {
    const div = document.createElement('div');
    div.classList.add('typing-indicator');
    div.id = 'typing-indicator';
    div.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

// 3. API İsteği Gönderme
async function fetchAIResponse(userMsg) {
    conversationHistory.push({ role: "user", content: userMsg });

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://lianchez.com", 
                "X-Title": "Lianchez AI"
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: conversationHistory,
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            throw new Error(`API Hatası: ${response.status}`);
        }

        const data = await response.json();
        const aiText = data.choices[0].message.content;

        conversationHistory.push({ role: "assistant", content: aiText });
        return aiText;

    } catch (error) {
        console.error("AI Hatası:", error);
        return "Üzgünüm, şu an bağlantımda bir sorun var. Lütfen doğrudan <a href='https://wa.me/905322879237'>WhatsApp</a> üzerinden ekibimizle iletişime geçin.";
    }
}

// 4. Form Gönderimi
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    userInput.value = '';
    userInput.disabled = true;
    sendBtn.disabled = true;

    showTypingIndicator();

    const aiResponse = await fetchAIResponse(message);
    
    removeTypingIndicator();
    
    // Markdown'dan basit HTML'e
    let formattedResponse = aiResponse
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    addMessage(formattedResponse, 'ai');
    
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
});

// 5. Hızlı Cevap Butonları
window.sendQuickReply = (text) => {
    userInput.value = text;
    chatForm.dispatchEvent(new Event('submit'));
};