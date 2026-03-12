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

const BANNED_KEYWORDS = ['part', 'replacement', 'repair', 'filter', 'mask', 'cushion', 'connector', 'valve', 'recoil', 'starter', 'screw'];

async function shortenUrl(longUrl) {
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, { timeout: 5000 });
        return response.data;
    } catch (error) { return longUrl; }
}

async function runAutomation() {
    try {
        console.log("מושך 5 מוצרים מעניינים בשיטה מהירה...");
        
        const response = await axios({
            method: 'get',
            url: ADMITAD_FEED,
            responseType: 'stream',
            headers: { 'Range': 'bytes=0-400000', 'User-Agent': 'Mozilla/5.0' }
        });

        let data = '';
        for await (const chunk of response.data) {
            data += chunk;
            if ((data.match(/<\/offer>/g) || []).length >= 15) { // מושכים 15 כדי שיהיה ממה לבחור
                response.data.destroy();
                break;
            }
        }

        if (!data.trim().endsWith('</yml_catalog>')) data += '</offers></shop></yml_catalog>';

        const result = await xml2js.parseStringPromise(data, { strict: false });
        let allOffers = result.YML_CATALOG.SHOP[0].OFFERS[0].OFFER;

        // סינון זבל
        let filtered = allOffers.filter(o => {
            const name = (o.NAME ? o.NAME[0] : "").toLowerCase();
            return !BANNED_KEYWORDS.some(word => name.includes(word)) && o.PICTURE;
        });

        // בחירת 5 אקראיים מהרשימה שסיננו
        const selected = filtered.sort(() => 0.5 - Math.random()).slice(0, 5);

        console.log(`שולח ${selected.length} מוצרים...`);

        for (const product of selected) {
            const title = product.NAME[0];
            const price = (product.PRICE ? product.PRICE[0] : "0") + "₪";
            const url = await shortenUrl(product.URL[0]);
            const img = product.PICTURE[0];

            let hebTitle = title;
            try {
                const res = await translate(title, { to: 'he' });
                hebTitle = res.text;
            } catch (e) {}

            const message = `🌟 *דיל שווה מאליאקספרס!* 🌟\n\n🛍️ ${hebTitle.substring(0, 80)}\n💰 מחיר: *${price}*\n\n👇 לרכישה:\n${url}`;

            await restAPI.file.sendFileByUrl(WA_CHAT_ID, null, img, 'img.jpg', message);
            await new Promise(r => setTimeout(r, 4000));
        }
        console.log("✅ הסתיים בהצלחה!");
    } catch (error) {
        if (!error.message.includes('destroyed')) {
            console.error("שגיאה:", error.message);
            process.exit(1);
        }
    }
}
runAutomation();
