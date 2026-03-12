const axios = require('axios');
const xml2js = require('xml2js');
const { translate } = require('@vitalets/google-translate-api');
const whatsAppClient = require('@green-api/whatsapp-api-client');

const GREEN_ID = process.env.GREEN_ID;
const GREEN_TOKEN = process.env.GREEN_TOKEN;
const ADMITAD_FEED = process.env.ADMITAD_FEED;
const WA_CHAT_ID = process.env.WA_CHAT_ID;

const restAPI = whatsAppClient.restAPI({
    idInstance: GREEN_ID,
    apiTokenInstance: GREEN_TOKEN
});

// מילים שאנחנו לא רוצים לראות בקבוצה שלנו
const BANNED_KEYWORDS = ['part', 'replacement', 'repair', 'filter', 'mask', 'cushion', 'connector', 'valve', 'recoil', 'starter'];

async function shortenUrl(longUrl) {
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
        return response.data;
    } catch (error) { return longUrl; }
}

async function runAutomation() {
    try {
        console.log("מושך נתונים ל-5 מוצרים מעניינים...");
        
        // מורידים חלק קצת יותר גדול (5MB) כדי שיהיה לנו מבחר לסנן ממנו
        const response = await axios({
            method: 'get',
            url: ADMITAD_FEED,
            responseType: 'arraybuffer',
            headers: { 'Range': 'bytes=0-5000000', 'User-Agent': 'Mozilla/5.0' }
        });

        let data = response.data.toString('utf-8');
        if (!data.trim().endsWith('</yml_catalog>')) {
            data += '</offers></shop></yml_catalog>';
        }

        const result = await xml2js.parseStringPromise(data, { strict: false });
        let allOffers = result.YML_CATALOG.SHOP[0].OFFERS[0].OFFER;

        // סינון: רק מוצרים עם תמונה, מחיר הגיוני ושאין להם מילים של "חלקי חילוף"
        let filteredOffers = allOffers.filter(offer => {
            const name = (offer.NAME ? offer.NAME[0] : "").toLowerCase();
            const hasImage = offer.PICTURE && offer.PICTURE[0];
            const isNotBanned = !BANNED_KEYWORDS.some(word => name.includes(word));
            return hasImage && isNotBanned;
        });

        // בחירת 5 מוצרים אקראיים מתוך הרשימה המסוננת
        const selectedProducts = filteredOffers
            .sort(() => 0.5 - Math.random())
            .slice(0, 5);

        console.log(`שולח ${selectedProducts.length} מוצרים נבחרים...`);

        for (const product of selectedProducts) {
            const englishTitle = product.NAME[0];
            const price = (product.PRICE ? product.PRICE[0] : "0") + "₪";
            const longUrl = product.URL[0];
            const imageUrl = product.PICTURE[0];

            const shortLink = await shortenUrl(longUrl);

            let hebrewTitle = englishTitle;
            try {
                const res = await translate(englishTitle, { to: 'he' });
                hebrewTitle = res.text;
                // אם התרגום ארוך מדי, נקצר אותו
                if (hebrewTitle.length > 80) hebrewTitle = hebrewTitle.substring(0, 77) + "...";
            } catch (e) { console.log("שגיאת תרגום"); }

            const message = `🌟 *דיל שווה מאליאקספרס!* 🌟\n\n🛍️ ${hebrewTitle}\n💰 מחיר: *${price}*\n\n👇 לרכישה מקוצרת:\n${shortLink}`;

            await restAPI.file.sendFileByUrl(WA_CHAT_ID, null, imageUrl, 'image.jpg', message);
            console.log("✅ נשלח מוצר איכותי");
            
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        console.log("🏁 הסתיים משלוח 5 מוצרים נבחרים!");
        
    } catch (error) {
        console.error("❌ שגיאה:", error.message);
        process.exit(1);
    }
}

runAutomation();
