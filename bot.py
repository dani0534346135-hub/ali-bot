import requests
from bs4 import BeautifulSoup
import os

# סודות מה-GitHub
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')
STORE_ID = os.getenv('AMAZON_STORE_ID')

def get_amazon_deal():
    # כתובת דף המבצעים הכי נמכרים (לדוגמה באלקטרוניקה)
    url = "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.content, "lxml")
        
        # חיפוש המוצר הראשון בדף
        first_product = soup.find("div", {"id": "gridItemRoot"})
        title = first_product.find("div", {"class": "_cDEzb_p13n-sc-css-line-clamp-3_33TTy"}).text
        link_suffix = first_product.find("a", {"class": "a-link-normal"})['href']
        full_link = f"https://www.amazon.com{link_suffix.split('?')[0]}"
        
        return title, full_link
    except Exception as e:
        print(f"שגיאה בסריקת אמזון: {e}")
        return None, None

def send_to_whatsapp(title, link):
    if not title or not link:
        return

    # הוספת מזהה השותף שלך לקישור
    affiliate_url = f"{link}?tag={STORE_ID}"
    
    message = (
        f"🔥 *דיל אוטומטי מאמזון!* 🔥\n\n"
        f"📦 {title}\n\n"
        f"🛒 לרכישה עם הנחת שותף:\n{affiliate_url}"
    )
    
    api_url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    payload = {"chatId": CHAT_ID, "message": message}
    requests.post(api_url, json=payload)

if __name__ == "__main__":
    t, l = get_amazon_deal()
    send_to_whatsapp(t, l)
