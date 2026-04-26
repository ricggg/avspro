"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const S = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  } as React.CSSProperties,

  card: {
    backgroundColor: "#111111",
    border: "1px solid #222222",
    borderRadius: "20px",
    padding: "48px 40px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
  } as React.CSSProperties,

  icon: {
    width: "60px",
    height: "60px",
    borderRadius: "16px",
    background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
    margin: "0 auto 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
  } as React.CSSProperties,

  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: "8px",
    letterSpacing: "-0.5px",
  } as React.CSSProperties,

  subtitle: {
    fontSize: "14px",
    color: "#6b7280",
    textAlign: "center",
    marginBottom: "36px",
  } as React.CSSProperties,

  input: {
    width: "100%",
    padding: "14px 16px",
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "15px",
    outline: "none",
    display: "block",
    marginBottom: "12px",
  } as React.CSSProperties,

  inputError: {
    width: "100%",
    padding: "14px 16px",
    backgroundColor: "#1a1a1a",
    border: "1px solid #ef4444",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "15px",
    outline: "none",
    display: "block",
    marginBottom: "12px",
  } as React.CSSProperties,

  button: {
    width: "100%",
    padding: "14px",
    backgroundColor: "#2563eb",
    border: "none",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "4px",
  } as React.CSSProperties,

  errorText: {
    color: "#ef4444",
    fontSize: "13px",
    textAlign: "center",
    marginBottom: "12px",
  } as React.CSSProperties,

  footer: {
    color: "#374151",
    fontSize: "12px",
    textAlign: "center",
    marginTop: "28px",
  } as React.CSSProperties,
};

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      if (password === "jehova643") {
        router.push("/dashboard");
      } else {
        setError(true);
        setLoading(false);
        setTimeout(() => setError(false), 2000);
      }
    }, 400);
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.icon}>🎭</div>
        <h1 style={S.title}>Avatar Studio Pro</h1>
        <p style={S.subtitle}>
          Enter your access password to continue
        </p>

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && handleLogin()
          }
          style={error ? S.inputError : S.input}
        />

        {error && (
          <p style={S.errorText}>
            Incorrect password. Try again.
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            ...S.button,
            backgroundColor: loading
              ? "#1d4ed8"
              : "#2563eb",
            cursor: loading
              ? "not-allowed"
              : "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? "Accessing..." : "Access Studio"}
        </button>

        <p style={S.footer}>
          Avatar Studio Pro © 2026
        </p>
      </div>
    </div>
  );
}