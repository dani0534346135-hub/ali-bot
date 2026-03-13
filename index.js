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

// מילים חיוביות (בונוס)
const COOL_KEYWORDS = ['smart', 'kitchen', 'home', 'led', 'lamp', 'gadget', 'wireless', 'phone', 'watch', 'toy', 'car', 'shirt', 'clothes', 'shoes', 'bag'];

// רשימה שחורה (חובה לסנן)
const BANNED_KEYWORDS = [
    'sensor', 'module', 'part', 'repair', 'replacement', 'gear', 'shaft', 'valve', 'pump',
    'connector', 'adapter', 'screw', 'oil', 'motor', 'carburetor', 'filter', 'nozzle',
    'brass', 'copper', 'rod', 'aluminum', 'bar', 'diamond', 'drill', 'pipe', 'welding',
    'washer', 'ring', 'bolt', 'nut', 'relay', 'switch', 'cnc', 'lathe'
];

async function shortenUrl(longUrl) {
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, { timeout: 5000 });
        return response.data;
    } catch (error) { return longUrl; }
}

async function runAutomation() {
    try {
        console.log("מתחיל סריקה עמוקה ל-5 מוצרים...");
        
        // הגדלנו ל-6MB כדי למצוא מבחר גדול באמת
        const response = await axios({
            method: 'get',
            url: ADMITAD_FEED,
            responseType: 'stream',
            headers: { 'Range': 'bytes=0-6000000', 'User-Agent': 'Mozilla/5.0' }
        });

        let data = '';
        for await (const chunk of response.data) {
            data += chunk;
            // אוספים עד 400 מוצרים כדי שיהיה ממה לבחור
            if ((data.match(/<\/offer>/g) || []).length >= 400) { 
                response.data.destroy();
                break;
            }
        }

        if (!data.trim().endsWith('</yml_catalog>')) data += '</offers></shop></yml_catalog>';

        const result = await xml2js.parseStringPromise(data, { strict: false });
        let allOffers = result.YML_CATALOG.SHOP[0].OFFERS[0].OFFER;

        // סינון ראשוני: מחיר מעל 20 ש"ח, יש תמונה, ולא "זבל"
        let baseFiltered = allOffers.filter(o => {
            const name = (o.NAME ? o.NAME[0] : "").toLowerCase();
            const rawPrice = o.PRICE ? o.PRICE[0].toString() : "0";
            const price = parseFloat(rawPrice.replace(/[^\d.]/g, ''));
            const isNotBanned = !BANNED_KEYWORDS.some(word => name.includes(word));
            return isNotBanned && price >= 20 && o.PICTURE;
        });

        // נתינת עדיפות למוצרים "מגניבים"
        let coolProducts = baseFiltered.filter(o => {
            const name = o.NAME[0].toLowerCase();
            return COOL_KEYWORDS.some(word => name.includes(word));
        });

        // אם אין מספיק "מגניבים", נשלים מהרשימה המסוננת הכללית
        let finalSelection = coolProducts;
        if (finalSelection.length < 5) {
            const remaining = baseFiltered.filter(o => !coolProducts.includes(o));
            finalSelection = finalSelection.concat(remaining.sort(() => 0.5 - Math.random()).slice(0, 5 - finalSelection.length));
        }

        // בחירת 5 סופיים ואקראיים מתוך מה שמצאנו
        const selected = finalSelection.sort(() => 0.5 - Math.random()).slice(0, 5);

        console.log(`שולח ${selected.length} מוצרים נבחרים...`);

        for (const product of selected) {
            const title = product.NAME[0];
            const price = (product.PRICE ? product.PRICE[0] : "0") + "₪";
            const url = await shortenUrl(product.URL[0]);
            const img = product.PICTURE[0];

            let hebTitle = title;
            try {
                const res = await translate(title, { to: 'he' });
                hebTitle = res.text;
                if (hebTitle.length > 85) hebTitle = hebTitle.substring(0, 82) + "...";
            } catch (e) {}

            const message = `🌟 *דיל שווה מאליאקספרס!* 🌟\n\n🛍️ ${hebTitle}\n💰 מחיר: *${price}*\n\n👇 לפרטים ורכישה:\n${url}`;

            await restAPI.file.sendFileByUrl(WA_CHAT_ID, null, img, 'img.jpg', message);
            await new Promise(r => setTimeout(r, 4000));
        }
        
    } catch (error) {
        if (!error.message.includes('destroyed')) console.error("שגיאה:", error.message);
    }
}
runAutomation();
