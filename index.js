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

// רשימת מותגים ומוצרים שכיף לקנות (רק אלו יעברו!)
const ELITE_KEYWORDS = [
    'xiaomi', 'samsung', 'apple', 'lenovo', 'baseus', 'ugreen', 'anker', 'blitzwolf', // מותגים
    'smartwatch', 'earbuds', 'vacuum', 'projector', 'tablet', 'console', 'lego', // גאדג'טים
    'air fryer', 'coffee machine', 'blender', 'massager', 'keyboard', 'mouse gaming' // בית ופנאי
];

// מילות "חיסול" - ברגע שזה מופיע, המוצר עף (גם אם כתוב שם xiaomi)
const TRASH_KEYWORDS = ['sensor', 'module', 'repair', 'part', 'replacement', 'tester', 'chip', 'board', 'cable core', 'plug connector'];

async function shortenUrl(longUrl) {
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, { timeout: 5000 });
        return response.data;
    } catch (error) { return longUrl; }
}

async function runAutomation() {
    try {
        console.log("מבצע סינון 'אליטה' - רק מותגים ומוצרים מוכרים...");
        
        const response = await axios({
            method: 'get',
            url: ADMITAD_FEED,
            responseType: 'stream',
            headers: { 'Range': 'bytes=0-20000000', 'User-Agent': 'Mozilla/5.0' } // סריקה של 20MB!
        });

        let data = '';
        for await (const chunk of response.data) {
            data += chunk;
            if ((data.match(/<\/offer>/g) || []).length >= 1500) { 
                response.data.destroy();
                break;
            }
        }

        if (!data.trim().endsWith('</yml_catalog>')) data += '</offers></shop></yml_catalog>';

        const result = await xml2js.parseStringPromise(data, { strict: false });
        let allOffers = result.YML_CATALOG.SHOP[0].OFFERS[0].OFFER;

        let filtered = allOffers.filter(o => {
            const name = (o.NAME ? o.NAME[0] : "").toLowerCase();
            const rawPrice = o.PRICE ? o.PRICE[0].toString() : "0";
            const price = parseFloat(rawPrice.replace(/[^\d.]/g, ''));
            
            // בדיקה אם זה מותג/מוצר אליטה
            const isElite = ELITE_KEYWORDS.some(word => name.includes(word));
            // בדיקה שזה לא זבל טכני
            const isNotTrash = !TRASH_KEYWORDS.some(word => name.includes(word));
            
            return isElite && isNotTrash && price >= 30 && o.PICTURE;
        });

        console.log(`מצאנו ${filtered.length} מוצרי אליטה.`);

        // אם מצאנו פחות מ-5, נוריד קצת את הכפפות וניקח מוצרים עם שמות ארוכים (בד"כ מוצרים אמיתיים)
        if (filtered.length < 5) {
            const backup = allOffers.filter(o => {
                const name = (o.NAME ? o.NAME[0] : "").toLowerCase();
                return name.length > 50 && !TRASH_KEYWORDS.some(word => name.includes(word)) && o.PICTURE;
            });
            filtered = filtered.concat(backup.slice(0, 5 - filtered.length));
        }

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
            } catch (e) {}

            const message = `💎 *דיל נבחר - מותגים מובילים!* 💎\n\n✨ ${hebTitle.substring(0, 85)}\n💰 מחיר: *${price}*\n\n👇 לפרטים ורכישה:\n${url}`;

            await restAPI.file.sendFileByUrl(WA_CHAT_ID, null, img, 'img.jpg', message);
            await new Promise(r => setTimeout(r, 4000));
        }
        
    } catch (error) {
        if (!error.message.includes('destroyed')) console.error(error);
    }
}
runAutomation();
