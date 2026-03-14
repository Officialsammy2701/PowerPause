import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import "./Analytics.css";

import { API_BASE } from "../lib/api";

const RECOMMENDATIONS = [
  "Turn off unused devices",
  "Lower AC usage during peak hours",
  "Unplug chargers when not in use",
  "Use energy-efficient lighting",
  "Run full laundry loads only",
  "Reduce standby power consumption",
];

// Derive hourly buckets from power_history
function buildHourlyBuckets(history) {
  const buckets = {};
  history.forEach((p) => {
    const hour = new Date(p.timestamp).getHours();
    if (!buckets[hour]) buckets[hour] = { total: 0, count: 0 };
    buckets[hour].total += p.power;
    buckets[hour].count += 1;
  });
  return Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2, "0")}:00`,
    avg: buckets[h] ? Math.round(buckets[h].total / buckets[h].count) : 0,
  }));
}

// Derive cost over time from power_history (rolling 5-min cost estimate)
function buildCostBreakdown(history) {
  return history.map((p, i) => ({
    index: i,
    time: new Date(p.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    cost: parseFloat(((p.power / 1000) * 0.18 * (5 / 3600)).toFixed(6)),
  }));
}

export default function Analytics() {
  const [history, setHistory] = useState([]);
  const [avgPower, setAvgPower] = useState(0);
  const [projectedBill, setProjectedBill] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recHistory, setRecHistory] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/dashboard`);
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = await res.json();

        const powerHistory = Array.isArray(data.power_history)
          ? data.power_history
          : [];

        setHistory(powerHistory);
        setAvgPower(data.avg_power ?? 0);
        setProjectedBill(Number(data.projected_monthly_bill ?? 0));

        // Build recommendation history from the fixed list
        setRecHistory(
          RECOMMENDATIONS.map((r, i) => ({
            id: i,
            text: r,
            time: new Date(Date.now() - i * 60000 * 12).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }))
        );
      } catch (err) {
        setError("Couldn't load analytics data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const hourlyData = buildHourlyBuckets(history);
  const costData = buildCostBreakdown(history);

  const peakHour = hourlyData.reduce(
    (max, h) => (h.avg > max.avg ? h : max),
    hourlyData[0] || { hour: "--", avg: 0 }
  );

  const maxAvg = Math.max(...hourlyData.map((h) => h.avg), 1);

  if (loading) return <div className="analytics-loading">Loading analytics…</div>;
  if (error) return <div className="analytics-error">{error}</div>;

  return (
    <div className="analytics">
      {/* PAGE HEADER */}
      <div className="analytics-header">
        <div>
          <h2 className="analytics-title">Analytics</h2>
          <p className="analytics-sub">Historical usage patterns and cost breakdown</p>
        </div>
        <div className="analytics-meta">
          <div className="meta-item">
            <span className="meta-label">Avg Power</span>
            <span className="meta-value">{avgPower} W</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Projected Bill</span>
            <span className="meta-value">${projectedBill.toFixed(2)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Peak Hour</span>
            <span className="meta-value">{peakHour.hour}</span>
          </div>
        </div>
      </div>

      {/* ROW 1: Usage Chart + Cost Breakdown */}
      <div className="analytics-grid-2">
        {/* Daily/Weekly Usage */}
        <div className="a-panel">
          <div className="a-panel-head">
            <h3>Usage Over Time</h3>
            <p>Power draw from recent readings</p>
          </div>
          {history.length === 0 ? (
            <p className="a-no-data">No data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={history.slice(-30).map((p) => ({
                  time: new Date(p.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }),
                  power: p.power,
                }))}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgba(16,185,129,0.35)" stopOpacity={1} />
                    <stop offset="95%" stopColor="rgba(16,185,129,0)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 8" />
                <XAxis dataKey="time" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={{ background: "rgba(8,14,24,0.95)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, color: "rgba(255,255,255,0.9)", fontSize: 12 }}
                  labelStyle={{ color: "rgba(255,255,255,0.55)" }}
                  cursor={{ stroke: "rgba(255,255,255,0.08)" }}
                />
                <Area type="monotoneX" dataKey="power" stroke="rgba(16,185,129,0.9)" strokeWidth={2} fill="url(#powerGrad)" dot={false} animationDuration={300} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="a-panel">
          <div className="a-panel-head">
            <h3>Cost Over Time</h3>
            <p>Estimated cost per reading interval</p>
          </div>
          {costData.length === 0 ? (
            <p className="a-no-data">No data available yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={costData.slice(-30)}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgba(56,189,248,0.35)" stopOpacity={1} />
                    <stop offset="95%" stopColor="rgba(56,189,248,0)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 8" />
                <XAxis dataKey="time" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} width={42} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "rgba(8,14,24,0.95)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, color: "rgba(255,255,255,0.9)", fontSize: 12 }}
                  labelStyle={{ color: "rgba(255,255,255,0.55)" }}
                  formatter={(v) => [`$${v}`, "Cost"]}
                  cursor={{ stroke: "rgba(255,255,255,0.08)" }}
                />
                <Area type="monotoneX" dataKey="cost" stroke="rgba(56,189,248,0.9)" strokeWidth={2} fill="url(#costGrad)" dot={false} animationDuration={300} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ROW 2: Heatmap + Recommendations */}
      <div className="analytics-grid-2">
        {/* Peak Hours Heatmap */}
        <div className="a-panel">
          <div className="a-panel-head">
            <h3>Peak Usage Hours</h3>
            <p>Average wattage by hour of day</p>
          </div>
          <div className="heatmap">
            {hourlyData.map((h) => {
              const intensity = maxAvg > 0 ? h.avg / maxAvg : 0;
              const isPeak = h.hour === peakHour.hour;
              return (
                <div
                  key={h.hour}
                  className={`heat-cell ${isPeak ? "peak" : ""}`}
                  style={{
                    background: `rgba(16,185,129,${0.07 + intensity * 0.65})`,
                    borderColor: isPeak
                      ? "rgba(16,185,129,0.7)"
                      : `rgba(16,185,129,${0.1 + intensity * 0.3})`,
                  }}
                  title={`${h.hour} — ${h.avg} W`}
                >
                  <span className="heat-hour">{h.hour.split(":")[0]}</span>
                  <span className="heat-val">{h.avg > 0 ? `${h.avg}W` : "—"}</span>
                </div>
              );
            })}
          </div>
          <div className="heatmap-legend">
            <span>Low</span>
            <div className="legend-bar" />
            <span>High</span>
          </div>
        </div>

        {/* Recommendations History */}
        <div className="a-panel">
          <div className="a-panel-head">
            <h3>Recommendations Log</h3>
            <p>Recent PowerPause insights</p>
          </div>
          <div className="rec-list">
            {recHistory.map((r, i) => (
              <div key={r.id} className="rec-item" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="rec-dot" />
                <div className="rec-body">
                  <span className="rec-text">{r.text}</span>
                  <span className="rec-time">{r.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
