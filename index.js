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

// רשימת ה"כן" המוחלטת: בית, מטבח וצעצועים
const ELITE_CATEGORIES = [
    // מטבח ובית
    'kitchen', 'baking', 'cookware', 'home decor', 'organizer', 'lamp', 'coffee', 'mug', 'storage',
    // צעצועים וילדים
    'toy', 'plush', 'doll', 'puzzle', 'lego', 'building blocks', 'remote control', 'rc car', 'baby', 'kids game'
];

// רשימת ה"לא" המוחלטת: למניעת חלקי חילוף וצינורות
const TRASH_BLOCKER = [
    'pipe', 'hose', 'sensor', 'module', 'repair', 'part', 'connector', 'valve', 
    'industrial', 'brass', 'copper', 'motor', 'pump', 'screw', 'drill', 'adapter',
    'replacement', 'fitting', 'nozzle', 'wire', 'cable'
];

async function shortenUrl(longUrl) {
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, { timeout: 5000 });
        return response.data;
    } catch (error) { return longUrl; }
}

async function runAutomation() {
    try {
        console.log("סורק דילים: בית, מטבח וצעצועים בלבד...");
        
        const response = await axios({
            method: 'get',
            url: ADMITAD_FEED,
            responseType: 'stream',
            headers: { 'Range': 'bytes=0-30000000', 'User-Agent': 'Mozilla/5.0' } // סריקה של 30MB למבחר מקסימלי
        });

        let data = '';
        for await (const chunk of response.data) {
            data += chunk;
            if ((data.match(/<\/offer>/g) || []).length >= 2500) { 
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
            
            // סינון קטגוריות רצויות
            const isTargetCategory = ELITE_CATEGORIES.some(word => name.includes(word));
            // חסימת זבל טכני
            const isNotTrash = !TRASH_BLOCKER.some(word => name.includes(word));
            
            // מחיר מינימום 25 ש"ח כדי להבטיח איכות
            return isTargetCategory && isNotTrash && price >= 25 && o.PICTURE;
        });

        console.log(`מצאנו ${filtered.length} מוצרים מעולים שעברו את הסינון.`);

        // בחירת 5 אקראיים כדי שכל יום יהיה משהו חדש
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

            const message = `🌟 *דיל יומי נבחר!* 🌟\n\n✨ ${hebTitle}\n💰 מחיר: *${price}*\n\n👇 לפרטים ורכישה:\n${url}`;

            await restAPI.file.sendFileByUrl(WA_CHAT_ID, null, img, 'img.jpg', message);
            await new Promise(r => setTimeout(r, 5000));
        }
        
    } catch (error) {
        if (!error.message.includes('destroyed')) console.error(error);
    }
}
runAutomation();
