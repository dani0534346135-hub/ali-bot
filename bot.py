import requests
from bs4 import BeautifulSoup
import os

# משיכת סודות
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')
STORE_ID = os.getenv('AMAZON_STORE_ID')

def get_amazon_deal():
    # כתובת ישירה למחלקת המחשבים והגאדג'טים - יותר מוצרים, פחות פרסומות
    url = "https://www.amazon.com/Best-Sellers-Computers-Accessories/zgbs/pc/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.content, "html.parser")
        
        # מחפש את כל כרטיסיות המוצרים בשיטה החדשה של אמזון
        items = soup.select('div#gridItemRoot')
        
        for item in items:
            link_element = item.find('a', class_='a-link-normal', tabindex="-1")
            # מחפש כותרת באלמנט התמונה או בטקסט
            img_element = item.find('img')
            title = img_element.get('alt') if img_element else "מוצר מעניין מאמזון"
            
            if link_element and link_element.get('href'):
                raw_link = link_element['href']
                # מוודא שזה קישור למוצר (מכיל /dp/)
                if "/dp/" in raw_link:
                    clean_link = "https://www.amazon.com" + raw_link.split('?')[0]
                    return title, clean_link
        
        return None, None
    except Exception as e:
        print(f"שגיאה בסריקה: {e}")
        return None, None

def send_to_whatsapp(title, link):
    if not title or not link:
        print("לא נמצא מוצר מתאים למשלוח.")
        # הודעת בדיקה למנהל כדי לדעת שהבוט חי
        return

    affiliate_url = f"{link}?tag={STORE_ID}"
    
    message = (
        f"💻 *דיל טכנולוגי מאמזון!* 💻\n\n"
        f"📦 {title}\n\n"
        f"🔗 לפרטים ורכישה:\n{affiliate_url}"
    )
    
    api_url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    payload = {"chatId": CHAT_ID, "message": message}
    
    res = requests.post(api_url, json=payload)
    print(f"נשלח לוואטסאפ. סטטוס: {res.status_code}")

if __name__ == "__main__":
    t, l = get_amazon_deal()
    send_to_whatsapp(t, l)
