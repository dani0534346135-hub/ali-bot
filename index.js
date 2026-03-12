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

async function runAutomation() {
    try {
        console.log("מתחיל משיכה של 4 מוצרים מאליאקספרס...");
        
        // אנחנו מבקשים את ה-1MB הראשון של הקובץ (מספיק ל-4 מוצרים בטוח)
        const response = await axios({
            method: 'get',
            url: ADMITAD_FEED,
            responseType: 'stream',
            headers: {
                'Range': 'bytes=0-1000000',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        let data = '';
        let offerCount = 0;

        for await (const chunk of response.data) {
            data += chunk;
            // סופרים כמה מוצרים כבר קראנו
            const matches = data.match(/<\/offer>/g);
            if (matches && matches.length >= 4) {
                console.log("נמצאו 4 מוצרים, עוצר הורדה...");
                response.data.destroy();
                break;
            }
        }

        // סגירה ידנית של ה-XML כדי שיהיה תקין לפענוח
        if (!data.trim().endsWith('</yml_catalog>')) {
            data += '</offers></shop></yml_catalog>';
        }

        const result = await xml2js.parseStringPromise(data, { strict: false });
        const products = result.YML_CATALOG.SHOP[0].OFFERS[0].OFFER.slice(0, 4);

        console.log(`מתחיל לשלוח ${products.length} מוצרים לוואטסאפ...`);

        for (const product of products) {
            const englishTitle = product.NAME ? product.NAME[0] : "Product";
            const price = (product.PRICE ? product.PRICE[0] : "0") + "₪";
            const affiliateLink = product.URL ? product.URL[0] : "";
            const imageUrl = product.PICTURE ? product.PICTURE[0] : "";

            let hebrewTitle = englishTitle;
            try {
                const res = await translate(englishTitle, { to: 'he' });
                hebrewTitle = res.text;
            } catch (e) { console.log("שגיאה בתרגום מוצר אחד"); }

            const message = `🔥 *דיל לוהט מאליאקספרס!* 🔥\n\n🛍️ ${hebrewTitle}\n💰 מחיר: *${price}*\n\n👇 לרכישה:\n${affiliateLink}`;

            await restAPI.file.sendFileByUrl(WA_CHAT_ID, null, imageUrl, 'image.jpg', message);
            console.log(`✅ מוצר נשלח: ${hebrewTitle.substring(0, 20)}...`);
            
            // השהייה קטנה בין מוצר למוצר
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        console.log("🏁 הסתיים משלוח 4 המוצרים מאליאקספרס!");
        
    } catch (error) {
        if (error.message.includes('destroyed')) return;
        console.error("❌ שגיאה:", error.message);
        process.exit(1);
    }
}

runAutomation();
