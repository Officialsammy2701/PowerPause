import aiosqlite

DB_PATH = "energy_data"

CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    watts REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Stores one row per day (YYYY-MM-DD)
CREATE TABLE IF NOT EXISTS daily_stats (
    day TEXT PRIMARY KEY,
    kwh REAL NOT NULL,
    cost REAL NOT NULL,
    baseline_cost REAL NOT NULL,
    projected_30d_cost REAL NOT NULL,
    projected_30d_cost_baseline REAL NOT NULL,
    projected_30d_savings REAL NOT NULL
);
"""

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript(CREATE_TABLES_SQL)
        await db.commit()

async def insert_reading(timestamp: str, watts: float):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO readings (timestamp, watts) VALUES (?, ?)",
            (timestamp, watts),
        )
        await db.commit()

async def fetch_readings(limit: int = 5000):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT timestamp, watts FROM readings ORDER BY id ASC LIMIT ?",
            (limit,)
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]

async def fetch_readings_between(start_iso: str, end_iso: str, limit: int = 50000):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            """
            SELECT timestamp, watts
            FROM readings
            WHERE timestamp >= ? AND timestamp < ?
            ORDER BY timestamp ASC
            LIMIT ?
            """,
            (start_iso, end_iso, limit)
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]

async def get_setting(key: str):
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = await cur.fetchone()
        return row[0] if row else None

async def set_setting(key: str, value: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )
        await db.commit()

async def upsert_daily_stat(day: str, kwh: float, cost: float, baseline_cost: float,
                           projected_30d_cost: float, projected_30d_cost_baseline: float,
                           projected_30d_savings: float):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO daily_stats (day, kwh, cost, baseline_cost, projected_30d_cost,
                                    projected_30d_cost_baseline, projected_30d_savings)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(day) DO UPDATE SET
                kwh=excluded.kwh,
                cost=excluded.cost,
                baseline_cost=excluded.baseline_cost,
                projected_30d_cost=excluded.projected_30d_cost,
                projected_30d_cost_baseline=excluded.projected_30d_cost_baseline,
                projected_30d_savings=excluded.projected_30d_savings
            """,
            (day, kwh, cost, baseline_cost, projected_30d_cost, projected_30d_cost_baseline, projected_30d_savings),
        )
        await db.commit()

async def fetch_daily_stats(limit: int = 60):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT * FROM daily_stats ORDER BY day DESC LIMIT ?",
            (limit,)
        )
        rows = await cur.fetchall()
        return [dict(r) for r in rows]
