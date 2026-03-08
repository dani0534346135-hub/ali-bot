import requests
import os

# משיכת הסודות מהמערכת המאובטחת של GitHub
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')

def send_test_message():
    # כתובת השרת לפי ה-ID שלך (7103)
    url = f"https://7103.api.green-api.com/waInstance{ID_INSTANCE}/sendMessage/{API_TOKEN}"
    
    payload = {
        "chatId": CHAT_ID,
        "message": (
            "בסייעתא דשמיא!\n"
            "הבוט של אלי-בוט הוגדר בהצלחה. ✅\n\n"
            "פרטי התחברות:\n"
            f"מזהה מופע: {ID_INSTANCE}\n"
            "סטטוס: מחובר ופעיל 🚀"
        )
    }
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            print("הצלחנו! ההודעה הגיעה לקבוצה.")
        else:
            print(f"שגיאה {response.status_code}: {response.text}")
            print("טיפ: בדוק אם הטוקן ב-Secrets מסתיים ב-a6 ומכיל 50 תווים.")
    except Exception as e:
        print(f"קרתה תקלה טכנית: {e}")

if __name__ == "__main__":
    send_test_message()
