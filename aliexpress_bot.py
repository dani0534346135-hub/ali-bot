import requests
import os
import time
from googletrans import Translator
from bs4 import BeautifulSoup

# הגדרות וסודות מ-GitHub
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')

# מפתחות ה-API מהתמונה שלך
CLIENT_ID = os.getenv('ADMITAD_CLIENT_ID')
CLIENT_SECRET = os.getenv('ADMITAD_CLIENT_SECRET')
BASE64_AUTH = os.getenv('ADMITAD_BASE64')

translator = Translator()

def get_admitad_token():
    url = "https://api.admitad.com/token/"
    data = {"grant_type": "client_credentials", "client_id": CLIENT_ID, "scope": "deeplink_generator"}
    headers = {"Authorization": f"Basic {BASE64_AUTH}"}
    try:
        res = requests.post(url, data=data, headers=headers)
        return res.json().get("access_token")
    except: return None

def get_ali_affiliate_link(original_url, token):
    if not token: return original_url
    # 2920912 הוא ה-ID של שטח הפרסום שלך (AliBot)
    api_url = "https://api.admitad.com/get_deeplink/2920912/" 
    params = {"subid": "ali_bot", "urls": original_url}
    headers = {"Authorization": f"Bearer {token}"}
    try:
        res = requests.get(api_url, params=params, headers=headers)
        return res.json()[0]
    except: return original_url

def get_ali_deals():
    # סריקה של מבצעי SuperDeals באלי-אקספרס
    url = "https://www.aliexpress.com/globallocal/superdeals.html"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    deals = []
    try:
        res = requests.get(url, headers=headers)
        soup = BeautifulSoup(res.content, "html.parser")
        # איתור מוצרים בדף
        items = soup.find_all('div', class_='sd-item-info')[:5] 
        for item in items:
            title_el = item.find('div', class_='sd-title')
            link_el = item.find('a')
            img_el = item.find('img')
            if title_el and link_el:
                deals.append({
                    "title": title_el.text.strip(),
                    "link": "https:" + link_el['href'].split('?')[0],
                    "img": "https:" + img_el['src'] if img_el else ""
                })
    except Exception as e:
        print(f"Error scraping: {e}")
    return deals

def send_to_wa(title, link, img_url):
    api_url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendFileByUrl/{API_TOKEN}"
    # תרגום כותרת לעברית
    try: heb_title = translator.translate(title, dest='iw').text
    except: heb_title = title
    
    caption = f"🎁 *דיל לוהט מאלי-אקספרס!* 🎁\n\n📦 {heb_title}\n\n🔗 לקנייה מאובטחת:\n{link}"
    payload = {"chatId": CHAT_ID, "urlFile": img_url, "fileName": "ali_deal.jpg", "caption": caption}
    requests.post(api_url, json=payload)
    time.sleep(10)

if __name__ == "__main__":
    token = get_admitad_token()
    if token:
        deals = get_ali_deals()
        for deal in deals:
            aff_link = get_ali_affiliate_link(deal['link'], token)
            send_to_wa(deal['title'], aff_link, deal['img'])
    else:
        print("Failed to get Admitad token")
