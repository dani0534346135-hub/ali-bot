import requests
import os
import time

# משיכת סודות
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')
BASE64_AUTH = os.getenv('ADMITAD_BASE64')
WEBSITE_ID = os.getenv('ADMITAD_WEBSITE_ID')

def get_admitad_token():
    print("Connecting to Admitad...")
    url = "https://api.admitad.com/token/"
    headers = {"Authorization": f"Basic {BASE64_AUTH}"}
    data = {"grant_type": "client_credentials", "scope": "deeplink_generator"}
    try:
        res = requests.post(url, data=data, headers=headers, timeout=10)
        return res.json().get("access_token")
    except Exception as e:
        print(f"Token Error: {e}")
        return None

def get_ali_deals():
    print("Searching for AliExpress deals...")
    url = "https://www.aliexpress.com/category/200214006/consumer-electronics.html"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    deals = []
    try:
        res = requests.get(url, headers=headers, timeout=15)
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(res.content, "lxml")
        links = soup.find_all('a', href=True)
        for link in links:
            href = link['href']
            if '/item/' in href and len(deals) < 3:
                full_url = "https:" + href.split('?')[0] if href.startswith('//') else href.split('?')[0]
                deals.append(full_url)
        print(f"Found {len(deals)} deals.")
    except Exception as e:
        print(f"Scraping Error: {e}")
    return deals

def create_deeplink(token, target_url):
    api_url = f"https://api.admitad.com/get_deeplink/{WEBSITE_ID}/"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"subid": "ali_bot", "urls": target_url}
    try:
        res = requests.get(api_url, params=params, headers=headers, timeout=10)
        data = res.json()
        if isinstance(data, list) and len(data) > 0:
            return data[0]
        return None
    except:
        return None

def send_to_wa(link):
    api_url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    payload = {
        "chatId": CHAT_ID, 
        "message": f"🎁 *דיל לוהט מאלי-אקספרס!* 🎁\n\n🔗 לקנייה:\n{link}"
    }
    try:
        requests.post(api_url, json=payload, timeout=15)
        print(f"WA Sent: {link}")
    except Exception as e:
        print(f"WhatsApp Error: {e}")

if __name__ == "__main__":
    token = get_admitad_token()
    if token:
        print("Admitad Token: OK")
        deals = get_ali_deals()
        for deal_url in deals:
            aff_link = create_deeplink(token, deal_url)
            # אם יש קישור שותף נשתמש בו, אם לא נשתמש במקורי
            final_link = aff_link if aff_link else deal_url
            send_to_wa(final_link)
            time.sleep(5)
    else:
        print("Admitad Token: FAILED")
