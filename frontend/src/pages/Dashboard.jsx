import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8081";

export default function Dashboard() {
  const [currentPower, setCurrentPower] = useState(0);
  const [projectedBill, setProjectedBill] = useState(0);
  const [potentialSavings, setPotentialSavings] = useState(0);
  const [recommendation, setRecommendation] = useState("");
  const [history, setHistory] = useState([]);

  // 🎯 target
  const [targetAmount, setTargetAmount] = useState(0);
  const [targetStatus, setTargetStatus] = useState("");

  // ----------------------------
  // Fetch dashboard every 5s
  // ----------------------------
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/dashboard`);
        const data = await res.json();

        setCurrentPower(data.current_power);
        setProjectedBill(Number(data.projected_monthly_bill || 0));
        setPotentialSavings(Number(data.potential_savings || 0));
        setRecommendation(data.recommendation);
        setTargetStatus(data.target_status);

        // 🔁 keep target input in sync with backend
        setTargetAmount(data.monthly_target ?? 0);

        // Chart data
        const chartData = data.power_history.map((p) => ({
          time: new Date(p.timestamp).toLocaleTimeString(),
          power: p.power,
        }));
        setHistory(chartData);
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
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

  return (
    <div className="dash">
      {/* CARDS */}
      <section className="stats-grid">
        <div className="card">
          <h3>Current Power</h3>
          <p className="value">{currentPower.toFixed(0)} W</p>
        </div>

        <div className="card">
          <h3>Projected Bill (30 days)</h3>
          <p className="value">${projectedBill.toFixed(2)}</p>
        </div>

        <div className="card">
          <h3>Potential Savings</h3>
          <p
            className="value"
            style={{
              color: potentialSavings >= 0 ? "#16a34a" : "#dc2626",
            }}
          >
            ${potentialSavings.toFixed(2)}
          </p>
        </div>

        <div className="card">
          <h3>Monthly Target ($)</h3>
          <input
            type="number"
            value={targetAmount}
            onChange={(e) => updateTarget(Number(e.target.value))}
            className="target-input"
          />
          <p className="target-status">{targetStatus}</p>
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
