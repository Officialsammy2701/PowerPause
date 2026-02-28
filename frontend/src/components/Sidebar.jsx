import React from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../lib/auth";
import "./Sidebar.css";

export default function Sidebar({open, onClose}) {
  const navigate = useNavigate();

  const onLogout = () => {
    auth.logout();
    navigate("/", { replace: true });
  };


  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-header">
        ⚡ <span>PowerPause</span>
        <button className="icon-btn close-btn" onClick={onClose}>✕</button>
      </div>

      <nav className="sidebar-nav">
        <button className="nav-item active" type="button">
          📊 Dashboard
        </button>
        <button className="nav-item" type="button" onClick={onLogout}>
          🚪 Logout
        </button>
      </nav>

      <div className="sidebar-footer">
        <span className="muted">Energy insights</span>
      </div>
    </aside>
  );
}
