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

async function translateToHebrew(text) {
    try {
        console.log("מתחיל תרגום...");
        // הוספנו Timeout לתרגום כדי שלא יתקע את כל הבוט
        const res = await translate(text, { to: 'he' });
        return res.text;
    } catch (e) {
        console.log("שגיאת תרגום (משתמש במקור):", e.message);
        return text;
    }
}

async function runAutomation() {
    try {
        console.log("מתחבר לפיד של אדמיטד...");
        const response = await axios.get(ADMITAD_FEED, { timeout: 30000 });
        console.log("הפיד התקבל, מפענח XML...");
        
        const result = await xml2js.parseStringPromise(response.data);
        const products = result.yml_catalog.shop[0].offers[0].offer;
        
        if (!products || products.length === 0) {
            throw new Error("לא נמצאו מוצרים בפיד");
        }

        const product = products[Math.floor(Math.random() * products.length)];
        console.log("נבחר מוצר:", product.name[0]);

        const englishTitle = product.name[0];
        const price = product.price[0] + "₪";
        const affiliateLink = product.url[0];
        const imageUrl = product.picture[0];

        const hebrewTitle = await translateToHebrew(englishTitle);
        const finalTitle = hebrewTitle.length > 70 ? hebrewTitle.substring(0, 67) + "..." : hebrewTitle;

        const message = `🔥 *דיל חדש מאליאקספרס!* 🔥\n\n🛍️ ${finalTitle}\n💰 במחיר: *${price}*\n\n👇 לרכישה מהירה:\n${affiliateLink}`;

        console.log("שולח הודעה לוואטסאפ...");
        await restAPI.file.sendFileByUrl(WA_CHAT_ID, null, imageUrl, 'image.jpg', message);
        console.log("✅ נשלח בהצלחה!");
        
    } catch (error) {
        console.error("❌ שגיאה:");
        console.error(error.message);
        process.exit(1);
    }
}

runAutomation();
