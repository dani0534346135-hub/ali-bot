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

const BANNED_KEYWORDS = [
    'part', 'repair', 'replacement', 'gear', 'shaft', 'valve', 'pump', 'connector', 
    'adapter', 'screw', 'oil', 'motor', 'carburetor', 'filter', 'nozzle', 'brass', 
    'copper', 'rod', 'aluminum', 'bar', 'diamond', 'drill', 'pipe', 'welding', 
    'washer', 'ring', 'bolt', 'nut', 'relay', 'switch', 'cnc', 'lathe', 'sensor', 'module'
];

// מילים שקשורות לבגדים כדי שנדע לא לשלוח יותר מדי מהם
const CLOTHING_KEYWORDS = ['shirt', 't-shirt', 'polo', 'pants', 'trousers', 'dress', 'clothing', 'jacket', 'hoodie', 'socks'];

async function shortenUrl(longUrl) {
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, { timeout: 5000 });
        return response.data;
    } catch (error) { return longUrl; }
}

async function runAutomation() {
    try {
        console.log("מחפש 5 דילים מגוונים (מלחמה בחולצות!)...");
        
        const response = await axios({
            method: 'get',
            url: ADMITAD_FEED,
            responseType: 'stream',
            headers: { 'Range': 'bytes=0-10000000', 'User-Agent': 'Mozilla/5.0' } // 10MB למקסימום מבחר
        });

        let data = '';
        for await (const chunk of response.data) {
            data += chunk;
            if ((data.match(/<\/offer>/g) || []).length >= 800) { 
                response.data.destroy();
                break;
            }
        }

        if (!data.trim().endsWith('</yml_catalog>')) data += '</offers></shop></yml_catalog>';

        const result = await xml2js.parseStringPromise(data, { strict: false });
        let allOffers = result.YML_CATALOG.SHOP[0].OFFERS[0].OFFER;

        let baseFiltered = allOffers.filter(o => {
            const name = (o.NAME ? o.NAME[0] : "").toLowerCase();
            const rawPrice = o.PRICE ? o.PRICE[0].toString() : "0";
            const price = parseFloat(rawPrice.replace(/[^\d.]/g, ''));
            const isNotBanned = !BANNED_KEYWORDS.some(word => name.includes(word));
            return isNotBanned && price >= 25 && o.PICTURE;
        });

        // ערבוב אקראי חזק
        baseFiltered = baseFiltered.sort(() => Math.random() - 0.5);

        let selected = [];
        let clothingCount = 0;

        for (const product of baseFiltered) {
            if (selected.length >= 5) break;
            
            const title = product.NAME[0].toLowerCase();
            const isClothing = CLOTHING_KEYWORDS.some(word => title.includes(word));

            // חוק הגיוון: לא יותר מחולצה/בגד אחד!
            if (isClothing) {
                if (clothingCount < 1) {
                    selected.push(product);
                    clothingCount++;
                }
                continue; // מדלג על שאר הבגדים
            }

            selected.push(product);
        }

        // אם עדיין אין 5 (כי היו רק בגדים), נאלץ לקחת מה שיש
        if (selected.length < 5) {
            selected = selected.concat(baseFiltered.filter(o => !selected.includes(o)).slice(0, 5 - selected.length));
        }

        console.log(`שולח ${selected.length} מוצרים מגוונים...`);

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

            const message = `🔥 *דיל שווה מאליאקספרס!* 🔥\n\n🛍️ ${hebTitle}\n💰 מחיר: *${price}*\n\n👇 לפרטים ורכישה:\n${url}`;

            await restAPI.file.sendFileByUrl(WA_CHAT_ID, null, img, 'img.jpg', message);
            await new Promise(r => setTimeout(r, 4000));
        }
        
    } catch (error) {
        if (!error.message.includes('destroyed')) console.error(error);
    }
}
runAutomation();
