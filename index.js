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

// רשימת מילים אסורות מורחבת - כל מה שציינת ועוד
const BANNED_KEYWORDS = [
    'part', 'repair', 'replacement', 'gear', 'shaft', 'valve', 'pump', 'recoil', 
    'connector', 'adapter', 'screw', 'oil', 'motor', 'carburetor', 'filter', 
    'nozzle', 'seal', 'bearing', 'bracket', 'clutch', 'hose', 'tube',
    'brass', 'copper', 'rod', 'aluminum', 'bar', 'module', 'diamond', 'burs',
    'square', 'ruler', 'bit', 'drill', 'lathe', 'milling', 'cnc', 'pipe', 'welding',
    'kit', 'nozzle', 'washer', 'ring', 'bolt', 'nut'
];

async function shortenUrl(longUrl) {
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, { timeout: 5000 });
        return response.data;
    } catch (error) { return longUrl; }
}

async function runAutomation() {
    try {
        console.log("מתחיל סריקה עם סינון מחיר קשוח...");
        
        const response = await axios({
            method: 'get',
            url: ADMITAD_FEED,
            responseType: 'stream',
            headers: { 'Range': 'bytes=0-2000000', 'User-Agent': 'Mozilla/5.0' }
        });

        let data = '';
        for await (const chunk of response.data) {
            data += chunk;
            if ((data.match(/<\/offer>/g) || []).length >= 80) { // סורקים יותר מוצרים כדי למצוא איכותיים
                response.data.destroy();
                break;
            }
        }

        if (!data.trim().endsWith('</yml_catalog>')) data += '</offers></shop></yml_catalog>';

        const result = await xml2js.parseStringPromise(data, { strict: false });
        let allOffers = result.YML_CATALOG.SHOP[0].OFFERS[0].OFFER;

        // --- מנגנון סינון משופר ---
        let filtered = allOffers.filter(o => {
            const name = (o.NAME ? o.NAME[0] : "").toLowerCase();
            
            // ניקוי המחיר: מוציא רק מספרים ונקודה עשרונית
            const rawPrice = o.PRICE ? o.PRICE[0].toString() : "0";
            const cleanPrice = parseFloat(rawPrice.replace(/[^\d.]/g, ''));
            
            const hasImage = o.PICTURE && o.PICTURE[0];
            const isNotBanned = !BANNED_KEYWORDS.some(word => name.includes(word));
            
            // סינון: רק מוצרים מעל 35 ש"ח (כדי להתרחק מברגים ומוטות נחושת)
            return isNotBanned && hasImage && cleanPrice >= 35;
        });

        console.log(`נמצאו ${filtered.length} מוצרים שעברו את הסינון.`);

        // בחירת 5 אקראיים מתוך האיכותיים
        const selected = filtered.sort(() => 0.5 - Math.random()).slice(0, 5);

        for (const product of selected) {
            const title = product.NAME[0];
            const price = product.PRICE[0] + "₪";
            const url = await shortenUrl(product.URL[0]);
            const img = product.PICTURE[0];

            let hebTitle = title;
            try {
                const res = await translate(title, { to: 'he' });
                hebTitle = res.text;
            } catch (e) {}

            const message = `🛍️ *דיל נבחר מאליאקספרס!* 🛍️\n\n✨ ${hebTitle.substring(0, 85)}\n💰 מחיר: *${price}*\n\n👇 לפרטים ורכישה:\n${url}`;

            await restAPI.file.sendFileByUrl(WA_CHAT_ID, null, img, 'img.jpg', message);
            await new Promise(r => setTimeout(r, 4000));
        }
    } catch (error) {
        if (!error.message.includes('destroyed')) console.error("שגיאה:", error.message);
    }
}
runAutomation();
