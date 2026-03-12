import requests
import os
import time

# משיכת סודות
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')
BASE64_AUTH =(RVdJQ2pyRzYwSHBxdUJMZElnS2dRZHdqZTdMRTYxOngwTm1LTldLTHVPT3JpZ2FTVXQ4RkN6ckNadE5CRw==)
WEBSITE_ID = os.getenv('ADMITAD_WEBSITE_ID')

def get_admitad_token():
    print("Checking Credentials...")
    if not BASE64_AUTH:
        print("CRITICAL ERROR: ADMITAD_BASE64 is missing in GitHub Secrets!")
        return None
        
    url = "https://api.admitad.com/token/"
    headers = {"Authorization": f"Basic {BASE64_AUTH}"}
    data = {
        "grant_type": "client_credentials", 
        "scope": "deeplink_generator deals coupons ads"
    }
    try:
        res = requests.post(url, data=data, headers=headers, timeout=10)
        token_data = res.json()
        if "access_token" in token_data:
            return token_data["access_token"]
        else:
            print(f"Admitad API Error: {token_data}")
            return None
    except Exception as e:
        print(f"Connection Error: {e}")
        return None

def get_ali_deals():
    print("Searching for AliExpress deals...")
    url = "https://www.aliexpress.com/category/200214006/consumer-electronics.html"
    headers = {"User-Agent": "Mozilla/5.0"}
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
    except: pass
    return deals

def create_deeplink(token, target_url):
    if not WEBSITE_ID:
        return target_url
    api_url = f"https://api.admitad.com/get_deeplink/{WEBSITE_ID}/"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"subid": "ali_bot", "urls": target_url}
    try:
        res = requests.get(api_url, params=params, headers=headers, timeout=10)
        data = res.json()
        return data[0] if isinstance(data, list) else target_url
    except:
        return target_url

def send_to_wa(link):
    api_url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    payload = {
        "chatId": CHAT_ID, 
        "message": f"🎁 *דיל לוהט מאלי-אקספרס!* 🎁\n\n🔗 לקנייה:\n{link}"
    }
    try:
        requests.post(api_url, json=payload, timeout=15)
        print(f"WA Sent: {link}")
    except: pass

if __name__ == "__main__":
    token = get_admitad_token()
    if token:
        print("Admitad Token: OK")
        deals = get_ali_deals()
        for deal_url in deals:
            aff_link = create_deeplink(token, deal_url)
            send_to_wa(aff_link)
            time.sleep(5)
    else:
        print("Admitad Token: FAILED - Please check your GitHub Secrets.")
