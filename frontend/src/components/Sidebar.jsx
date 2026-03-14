import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartBar,
  faChartLine,
  faRightFromBracket,
  faBolt,
} from "@fortawesome/free-solid-svg-icons";
import { auth } from "../lib/auth";
import "./Sidebar.css";

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const onLogout = () => {
    auth.logout();
    navigate("/", { replace: true });
  };

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div>
        <div className="sidebar-header">
          <FontAwesomeIcon icon={faBolt} style={{ color: "#10b981" }} />
          <span>PowerPause</span>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${location.pathname === "/dashboard" ? "active" : ""}`}
            onClick={() => navigate("/dashboard")}
          >
            <FontAwesomeIcon icon={faChartBar} /> Dashboard
          </button>
          <button
            className={`nav-item ${location.pathname === "/analytics" ? "active" : ""}`}
            onClick={() => navigate("/analytics")}
          >
            <FontAwesomeIcon icon={faChartLine} /> Analytics
          </button>
          <button className="nav-item logout" type="button" onClick={onLogout}>
            <FontAwesomeIcon icon={faRightFromBracket} />
            Logout
          </button>
        </nav>
      </div>

      <div className="sidebar-footer">Energy insights</div>
    </aside>
  );
}
