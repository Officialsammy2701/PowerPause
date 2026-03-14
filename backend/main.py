from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import time
import asyncpg
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# ----------------------------
# DB pool
# ----------------------------
pool: asyncpg.Pool = None

async def get_pool() -> asyncpg.Pool:
    return pool

# ----------------------------
# Lifespan (startup/shutdown)
# ----------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)

    # Create tables if they don't exist
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS readings (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMPTZ NOT NULL,
                power DOUBLE PRECISION NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        # Seed default target if not set
        await conn.execute("""
            INSERT INTO settings (key, value)
            VALUES ('monthly_target', '0.0')
            ON CONFLICT (key) DO NOTHING
        """)

    print("✅ Database connected and tables ready")
    yield

    await pool.close()
    print("Database pool closed")

# ----------------------------
# App
# ----------------------------
app = FastAPI(title="PowerPause Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://powerpause.vercel.app"],
    allow_methods=["https://powerpause.vercel.app"],
    allow_headers=["https://powerpause.vercel.app"],
)

RATE_PER_KWH = 0.18
MAX_READINGS = 500  # keep last 500 readings in DB

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
async def compute_dashboard():
    global rec_index

    async with pool.acquire() as conn:
        # Get last 60 readings for chart
        rows = await conn.fetch("""
            SELECT timestamp, power
            FROM readings
            ORDER BY timestamp DESC
            LIMIT 60
        """)

        # Get monthly target
        target_row = await conn.fetchrow(
            "SELECT value FROM settings WHERE key = 'monthly_target'"
        )
        monthly_target = float(target_row["value"]) if target_row else 0.0

    if not rows:
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

    # Reverse so oldest first for chart
    readings_list = list(reversed(rows))

    current_power = readings_list[-1]["power"]
    avg_power = sum(r["power"] for r in readings_list) / len(readings_list)

    kwh_day = (avg_power * 24) / 1000
    projected_monthly_bill = kwh_day * RATE_PER_KWH * 30

    if monthly_target > 0:
        potential_savings = monthly_target - projected_monthly_bill
        target_status = "✅ On track" if potential_savings >= 0 else "⚠ Over target"
    else:
        potential_savings = 0
        target_status = "No target set"

    # Rotate recommendation every ~1 minute
    recommendation = RECOMMENDATIONS[int(time.time() // 60) % len(RECOMMENDATIONS)]

    power_history = [
        {
            "timestamp": r["timestamp"].isoformat(),
            "power": r["power"]
        }
        for r in readings_list[-30:]
    ]

    return {
        "current_power": round(current_power, 2),
        "avg_power": round(avg_power, 2),
        "projected_monthly_bill": round(projected_monthly_bill, 2),
        "potential_savings": round(potential_savings, 2),
        "power_history": power_history,
        "recommendation": recommendation,
        "monthly_target": monthly_target,
        "target_status": target_status
    }

# ----------------------------
# Routes
# ----------------------------
@app.get("/")
def root():
    return {
        "message": "PowerPause backend is running",
        "health": "/health",
        "dashboard": "/api/dashboard",
        "docs": "/docs"
    }

@app.get("/favicon.ico")
def favicon():
    return Response(status_code=204)

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/api/readings")
async def post_reading(payload: ReadingIn):
    async with pool.acquire() as conn:
        # Insert new reading
        parsed_timestamp = datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00"))
        await conn.execute(
            "INSERT INTO readings (timestamp, power) VALUES ($1, $2)",
            parsed_timestamp, payload.power
        )

        # Keep only last MAX_READINGS rows
        await conn.execute("""
            DELETE FROM readings
            WHERE id NOT IN (
                SELECT id FROM readings
                ORDER BY timestamp DESC
                LIMIT $1
            )
        """, MAX_READINGS)

    return {"ok": True}

@app.get("/api/dashboard")
async def dashboard():
    return await compute_dashboard()

@app.post("/api/target")
async def set_target(payload: TargetIn):
    async with pool.acquire() as conn:
        await conn.execute("""
            INSERT INTO settings (key, value)
            VALUES ('monthly_target', $1)
            ON CONFLICT (key) DO UPDATE SET value = $1
        """, str(payload.monthly_target))

    return {"ok": True, "monthly_target": payload.monthly_target}
