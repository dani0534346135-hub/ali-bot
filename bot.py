import requests
from bs4 import BeautifulSoup
import os

# משיכת סודות
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')
STORE_ID = os.getenv('AMAZON_STORE_ID')

def get_amazon_deal():
    # כתובת למחלקת האלקטרוניקה הפופולרית
    url = "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.content, "html.parser")
        
        # חיפוש גמיש יותר של מוצרים
        products = soup.select('div#gridItemRoot')
        
        if not products:
            print("לא נמצאו מוצרים בדף. מנסה שיטה חלופית...")
            return None, None

        # לקיחת המוצר הראשון שמצאנו
        first_product = products[0]
        title_element = first_product.select_one('div._cDEzb_p13n-sc-css-line-clamp-3_33TTy, span')
        link_element = first_product.select_one('a.a-link-normal')
        
        if title_element and link_element:
            title = title_element.get_text(strip=True)
            link = "https://www.amazon.com" + link_element['href'].split('?')[0]
            return title, link
            
        return None, None
    except Exception as e:
        print(f"שגיאה בסריקה: {e}")
        return None, None

def send_to_whatsapp(title, link):
    if not title or not link:
        print("אין מוצר לשלוח.")
        return

    affiliate_url = f"{link}?tag={STORE_ID}"
    
    message = (
        f"🌟 *מבצע חם מאמזון (נבחר עבורך)* 🌟\n\n"
        f"📦 {title}\n\n"
        f"👇 לרכישה בטוחה עם קופון שותף:\n{affiliate_url}"
    )
    
    api_url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    payload = {"chatId": CHAT_ID, "message": message}
    
    res = requests.post(api_url, json=payload)
    print(f"סטטוס שליחה לוואטסאפ: {res.status_code}")

if __name__ == "__main__":
    t, l = get_amazon_deal()
    send_to_whatsapp(t, l)
