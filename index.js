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

// פוקוס מוחלט: רק כלי בית, מטבח ועיצוב
const HOME_ONLY_KEYWORDS = [
    'kitchen', 'cookware', 'baking', 'home decor', 'organizer', 'bathroom', 
    'bedroom', 'lamp', 'furniture', 'cleaning', 'coffee', 'tableware', 'mug',
    'shelf', 'storage', 'curtain', 'rug', 'towel', 'gadget home'
];

// חסימת כל מה שקשור לצינורות, חלקים וטכני
const TRASH_BLOCKER = [
    'pipe', 'hose', 'sensor', 'module', 'repair', 'part', 'connector', 'valve', 
    'industrial', 'brass', 'copper', 'motor', 'pump', 'screw', 'drill', 'adapter'
];

async function shortenUrl(longUrl) {
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, { timeout: 5000 });
        return response.data;
    } catch (error) { return longUrl; }
}

async function runAutomation() {
    try {
        console.log("סורק מוצרים לבית ולמטבח בלבד...");
        
        const response = await axios({
            method: 'get',
            url: ADMITAD_FEED,
            responseType: 'stream',
            headers: { 'Range': 'bytes=0-25000000', 'User-Agent': 'Mozilla/5.0' } // 25MB סריקה עמוקה
        });

        let data = '';
        for await (const chunk of response.data) {
            data += chunk;
            if ((data.match(/<\/offer>/g) || []).length >= 2000) { // סורקים 2000 מוצרים!
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
            
            // האם זה מוצר לבית/מטבח?
            const isHomeProduct = HOME_ONLY_KEYWORDS.some(word => name.includes(word));
            // האם זה זבל טכני?
            const isNotTrash = !TRASH_BLOCKER.some(word => name.includes(word));
            
            return isHomeProduct && isNotTrash && price >= 25 && o.PICTURE;
        });

        console.log(`מצאנו ${filtered.length} מוצרים לבית ולמטבח.`);

        // בחירת 5 אקראיים מהסינון האיכותי
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

            const message = `🏠 *דיל שווה לבית ולמטבח!* 🍳\n\n✨ ${hebTitle}\n💰 מחיר: *${price}*\n\n👇 לפרטים ורכישה:\n${url}`;

            await restAPI.file.sendFileByUrl(WA_CHAT_ID, null, img, 'img.jpg', message);
            await new Promise(r => setTimeout(r, 4000));
        }
        
    } catch (error) {
        if (!error.message.includes('destroyed')) console.error(error);
    }
}
runAutomation();
