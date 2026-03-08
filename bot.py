import requests
from bs4 import BeautifulSoup
import os

# משיכת סודות מה-GitHub
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')
STORE_ID = os.getenv('AMAZON_STORE_ID')

def get_amazon_deal():
    # דף המבצעים הכי נמכרים
    url = "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.content, "html.parser")
        
        # מחפש את כל כרטיסיות המוצרים
        items = soup.select('div#gridItemRoot')
        
        for item in items:
            link_element = item.select_one('a.a-link-normal')
            title_element = item.select_one('div._cDEzb_p13n-sc-css-line-clamp-3_33TTy')
            
            if link_element and title_element:
                link = link_element['href']
                title = title_element.get_text(strip=True)
                
                # סינון: וודא שזה מוצר אמיתי ולא תוכנית שירות (כמו Blink Plan)
                if "/dp/" in link and "plan" not in title.lower():
                    full_link = "https://www.amazon.com" + link.split('?')[0]
                    return title, full_link
        
        return None, None
    except Exception as e:
        print(f"שגיאה בסריקה: {e}")
        return None, None

def send_to_whatsapp(title, link):
    if not title or not link:
        print("לא נמצא מוצר מתאים למשלוח.")
        return

    # הוספת ה-Store ID שלך לקישור
    affiliate_url = f"{link}?tag={STORE_ID}"
    
    message = (
        f"🛍️ *דיל יומי מאמזון - נבחר עבורך!* 🛍️\n\n"
        f"📦 {title}\n\n"
        f"🔗 לפרטים ורכישה:\n{affiliate_url}"
    )
    
    api_url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    payload = {"chatId": CHAT_ID, "message": message}
    
    requests.post(api_url, json=payload)
    print(f"הדיל '{title}' נשלח בהצלחה!")

if __name__ == "__main__":
    t, l = get_amazon_deal()
    send_to_whatsapp(t, l)
