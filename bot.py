import requests
from bs4 import BeautifulSoup
import os
import time
from deep_translator import GoogleTranslator

# משיכת סודות מ-GitHub
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')
STORE_ID = os.getenv('AMAZON_STORE_ID')

translator = GoogleTranslator(source='auto', target='iw')

# קישורים לרשימות ה-Best Sellers (הכי נמכרים/לוהטים)
CATEGORIES = {
    "🔥 מחשבים וציוד היקפי": "https://www.amazon.com/Best-Sellers-Computers-Accessories/zgbs/pc/",
    "📱 אלקטרוניקה וגאדג'טים": "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics/",
    "🏠 לבית ולמטבח": "https://www.amazon.com/Best-Sellers-Home-Kitchen/zgbs/home-garden/"
}

def translate_text(text):
    try:
        # תרגום כותרת המוצר לעברית
        return translator.translate(text)
    except:
        return text

def get_deals():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }
    all_deals = []
    
    for cat_name, url in CATEGORIES.items():
        try:
            print(f"מושך מוצרים מקטגוריית: {cat_name}")
            res = requests.get(url, headers=headers, timeout=15)
            soup = BeautifulSoup(res.content, "html.parser")
            
            # שליפת 3 המוצרים הראשונים (הכי נמכרים כרגע)
            items = soup.select('div#gridItemRoot')[:3] 
            
            for item in items:
                link_el = item.find('a', class_='a-link-normal', tabindex="-1")
                img_el = item.find('img')
                
                if link_el and img_el:
                    # בניית קישור שותפים נקי
                    raw_link = "https://www.amazon.com" + link_el['href'].split('?')[0]
                    clean_title = img_el.get('alt') or "מוצר ללא תיאור"
                    
                    all_deals.append({
                        "title": translate_text(clean_title),
                        "link": f"{raw_link}?tag={STORE_ID}",
                        "image": img_el.get('src'),
                        "category": cat_name
                    })
        except Exception as e:
            print(f"שגיאה במשיכת קטגוריה {cat_name}: {e}")
            
    return all_deals

def send_to_wa(deal):
    # כתובת ה-API לשליחת קובץ (תמונה + טקסט)
    url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendFileByUrl/{API_TOKEN}"
    
    caption = (
        f"{deal['category']}\n\n"
        f"📦 *{deal['title']}*\n\n"
        f"🛒 לרכישה באמזון:\n{deal['link']}"
    )
    
    payload = {
        "chatId": CHAT_ID,
        "urlFile": deal['image'],
        "fileName": "amazon_deal.jpg",
        "caption": caption
    }
    
    try:
        response = requests.post(url, json=payload, timeout=20)
        if response.status_code == 200:
            print(f"✅ הצלחתי לשלוח: {deal['title'][:30]}...")
        else:
            print(f"❌ שגיאה בשליחה: {response.text}")
    except Exception as e:
        print(f"❌ שגיאה בתקשורת עם Green API: {e}")

if __name__ == "__main__":
    print("🚀 בוט אמזון מתחיל לעבוד...")
    deals = get_deals()
    
    if not deals:
        print("⚠️ לא נמצאו מוצרים חדשים.")
    
    for d in deals:
        send_to_wa(d)
        time.sleep(10) # השהייה בין הודעה להודעה כדי לא להיחסם
        
    print("🏁 סיימתי את המשימה להיום!")
