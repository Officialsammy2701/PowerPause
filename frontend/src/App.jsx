import React, { useState, useEffect } from "react";
import { useLocation, BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import ProtectedRoute from "./components/protectedRoute";
import "./App.css";

function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="topbar-right">
      <span className="topbar-time">{time}</span>
      <span className="topbar-date">{date}</span>
    </div>
  );
}

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const pageTitle = location.pathname === "/analytics" ? "Analytics" : "Dashboard";
  const pageSubtitle = location.pathname === "/analytics"
    ? "Historical usage patterns and cost breakdown."
    : "Monitor usage and stay on target.";

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}
      <div className="app-main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
          <div className="topbar-title">
            <h2>{pageTitle}</h2>
            <p>{pageSubtitle}</p>
          </div>
          <LiveClock />
        </header>
        <main className="main-content">
          {location.pathname === "/analytics" ? <Analytics /> : <Dashboard />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}