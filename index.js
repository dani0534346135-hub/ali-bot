const axios = require('axios');
const xml2js = require('xml2js');
const { translate } = require('@vitalets/google-translate-api');
const whatsAppClient = require('@green-api/whatsapp-api-client');

// משיכת כל הסודות מ-GitHub Actions
const GREEN_ID = process.env.GREEN_ID;
const GREEN_TOKEN = process.env.GREEN_TOKEN;
const ADMITAD_FEED = process.env.ADMITAD_FEED;
const WA_CHAT_ID = process.env.WA_CHAT_ID; // משתמש בסוד שהגדרת

const restAPI = whatsAppClient.restAPI({
    idInstance: GREEN_ID,
    apiTokenInstance: GREEN_TOKEN
});

// פונקציית תרגום
async function translateToHebrew(text) {
    try {
        const res = await translate(text, { to: 'he' });
        return res.text;
    } catch (e) {
        console.error("שגיאת תרגום, משתמש במקור:", e.message);
        return text;
    }
}

async function runAutomation() {
    try {
        console.log("מושך מוצרים מהפיד...");
        const response = await axios.get(ADMITAD_FEED);
        const result = await xml2js.parseStringPromise(response.data);
        
        // שליפת רשימת המוצרים
        const products = result.yml_catalog.shop[0].offers[0].offer;
        const product = products[Math.floor(Math.random() * products.length)];

        // חילוץ נתונים
        const englishTitle = product.name[0];
        const price = product.price[0] + "₪";
        const affiliateLink = product.url[0];
        const imageUrl = product.picture[0];

        console.log("מתרגם כותרת...");
        const hebrewTitle = await translateToHebrew(englishTitle);
        const finalTitle = hebrewTitle.length > 70 ? hebrewTitle.substring(0, 67) + "..." : hebrewTitle;

        const message = `🔥 *דיל חדש מאליאקספרס!* 🔥\n\n🛍️ ${finalTitle}\n💰 במחיר: *${price}*\n\n👇 לרכישה מהירה:\n${affiliateLink}`;

        console.log(`שולח לקבוצה: ${WA_CHAT_ID}`);
        
        // שליחה דרך Green API
        await restAPI.file.sendFileByUrl(WA_CHAT_ID, null, imageUrl, 'image.jpg', message);
        
        console.log("✅ הדיל נשלח בהצלחה!");
    } catch (error) {
        console.error("❌ שגיאה בהרצה:", error.message);
        process.exit(1);
    }
}

runAutomation();
