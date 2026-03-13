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

// מילים שאנחנו רוצים לראות (מילות מפתח חיוביות)
const COOL_KEYWORDS = [
    'smart', 'kitchen', 'home', 'led', 'lamp', 'gadget', 'wireless', 'bluetooth', 
    'phone', 'watch', 'organizer', 'toy', 'car', 'decor', 'usb', 'portable'
];

// מילים שאנחנו בורחים מהן (רשימה שחורה מורחבת)
const BANNED_KEYWORDS = [
    'sensor', 'module', 'part', 'replacement', 'gear', 'shaft', 'valve', 'pump',
    'connector', 'adapter', 'screw', 'oil', 'motor', 'carburetor', 'filter',
    'brass', 'copper', 'rod', 'aluminum', 'bit', 'drill', 'lathe', 'cnc', 'pipe',
    'welding', 'washer', 'ring', 'bolt', 'nut', 'nozzle', 'switch', 'relay'
];

async function shortenUrl(longUrl) {
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, { timeout: 5000 });
        return response.data;
    } catch (error) { return longUrl; }
}

async function runAutomation() {
    try {
        console.log("מחפש 5 יהלומים מאליאקספרס...");
        
        // מורידים חלק גדול יותר (4MB) כדי שיהיה לנו מבחר אמיתי
        const response = await axios({
            method: 'get',
            url: ADMITAD_FEED,
            responseType: 'stream',
            headers: { 'Range': 'bytes=0-4000000', 'User-Agent': 'Mozilla/5.0' }
        });

        let data = '';
        for await (const chunk of response.data) {
            data += chunk;
            if ((data.match(/<\/offer>/g) || []).length >= 250) { 
                response.data.destroy();
                break;
            }
        }

        if (!data.trim().endsWith('</yml_catalog>')) data += '</offers></shop></yml_catalog>';

        const result = await xml2js.parseStringPromise(data, { strict: false });
        let allOffers = result.YML_CATALOG.SHOP[0].OFFERS[0].OFFER;

        // מנגנון סינון משולב
        let filtered = allOffers.filter(o => {
            const name = (o.NAME ? o.NAME[0] : "").toLowerCase();
            const rawPrice = o.PRICE ? o.PRICE[0].toString() : "0";
            const price = parseFloat(rawPrice.replace(/[^\d.]/g, ''));
            const hasImage = o.PICTURE && o.PICTURE[0];
            
            // 1. לא ברשימה השחורה
            const isNotBanned = !BANNED_KEYWORDS.some(word => name.includes(word));
            // 2. מחיר הגיוני (מעל 20 ש"ח למניעת שטויות)
            const isGoodPrice = price >= 20;
            // 3. מכיל מילת מפתח "מעניינת" (אופציונלי אבל מועדף)
            const isCool = COOL_KEYWORDS.some(word => name.includes(word));

            return isNotBanned && isGoodPrice && hasImage && (isCool || name.length > 20);
        });

        console.log(`סיננו ${filtered.length} מוצרים רלוונטיים.`);

        // בחירת 5 אקראיים כדי שכל יום יהיה שונה
        const selected = filtered.sort(() => 0.5 - Math.random()).slice(0, 5);

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

            const message = `🌟 *דיל שווה במיוחד!* 🌟\n\n🛍️ ${hebTitle}\n💰 מחיר: *${price}*\n\n👇 לפרטים ורכישה:\n${url}`;

            await restAPI.file.sendFileByUrl(WA_CHAT_ID, null, img, 'img.jpg', message);
            await new Promise(r => setTimeout(r, 5000));
        }
        
    } catch (error) {
        if (!error.message.includes('destroyed')) console.error("שגיאה:", error.message);
    }
}
runAutomation();
