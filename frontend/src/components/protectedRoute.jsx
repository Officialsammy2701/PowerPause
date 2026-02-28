import { Navigate, useLocation } from "react-router-dom";
import { auth } from "../lib/auth";

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!auth.isAuthed()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}