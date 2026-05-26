import requests
import os
import time
import xml.etree.ElementTree as ET
from subprocess import run

# משיכת סודות מה-GitHub
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')

# ⚠️ שים לב: החלף את הקישור הבא בקישור הפיד (XML) שקיבלת מ-Admitad!
FEED_URL = "https://export.admitad.com/ru/webmaster/websites/YOUR_FEED_LINKS_HERE/"

SENT_FILE = "sent_deals.txt"

def load_sent_deals():
    """טעינת רשימת המוצרים שכבר נשלחו מהקובץ"""
    if os.path.exists(SENT_FILE):
        with open(SENT_FILE, "r") as f:
            return set(line.strip() for line in f.readlines())
    return set()

def save_sent_deal(deal_id):
    """שמירת מזהה המוצר שנשלח כדי שלא יחזור על עצמו"""
    with open(SENT_FILE, "a") as f:
        f.write(f"{deal_id}\n")

def git_commit_changes():
    """מנגנון שמעדכן את GitHub בקובץ הזיכרון החדש"""
    try:
        run(["git", "config", "--global", "user.name", "AliBot-Bot"], check=True)
        run(["git", "config", "--global", "user.email", "bot@alibot.com"], check=True)
        run(["git", "add", SENT_FILE], check=True)
        res = run(["git", "commit", "-m", "🔄 Update sent deals list [skip ci]"], capture_output=True, text=True)
        if "nothing to commit" not in res.stdout:
            run(["git", "push"], check=True)
            print("Successfully updated sent_deals.txt in GitHub!")
    except Exception as e:
        print(f"Git Push Error: {e}")

def get_best_deals_from_feed():
    print("Reading and Filtering Admitad Product Feed...")
    if "YOUR_FEED_LINKS_HERE" in FEED_URL:
        print("⚠️ ERROR: Please update the FEED_URL with your actual Admitad Feed Link!")
        return []

    try:
        res = requests.get(FEED_URL, timeout=30)
        root = ET.fromstring(res.content)
        
        sent_deals = load_sent_deals()
        valid_deals = []
        
        # סריקת כל ה-offers (מוצרים) בפיד
        for offer in root.findall(".//offer"):
            offer_id = offer.get("id")
            
            # 1. מניעת כפילויות: אם כבר שלחנו את המוצר בעבר - דלג עליו!
            if offer_id in sent_deals:
                continue
                
            title = offer.find("model").text if offer.find("model") is not None else (offer.find("name").text if offer.find("name") is not None else "Product")
            link = offer.find("url").text
            price = offer.find("price").text if offer.find("price") is not None else ""
            currency = offer.find("currencyId").text if offer.find("currencyId") is not None else "USD"
            
            # 2. סינון איכות: מדלג על מוצרים זולים מדי (מתחת ל-$5) או שמות קצרים מדי שלא אומרים כלום
            if not price or float(price) < 5.0 or len(title) < 20:
                continue
                
            valid_deals.append({
                "id": offer_id,
                "title": title,
                "link": link,
                "price": f"{price} {currency}"
            })
            
        print(f"Found {len(valid_deals)} new high-quality potential deals.")
        return valid_deals
    except Exception as e:
        print(f"Feed Error: {e}")
        return []

def send_to_wa(deal):
    api_url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    
    # עיצוב ההודעה בצורה שיוצרת עניין ומניעה לפעולה
    message = (
        f"🔥 *דיל לוהט מאלי-אקספרס!* 🔥\n\n"
        f"📦 *המוצר:* {deal['title']}\n"
        f"💰 *מחיר מיוחד:* {deal['price']}\n\n"
        f"🛒 *לקנייה ופרטים נוספים לחצו כאן:* \n{deal['link']}\n\n"
        f"⚡ _המלאי באלי-אקספרס מוגבל, מומלץ לחטוף!_"
    )
    
    payload = {"chatId": CHAT_ID, "message": message}
    try:
        res = requests.post(api_url, json=payload, timeout=15)
        if res.status_code == 200:
            print(f"🚀 Sent to WA: {deal['title']}")
            return True
    except Exception as e:
        print(f"WhatsApp Error: {e}")
    return False

if __name__ == "__main__":
    print("--- AliExpress Smart Feed Bot Start ---")
    deals = get_best_deals_from_feed()
    
    sent_count = 0
    # הבוט ישלח רק 2 מוצרים בכל הפעלה כדי לשמור על קצב טפטוף נעים בקבוצה
    for d in deals:
        if sent_count >= 2: 
            break
            
        if send_to_wa(d):
            save_sent_deal(d["id"])
            sent_count += 1
            time.sleep(10) # השהייה קלה בין שליחות
            
    # אם שלחנו מוצרים חדשים, נבצע שמירה (Push) ל-GitHub כדי שהריצה הבאה תזכור אותם
    if sent_count > 0:
        git_commit_changes()
        
    print(f"--- Finished. Sent {sent_count} new deals in this run. ---")
