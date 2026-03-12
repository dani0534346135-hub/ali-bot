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

CATEGORIES = {
    "מחשבים": "https://www.amazon.com/Best-Sellers-Computers-Accessories/zgbs/pc/",
    "אלקטרוניקה": "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics/"
}

def translate_text(text):
    try:
        return translator.translate(text)
    except:
        return text

def get_deals():
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"}
    all_deals = []
    for cat_name, url in CATEGORIES.items():
        try:
            res = requests.get(url, headers=headers, timeout=15)
            soup = BeautifulSoup(res.content, "html.parser")
            items = soup.select('div#gridItemRoot')[:2]
            for item in items:
                link_el = item.find('a', class_='a-link-normal', tabindex="-1")
                img_el = item.find('img')
                if link_el and img_el:
                    link = "https://www.amazon.com" + link_el['href'].split('?')[0]
                    all_deals.append({
                        "title": translate_text(img_el.get('alt') or "מוצר"),
                        "link": f"{link}?tag={STORE_ID}",
                        "image": img_el.get('src'),
                        "category": cat_name
                    })
        except: pass
    return all_deals

def send_to_wa(deal):
    url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendFileByUrl/{API_TOKEN}"
    payload = {
        "chatId": CHAT_ID,
        "urlFile": deal['image'],
        "fileName": "item.jpg",
        "caption": f"🌟 *{deal['category']}*\n📦 {deal['title']}\n🔗 {deal['link']}"
    }
    requests.post(url, json=payload, timeout=20)

if __name__ == "__main__":
    print("Starting Amazon Bot...")
    deals = get_deals()
    for d in deals:
        send_to_wa(d)
        time.sleep(5)
    print("Amazon Bot Finished.")
