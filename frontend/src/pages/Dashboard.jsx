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

  const [targetDraft, setTargetDraft] = useState("0.00");       // what user is typing
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");              // "Saved", "Failed", etc.

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
      setTargetDraft(Number(data.monthly_target ?? 0).toFixed(2));

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

const target = Number(targetAmount);
const projected = Number(projectedBill);

const progressPct =
  target > 0 ? Math.min(100, Math.max(0, (projected / target) * 100)) : 0;

const progressLabel =
  target > 0
    ? `${progressPct.toFixed(0)}% of target used`
    : "Set a target to track progress";

let budgetLabel = "No target set";
let budgetTone = "neutral"; // for CSS class
let budgetDetail = "Set a monthly target to track your spending.";



if (target > 0) {
  const ratio = projected / target;          // e.g. 0.72 = 72% of target
  const remaining = target - projected;      // how much budget left

  if (ratio > 1) {
    budgetLabel = "Over Budget";
    budgetTone = "danger";
    budgetDetail = `Over by $${Math.abs(remaining).toFixed(2)}.`;
  } else if (ratio >= 0.9) {
    budgetLabel = "Close to Limit";
    budgetTone = "warn";
    budgetDetail = `$${remaining.toFixed(2)} left before hitting your target.`;
  } else {
    budgetLabel = "On Track";
    budgetTone = "good";
    budgetDetail = `$${remaining.toFixed(2)} remaining this month.`;
  }
}

  // ----------------------------
  // Send target to backend
  // ----------------------------
  const saveTarget = async () => {
    setSaveMsg("");
    setIsSavingTarget(true);

    const numericTarget = Number(targetDraft);

    try {
      const res = await fetch(`${API_BASE}/api/target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_target: numericTarget }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      // reflect locally (optimistic)
      setTargetAmount(numericTarget);
      setSaveMsg("Saved ✓");
      // setTargetStatus("Target set ✓");
      setTargetDraft("0.00");

      // clear the message after a bit
      setTimeout(() => setSaveMsg(""), 2000);
      // setTimeout(() => setTargetStatus(""), 2000);
    } catch (err) {
      console.error("Target update failed:", err);
      setSaveMsg("Save failed. Try again.");
    } finally {
      setIsSavingTarget(false);
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
          <div className="stat-value">${Number(projectedBill).toFixed(2)}</div>
          <div className={`pill ${budgetTone}`}>
            {budgetLabel}
          </div>
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
          <div className="stat-value">${Number(targetAmount).toFixed(2)}</div>
          <div className="target-status">{targetAmount > 0 ? "Target set ✓" : "No target set"}</div>
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
            <h3>Monthly Target ($)</h3>
            <p>Set a goal and track progress</p>
            <input
              type="text"
              inputMode="decimal"
              value={targetDraft}
              onChange={(e) => {
                // allow only numbers and decimal point
                const next = e.target.value.replace(/[^0-9.]/g, "");
                const parts = next.split(".");
                const cleaned = parts.length <= 2 ? (parts[1] ? `${parts[0]}.${parts[1].slice(0, 2)}` :   parts[0]) : parts[0];
                setTargetDraft(cleaned);
              }}
              onBlur={() => {
                const n = Number(targetDraft);
                setTargetDraft(Number.isFinite(n) ? n.toFixed(2) : "0.00");
              }}
              className="target-input"
            />

            <button
              className="save-btn"
              onClick={saveTarget}
              disabled={isSavingTarget || Number(targetDraft) === Number(targetAmount)}
            >
              {isSavingTarget ? "Saving..." : "Save Target"}
            </button>

            <div className="save-msg">{saveMsg}</div>

            <div className={`budget-block ${budgetTone}`}>
              <div className="budget-title">{budgetLabel}</div>
              <div className="budget-detail">{budgetDetail}</div>
            </div>

            <div className="progress">
              <div className="progress-head">
                <span className="progress-label">{progressLabel}</span>
                {target > 0 && (
                  <span className="progress-meta">
                    ${projected.toFixed(2)} / ${target.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="progress-track" aria-label="Monthly target progress">
                <div
                  className={`progress-fill ${budgetTone}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
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
