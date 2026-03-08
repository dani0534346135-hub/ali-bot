import requests
from bs4 import BeautifulSoup
import os
import time
from googletrans import Translator

# הגדרות בסיסיות
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')
STORE_ID = os.getenv('AMAZON_STORE_ID')

translator = Translator()

CATEGORIES = {
    "מחשבים וציוד היקפי": "https://www.amazon.com/Best-Sellers-Computers-Accessories/zgbs/pc/",
    "אלקטרוניקה וגאדג'טים": "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics/",
    "מטבח ובית": "https://www.amazon.com/Best-Sellers-Kitchen-Dining/zgbs/kitchen/",
    "כלי עבודה": "https://www.amazon.com/Best-Sellers-Tools-Home-Improvement/zgbs/hi/",
    "צעצועים ומשחקים": "https://www.amazon.com/Best-Sellers-Toys-Games/zgbs/toys-and-games/"
}

def translate_text(text):
    try:
        # תרגום מאנגלית לעברית
        translation = translator.translate(text, src='en', dest='iw')
        return translation.text
    except Exception as e:
        print(f"שגיאה בתרגום: {e}")
        return text # במקרה של שגיאה, יחזור המקור באנגלית

def get_deals_from_category(cat_name, url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }
    deals = []
    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.content, "html.parser")
        items = soup.select('div#gridItemRoot')
        
        count = 0
        for item in items:
            if count >= 2: break
            
            link_el = item.find('a', class_='a-link-normal', tabindex="-1")
            img_el = item.find('img')
            
            if link_el and img_el:
                english_title = img_el.get('alt') or "Recommended Product"
                # כאן קורה הקסם - התרגום
                hebrew_title = translate_text(english_title)
                
                link = "https://www.amazon.com" + link_el['href'].split('?')[0]
                
                if "/dp/" in link:
                    deals.append({"title": hebrew_title, "link": link, "category": cat_name})
                    count += 1
        return deals
    except Exception as e:
        print(f"שגיאה בקטגוריית {cat_name}: {e}")
        return []

def send_deal_wa(deal):
    affiliate_url = f"{deal['link']}?tag={STORE_ID}"
    message = (
        f"🇮🇱 *דיל חם בעברית!* 🇮🇱\n\n"
        f"📦 *מוצר:* {deal['title']}\n"
        f"📂 *קטגוריה:* {deal['category']}\n\n"
        f"👇 לרכישה ישירה מאמזון:\n{affiliate_url}"
    )
    api_url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    requests.post(api_url, json={"chatId": CHAT_ID, "message": message})
    time.sleep(3) # הפסקה מעט ארוכה יותר כדי לא להעמיס על התרגום

if __name__ == "__main__":
    for name, url in CATEGORIES.items():
        category_deals = get_deals_from_category(name, url)
        for deal in category_deals:
            send_deal_wa(deal)
