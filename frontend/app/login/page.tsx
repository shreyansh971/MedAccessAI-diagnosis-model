"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("username", email);
      form.append("password", password);
      const res = await fetch("http://localhost:8000/v1/auth/token", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      router.push("/");
    } catch (e) {
      setError("Cannot connect to server. Make sure backend is running.");
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f172a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif"
    }}>
      <div style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: "16px",
        padding: "48px",
        width: "100%",
        maxWidth: "400px",
      }}>
        <div style={{ marginBottom: "32px", textAlign: "center" }}>
          <div style={{ color: "#38bdf8", fontSize: "28px", fontWeight: "700", marginBottom: "8px" }}>
            ⚕ MedAccess AI
          </div>
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            HIPAA-Compliant Radiographic Platform
          </p>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={{ color: "#94a3b8", fontSize: "13px", display: "block", marginBottom: "6px" }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@medaccess.com"
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "white",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ color: "#94a3b8", fontSize: "13px", display: "block", marginBottom: "6px" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "white",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>

        {error && (
          <div style={{
            background: "#450a0a",
            border: "1px solid #dc2626",
            borderRadius: "8px",
            padding: "10px 14px",
            color: "#fca5a5",
            fontSize: "13px",
            marginBottom: "16px"
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: loading ? "#1d4ed8" : "#2563eb",
            border: "none",
            borderRadius: "8px",
            color: "white",
            fontSize: "15px",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div style={{
          marginTop: "24px",
          padding: "12px",
          background: "#0f172a",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#64748b",
          textAlign: "center"
        }}>
          Demo credentials<br />
          <span style={{ color: "#38bdf8" }}>admin@medaccess.com</span> / <span style={{ color: "#38bdf8" }}>secret</span>
        </div>
      </div>
    </div>
  );
}