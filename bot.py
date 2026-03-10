import requests
from bs4 import BeautifulSoup
import os
import time
from deep_translator import GoogleTranslator

# הגדרות סודות - מושך מ-GitHub Secrets
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')
STORE_ID = os.getenv('AMAZON_STORE_ID')

# הגדרת המתרגם (יציב יותר מ-googletrans)
translator = GoogleTranslator(source='auto', target='iw')

CATEGORIES = {
    "מחשבים וציוד היקפי": "https://www.amazon.com/Best-Sellers-Computers-Accessories/zgbs/pc/",
    "אלקטרוניקה וגאדג'טים": "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics/",
    "מטבח ובית": "https://www.amazon.com/Best-Sellers-Kitchen-Dining/zgbs/kitchen/",
    "כלי עבודה": "https://www.amazon.com/Best-Sellers-Tools-Home-Improvement/zgbs/hi/",
    "צעצועים ומשחקים": "https://www.amazon.com/Best-Sellers-Toys-Games/zgbs/toys-and-games/"
}

def translate_text(text):
    try:
        # שימוש במנגנון התרגום החדש
        return translator.translate(text)
    except Exception as e:
        print(f"Translation error: {e}")
        return text

def get_deals():
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }
    all_deals = []
    
    for cat_name, url in CATEGORIES.items():
        try:
            print(f"Sourcing deals for: {cat_name}")
            response = requests.get(url, headers=headers, timeout=15)
            soup = BeautifulSoup(response.content, "html.parser")
            items = soup.select('div#gridItemRoot')
            
            count = 0
            for item in items:
                if count >= 2: break # שולח 2 מוצרים מכל קטגוריה
                
                link_el = item.find('a', class_='a-link-normal', tabindex="-1")
                img_el = item.find('img')
                
                if link_el and img_el:
                    raw_title = img_el.get('alt') or "מוצר מומלץ"
                    img_url = img_el.get('src')
                    link = "https://www.amazon.com" + link_el['href'].split('?')[0]
                    
                    if "/dp/" in link:
                        hebrew_title = translate_text(raw_title)
                        all_deals.append({
                            "title": hebrew_title,
                            "link": f"{link}?tag={STORE_ID}",
                            "image": img_url,
                            "category": cat_name
                        })
                        count += 1
            time.sleep(2)
        except Exception as e:
            print(f"Error in category {cat_name}: {e}")
            
    return all_deals

def send_media_deal(deal):
    # שליחת הודעה עם תמונה דרך Green-API
    api_url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendFileByUrl/{API_TOKEN}"
    
    caption = (
        f"🌟 *{deal['category']}* 🌟\n\n"
        f"📦 {deal['title']}\n\n"
        f"🔗 לפרטים ורכישה מאובטחת:\n{deal['link']}"
    )
    
    payload = {
        "chatId": CHAT_ID,
        "urlFile": deal['image'],
        "fileName": "product.jpg",
        "caption": caption
    }
    
    try:
        response = requests.post(api_url, json=payload, timeout=20)
        print(f"Sent: {deal['title']} (Status: {response.status_code})")
    except Exception as e:
        print(f"Failed to send {deal['title']}: {e}")
    time.sleep(5)

if __name__ == "__main__":
    print("--- Starting Amazon Deals Bot ---")
    deals = get_deals()
    for deal in deals:
        send_media_deal(deal)
    print("--- Amazon Bot Finished ---")
