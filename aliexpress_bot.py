import requests
import os
import time
from googletrans import Translator

# סודות מה-GitHub
ID_INSTANCE = os.getenv('GREEN_API_ID')
API_TOKEN = os.getenv('GREEN_API_TOKEN')
CHAT_ID = os.getenv('WA_CHAT_ID')

# סודות Admitad מהתמונה שלך
CLIENT_ID = os.getenv('ADMITAD_CLIENT_ID')
CLIENT_SECRET = os.getenv('ADMITAD_CLIENT_SECRET')
BASE64_AUTH = os.getenv('ADMITAD_BASE64')

translator = Translator()

def get_admitad_token():
    url = "https://api.admitad.com/token/"
    data = {"grant_type": "client_credentials", "client_id": CLIENT_ID, "scope": "deeplink_generator"}
    headers = {"Authorization": f"Basic {BASE64_AUTH}"}
    try:
        res = requests.post(url, data=data, headers=headers)
        return res.json().get("access_token")
    except: return None

def get_ali_affiliate_link(original_url, token):
    if not token: return original_url
    api_url = "https://api.admitad.com/get_deeplink/2920912/" 
    params = {"subid": "ali_bot", "urls": original_url}
    headers = {"Authorization": f"Bearer {token}"}
    try:
        res = requests.get(api_url, params=params, headers=headers)
        return res.json()[0]
    except: return original_url

# כאן נוסיף את פונקציית הסריקה של אלי-אקספרס ברגע שנטפרי יאשרו לך את הכפתור
if __name__ == "__main__":
    token = get_admitad_token()
    print("בוט אלי-אקספרס מוכן ומחכה לאישור התוכנית!")
