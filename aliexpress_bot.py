import requests
import os
import time
from bs4 import BeautifulSoup
from deep_translator import GoogleTranslator

# משיכת סודות
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')
CLIENT_ID = os.getenv('ADMITAD_CLIENT_ID')
BASE64_AUTH = os.getenv('ADMITAD_BASE64')
WEBSITE_ID = os.getenv('ADMITAD_WEBSITE_ID')

def get_admitad_token():
    print("Connecting to Admitad...")
    url = "https://api.admitad.com/token/"
    data = {"grant_type": "client_credentials", "client_id": CLIENT_ID, "scope": "deeplink_generator"}
    headers = {"Authorization": f"Basic {BASE64_AUTH}"}
    try:
        res = requests.post(url, data=data, headers=headers, timeout=10)
        token = res.json().get("access_token")
        if token: print("Admitad Token: OK")
        return token
    except:
        print("Admitad Token: FAILED")
        return None

def get_ali_deals():
    print("Searching for AliExpress deals...")
    # שימוש בקישור קטגוריה כללי שיותר קל לסרוק
    url = "https://www.aliexpress.com/category/200214006/consumer-electronics.html"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"}
    deals = []
    try:
        res = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(res.content, "lxml")
        links = soup.find_all('a', href=True)
        for link in links:
            href = link['href']
            if '/item/' in href and len(deals) < 3:
                full_url = "https:" + href.split('?')[0] if href.startswith('//') else href.split('?')[0]
                deals.append({"link": full_url})
        print(f"Found {len(deals)} deals.")
    except Exception as e:
        print(f"Scraping error: {e}")
    return deals

def send_to_wa(link):
    api_url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    message = f"🎁 *דיל חדש מאלי-אקספרס!* 🎁\n\n🔗 לקנייה:\n{link}"
    payload = {"chatId": CHAT_ID, "message": message}
    try:
        requests.post(api_url, json=payload, timeout=15)
        print(f"WA Sent: {link}")
    except:
        print("WA Failed")

if __name__ == "__main__":
    token = get_admitad_token()
    if token:
        deals = get_ali_deals()
        for deal in deals:
            # הפיכת הקישור לקישור שותף שלך
            api_url = f"https://api.admitad.com/get_deeplink/{WEBSITE_ID}/"
            params = {"urls": deal['link']}
            headers = {"Authorization": f"Bearer {token}"}
            try:
                aff_res = requests.get(api_url, params=params, headers=headers)
                aff_link = aff_res.json()[0]
                send_to_wa(aff_link)
                time.sleep(5)
            except:
                print("DeepLink error")
