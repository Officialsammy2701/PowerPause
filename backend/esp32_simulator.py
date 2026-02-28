import requests
import time
import random
from datetime import datetime, timezone

API_URL = "https://powerpause.onrender.com/api/readings"

POWER_VALUES = [120, 240, 360, 480, 600, 720, 960, 1080]

print("ESP32 simulator running (HTTP mode)...")

while True:
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "power": random.choice(POWER_VALUES)
    }

    try:
        r = requests.post(API_URL, json=payload, timeout=3)
        print("Sent:", payload, "→", r.status_code)
    except Exception as e:
        print("Error sending data:", e)

    time.sleep(5)
