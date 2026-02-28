import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth } from "../lib/auth";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = useMemo(() => location.state?.from || "/dashboard", [location.state]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // If already authed, redirect to dashboard
  useEffect(() => {
    if (auth.isAuthed()) navigate("/dashboard", { replace: true });
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);

    // Demo Login: (Frontend only, no backend)
    // Later, this will be replaced with an actual API call to the backend for authentication endpoint.
    await new Promise((r) => setTimeout(r, 550)); // Simulate network delay
    auth.login();
    if (!remember) {
      // Session only, so clear auth on page unload
      // Since we don't have a backend or real tokens, we'll just clear auth on page unload if "Remember Me" is not checked. Can be improved later with real token handling.
      window.addEventListener("beforeunload", auth.logout, { once: true });
    }

    navigate(redirectTo, { replace: true });
    setIsSubmitting(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <div className="logo">⚡</div>
          <div>
            <h1 className="login-title">PowerPause</h1>
            <p className="login-subtitle">
              Track usage, forecast costs, and hit your monthly target.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
            />
          </label>

          <div className="login-row">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              className="link-btn"
              onClick={() => alert("Hook this up later (Reset Password).")}
            >
              Forgot password?
            </button>
          </div>

          <button className="login-button" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <p className="login-footnote">
            Demo mode: any email/password will work for now.
          </p>
        </form>
      </div>
    </div>
  );
}
