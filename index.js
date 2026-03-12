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
        console.log("מנסה להוריד את הפיד מאדמיטד...");
        
        // הגדרה של הורדה כ-ArrayBuffer כדי לטפל בקבצים שיורדים אוטומטית
        const response = await axios({
            method: 'get',
            url: ADMITAD_FEED,
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        console.log("הקובץ ירד בהצלחה, מפענח נתונים...");
        const xmlData = response.data.toString('utf-8');
        
        const result = await xml2js.parseStringPromise(xmlData);
        
        // ניווט במבנה ה-XML של אדמיטד
        const products = result.yml_catalog.shop[0].offers[0].offer;
        console.log(`נמצאו ${products.length} מוצרים בפיד.`);

        const product = products[Math.floor(Math.random() * products.length)];
        const englishTitle = product.name ? product.name[0] : "Product";
        const price = (product.price ? product.price[0] : "0") + "₪";
        const affiliateLink = product.url ? product.url[0] : "";
        const imageUrl = product.picture ? product.picture[0] : "";

        console.log("מתרגם כותרת לעברית...");
        let hebrewTitle = englishTitle;
        try {
            const res = await translate(englishTitle, { to: 'he' });
            hebrewTitle = res.text;
        } catch (e) {
            console.log("שגיאה בתרגום, משתמש במקור האנגלי.");
        }

        const message = `🔥 *דיל חדש מאליאקספרס!* 🔥\n\n🛍️ ${hebrewTitle}\n💰 מחיר: *${price}*\n\n👇 לרכישה מהירה:\n${affiliateLink}`;

        console.log("שולח לוואטסאפ דרך Green API...");
        const sendResult = await restAPI.file.sendFileByUrl(WA_CHAT_ID, null, imageUrl, 'image.jpg', message);
        
        if (sendResult.idMessage) {
            console.log("✅ הדיל נשלח בהצלחה! מזהה הודעה: " + sendResult.idMessage);
        } else {
            console.log("⚠️ ההודעה נשלחה אבל לא התקבל מזהה חזרה.");
        }
        
    } catch (error) {
        console.error("❌ שגיאה קריטית בהרצה:");
        console.error(error.message);
        process.exit(1);
    }
}

runAutomation();
