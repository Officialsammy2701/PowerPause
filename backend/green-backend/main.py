from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Green Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

RATE_PER_KWH = 0.18
MAX_POINTS = 60  # ~5 minutes (5s interval)

# ----------------------------
# In-memory state
# ----------------------------

readings: List[dict] = []
monthly_target: float = 0.0
rec_index: int = 0

RECOMMENDATIONS = [
    "Turn off unused devices",
    "Lower AC usage during peak hours",
    "Unplug chargers when not in use",
    "Use energy-efficient lighting",
    "Run full laundry loads only",
    "Reduce standby power consumption",
]

# ----------------------------
# Models
# ----------------------------

class ReadingIn(BaseModel):
    timestamp: str
    power: float

class TargetIn(BaseModel):
    monthly_target: float

# ----------------------------
# Helpers
# ----------------------------

def compute_dashboard():
    global rec_index

    if not readings:
        return {
            "current_power": 0,
            "avg_power": 0,
            "projected_monthly_bill": 0,
            "potential_savings": 0,
            "power_history": [],
            "recommendation": "Waiting for data…",
            "monthly_target": monthly_target,
            "target_status": "No target set"
        }

    # Power stats
    current_power = readings[-1]["power"]
    avg_power = sum(r["power"] for r in readings) / len(readings)

    # Cost projection
    kwh_day = (avg_power * 24) / 1000
    projected_monthly_bill = kwh_day * RATE_PER_KWH * 30

    # 🎯 Target-based savings (CAN BE NEGATIVE)
    if monthly_target > 0:
        potential_savings = monthly_target - projected_monthly_bill
        target_status = (
            "✅ On track"
            if potential_savings >= 0
            else "⚠ Over target"
        )
    else:
        potential_savings = 0
        target_status = "No target set"

    # 🔁 Rotate recommendation every call
    recommendation = RECOMMENDATIONS[rec_index % len(RECOMMENDATIONS)]
    rec_index += 1

    return {
        "current_power": round(current_power, 2),
        "avg_power": round(avg_power, 2),
        "projected_monthly_bill": round(projected_monthly_bill, 2),
        "potential_savings": round(potential_savings, 2),
        "power_history": readings[-30:],  # for chart
        "recommendation": recommendation,
        "monthly_target": monthly_target,
        "target_status": target_status
    }

# ----------------------------
# Routes
# ----------------------------

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/api/readings")
def post_reading(payload: ReadingIn):
    readings.append({
        "timestamp": payload.timestamp,
        "power": payload.power
    })

    if len(readings) > MAX_POINTS:
        readings.pop(0)

    return {"ok": True}

@app.get("/api/dashboard")
def dashboard():
    return compute_dashboard()

@app.post("/api/target")
def set_target(payload: TargetIn):
    global monthly_target
    monthly_target = payload.monthly_target
    return {"ok": True, "monthly_target": monthly_target}
