import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">🏠 Household Energy Optimizer</h1>
        <p className="login-subtitle">Login to your dashboard</p>

        <input type="text" placeholder="Username" className="login-input" />

        <input type="password" placeholder="Password" className="login-input" />

        <button className="login-button" onClick={() => navigate("/dashboard")}>
          Login
        </button>
      </div>
    </div>
  );
}
