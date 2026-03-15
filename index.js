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

// רשימת ה"כן" - רק מוצרים שקשורים למילים האלו ייכנסו
const ALLOWED_CATEGORIES = [
    'toy', 'game', 'puzzle', 'drone', 'remote control', // צעצועים
    'kitchen', 'home', 'decor', 'organizer', 'lamp', 'led', 'pillow', // כלי בית
    'earbuds', 'headphone', 'speaker', 'mp3', 'player', 'bluetooth', // אלקטרוניקה ונגנים
    'flash drive', 'usb', 'memory card', 'sd card', 'ssd', 'drive' // אונקי וזיכרון
];

// רשימת ה"לא" - ליתר ביטחון נגד צינורות וחלקי פלסטיק
const BANNED_KEYWORDS = ['pipe', 'hose', 'plastic parts', 'valve', 'repair', 'connector', 'tube', 'bracket'];

async function shortenUrl(longUrl) {
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, { timeout: 5000 });
        return response.data;
    } catch (error) { return longUrl; }
}

async function runAutomation() {
    try {
        console.log("מחפש מוצרים לפי הקטגוריות שביקשת...");
        
        const response = await axios({
            method: 'get',
            url: ADMITAD_FEED,
            responseType: 'stream',
            headers: { 'Range': 'bytes=0-15000000', 'User-Agent': 'Mozilla/5.0' } // סריקה רחבה מאוד (15MB)
        });

        let data = '';
        for await (const chunk of response.data) {
            data += chunk;
            if ((data.match(/<\/offer>/g) || []).length >= 1000) { 
                response.data.destroy();
                break;
            }
        }

        if (!data.trim().endsWith('</yml_catalog>')) data += '</offers></shop></yml_catalog>';

        const result = await xml2js.parseStringPromise(data, { strict: false });
        let allOffers = result.YML_CATALOG.SHOP[0].OFFERS[0].OFFER;

        // סינון אגרסיבי: רק מה שברשימת המילים המותרות
        let filtered = allOffers.filter(o => {
            const name = (o.NAME ? o.NAME[0] : "").toLowerCase();
            const rawPrice = o.PRICE ? o.PRICE[0].toString() : "0";
            const price = parseFloat(rawPrice.replace(/[^\d.]/g, ''));
            
            const isAllowed = ALLOWED_CATEGORIES.some(word => name.includes(word));
            const isNotBanned = !BANNED_KEYWORDS.some(word => name.includes(word));
            
            return isAllowed && isNotBanned && price >= 15 && o.PICTURE;
        });

        console.log(`נמצאו ${filtered.length} מוצרים שמתאימים בדיוק לבקשה שלך.`);

        // בחירת 5 אקראיים מהרשימה האיכותית
        const selected = filtered.sort(() => Math.random() - 0.5).slice(0, 5);

        for (const product of selected) {
            const title = product.NAME[0];
            const price = product.PRICE[0] + "₪";
            const url = await shortenUrl(product.URL[0]);
            const img = product.PICTURE[0];

            let hebTitle = title;
            try {
                const res = await translate(title, { to: 'he' });
                hebTitle = res.text;
                if (hebTitle.length > 85) hebTitle = hebTitle.substring(0, 82) + "...";
            } catch (e) {}

            const message = `🎁 *דיל שווה מאליאקספרס!* 🎁\n\n✨ ${hebTitle}\n💰 מחיר: *${price}*\n\n👇 לפרטים ורכישה:\n${url}`;

            await restAPI.file.sendFileByUrl(WA_CHAT_ID, null, img, 'img.jpg', message);
            await new Promise(r => setTimeout(r, 4000));
        }
        
    } catch (error) {
        if (!error.message.includes('destroyed')) console.error(error);
    }
}
runAutomation();
