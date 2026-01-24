import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE = "http://127.0.0.1:8081";

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
        setProjectedBill(data.projected_monthly_bill);
        setPotentialSavings(data.potential_savings);
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
    <div className="dashboard one-page">
      {/* HEADER */}
      <header className="main-header">
        <h1>🏡 Household Energy Optimizer</h1>
        <p>Real-time monitoring & energy savings</p>
      </header>

      {/* CARDS */}
      <section className="cards">
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
      <section className="dashboard-row fixed-height">
        <aside className="dashboard-side">
          <ul>
            <li>🏠 Home</li>
            <li>🎯 Target</li>
            <li>📊 Dashboard</li>
            <li>🔌 Devices</li>
            <li>📈 Metrics</li>
            <li>⭐ Feedback</li>
          </ul>
        </aside>

        <div className="chart">
          <h3>Live Power Usage</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={history}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="power"
                stroke="#16a34a"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
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
