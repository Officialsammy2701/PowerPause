import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8081";

export default function Dashboard() {
  const [currentPower, setCurrentPower] = useState(0);
  const [projectedBill, setProjectedBill] = useState(0);
  const [potentialSavings, setPotentialSavings] = useState(0);
  const [recommendation, setRecommendation] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 🎯 target
  const [targetAmount, setTargetAmount] = useState(0);
  const [targetStatus, setTargetStatus] = useState("");

  // ----------------------------
  // Fetch dashboard every 5s
  // ----------------------------
useEffect(() => {
  const fetchDashboard = async () => {
    try {
      setError("");
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/dashboard`);
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data = await res.json();

      setCurrentPower(data.current_power ?? 0);
      setProjectedBill(Number(data.projected_monthly_bill ?? 0));
      setPotentialSavings(Number(data.potential_savings ?? 0));
      setRecommendation(data.recommendation ?? "");
      setTargetStatus(data.target_status ?? "");

      setTargetAmount(data.monthly_target ?? 0);

      const powerHistory = Array.isArray(data.power_history) ? data.power_history : [];
      const chartData = powerHistory.map((p) => ({
        time: new Date(p.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        power: p.power,
      }));
      setHistory(chartData);
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
      setError("Couldn’t load dashboard data. Check your connection or backend URL.");
    } finally {
      setLoading(false);
    }
  };

  fetchDashboard();
  const interval = setInterval(fetchDashboard, 5000);
  return () => clearInterval(interval);
}, []);

  // ----------------------------
  // Send target to backend
  // ----------------------------
  const updateTarget = async (value) => {
    setTargetAmount(value);
    try {
      await fetch(`${API_BASE}/api/target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_target: value }),
      });
    } catch (err) {
      console.error("Target update failed:", err);
    }
  };

  if (loading) return <div className="loading-state">Loading dashboard data…</div>;
  if (error) return <div className="error-state">{error}</div>;

  return (
    <div className="dash">
      {/* CARDS */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Current Power</div>
          <div className="stat-value">{currentPower} W</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Projected Bill (30 days)</div>
          <div className="stat-value">${projectedBill}</div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Potential Savings</div>
          <div
            className="stat-value"
            style={{ color: potentialSavings >= 0 ? "#16a34a" : "#dc2626" }}
          >
            ${potentialSavings}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-title">Monthly Target ($)</div>
          <input
            type="number"
            value={targetAmount}
            onChange={(e) => updateTarget(Number(e.target.value))}
            className="target-input"
          />
          <div className="target-status">{targetStatus}</div>
        </div>
      </section>

      {/* MAIN ROW */}
      <section className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h3>Live Power Usage</h3>
            <p>Real-time wattage updates</p>
          </div>

          <div className="chart">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={history}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="rgba(255,255,255,0.08)"
                  strokeDasharray="3 8"
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
                  tickLine={{ stroke: "rgba(255,255,255,0.10)" }}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
                  tickLine={{ stroke: "rgba(255,255,255,0.10)" }}
                  width={38}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(10, 15, 25, 0.92)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
                    color: "rgba(255,255,255,0.9)",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                  itemStyle={{ color: "rgba(255,255,255,0.9)" }}
                  cursor={{ stroke: "rgba(255,255,255,0.12)" }}
                />

                <Line
                  type="monotone"
                  dataKey="power"
                  stroke="rgba(16,185,129,0.95)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Monthly Target</h3>
            <p>Set a goal and track progress</p>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => updateTarget(Number(e.target.value))}
              className="target-input"
            />
            <p className="target-status">{targetStatus}</p>
          </div>
        </div>
      </section>

      {/* SMART TIP */}
      <section className="tip fixed-tip">
        💡 <strong>Smart Tip:</strong>{" "}
        {recommendation || "Loading recommendation…"}
      </section>
    </div>
  );
}
