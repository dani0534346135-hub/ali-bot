import requests
import os

# משיכת הסודות מהמערכת המאובטחת של GitHub
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')

def send_to_channel():
    # כתובת השרת 7103 כפי שמופיע בפרטים שלך
    url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    
    payload = {
        "chatId": CHAT_ID,
        "message": "בסייעתא דשמיא, הבוט של אלי-בוט מחובר לערוץ ושולח הודעה ראשונה! 🚀"
    }
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            print("הצלחנו! ההודעה נשלחה לערוץ.")
        else:
            print(f"שגיאה {response.status_code}: {response.text}")
    except Exception as e:
        print(f"קרתה תקלה בהתחברות: {e}")

if __name__ == "__main__":
    send_to_channel()
