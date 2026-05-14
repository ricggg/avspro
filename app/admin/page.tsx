"use client";

import { useEffect, useState } from "react";

function btn(bg: string, extra?: React.CSSProperties): React.CSSProperties {
  return {
    backgroundColor: bg,
    border: "none",
    borderRadius: "10px",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "500",
    padding: "10px 20px",
    cursor: "pointer",
    ...extra,
  };
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [available, setAvailable] = useState<string[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [accessCodes, setAccessCodes] = useState<any[]>([]);
  const [newKeys, setNewKeys] = useState("");
  const [codeNote, setCodeNote] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [manualLabel, setManualLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "payments" | "keys" | "tokens" | "users"
  >("payments");

  const showMsg = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 4000);
  };

  const login = async () => {
    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) setLoggedIn(true);
    else alert("Invalid password");
  };

  const loadData = async () => {
    try {
      const [pr, kr, tr, ar] = await Promise.all([
        fetch("/api/get-payments"),
        fetch("/api/get-keys"),
        fetch("/api/get-tokens"),
        fetch("/api/get-access-codes"),
      ]);

      const pd = pr.ok ? await pr.json() : { payments: [] };
      const kd = kr.ok ? await kr.json() : { available: [], used: [] };
      const td = tr.ok ? await tr.json() : { tokens: [] };
      const ad = ar.ok ? await ar.json() : { codes: [] };

      setPayments(pd.payments || []);
      setAvailable(kd.available || []);
      setUsed(kd.used || []);
      setTokens(td.tokens || []);
      setAccessCodes(ad.codes || []);
    } catch (e) {
      console.error("loadData error:", e);
    }
  };

  const approve = async (id: string, minutes: number) => {
    setLoading(true);
    const res = await fetch("/api/approve-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: id, minutes }),
    });
    const data = await res.json();
    if (data.error) showMsg(`❌ ${data.error}`);
    else {
      showMsg(`✅ Approved! Token generated for ${minutes} minutes.`);
      loadData();
    }
    setLoading(false);
  };

  // Auto-generate code
  const generateCode = async () => {
    setLoading(true);
    setGeneratedCode("");
    try {
      const res = await fetch("/api/generate-access-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: codeNote }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedCode(data.accessCode || data.code);
        setCodeNote("");
        showMsg(`✅ Access code generated: ${data.accessCode || data.code}`);
        loadData();
      } else {
        showMsg(`❌ ${data.error || "Failed to generate code"}`);
      }
    } catch {
      showMsg("❌ Failed to generate code");
    }
    setLoading(false);
  };

  // Manual custom code
  const createManualCode = async () => {
    if (!manualCode.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/create-access-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: manualCode.trim(), label: manualLabel.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`✅ Code created: ${manualCode.trim()}`);
        setManualCode("");
        setManualLabel("");
        loadData();
      } else {
        showMsg(`❌ ${data.error}`);
      }
    } catch {
      showMsg("❌ Failed to create code");
    }
    setLoading(false);
  };

  const addKeys = async () => {
    if (!newKeys.trim()) return;
    setLoading(true);
    await fetch("/api/add-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: newKeys }),
    });
    setNewKeys("");
    showMsg("✅ Keys added successfully.");
    loadData();
    setLoading(false);
  };

  const deleteKey = async (key: string, list: "available" | "used") => {
    if (!window.confirm(`Delete this key from ${list} list?\n\n${key}`)) return;
    setDeletingKey(`${list}:${key}`);
    try {
      const res = await fetch("/api/delete-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, list }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`✅ Key deleted from ${list} list.`);
        loadData();
      } else showMsg(`❌ ${data.error || "Failed to delete key"}`);
    } catch {
      showMsg("❌ Failed to delete key");
    }
    setDeletingKey(null);
  };

  const revokeToken = async (tokenId: string) => {
    if (!window.confirm("Revoke this streaming token?")) return;
    setActionLoading(`revoketoken:${tokenId}`);
    const res = await fetch("/api/revoke-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId }),
    });
    const data = await res.json();
    if (data.success) { showMsg("✅ Token revoked."); loadData(); }
    else showMsg(`❌ ${data.error}`);
    setActionLoading(null);
  };

  const forceLogout = async (accessCode: string) => {
    if (!confirm(`Force logout ${accessCode}?\n\nThey will be signed out within 5 seconds.`)) return;
    setActionLoading(`logout:${accessCode}`);
    try {
      const res = await fetch("/api/force-logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg(`✅ ${accessCode} will be logged out within 5 seconds.`);
        setAccessCodes((prev) =>
          prev.map((c) =>
            (c.code === accessCode || c.accessCode === accessCode)
              ? { ...c, forceLogout: "true" }
              : c
          )
        );
      } else showMsg(`❌ ${data.error || "Failed to force logout"}`);
    } catch { showMsg("❌ Failed to force logout"); }
    setActionLoading(null);
  };

  const resetDevice = async (accessCode: string) => {
    if (!confirm(`Reset device lock for ${accessCode}?`)) return;
    setActionLoading(`reset:${accessCode}`);
    const res = await fetch("/api/reset-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode }),
    });
    const data = await res.json();
    if (data.success) { showMsg("✅ Device reset."); loadData(); }
    setActionLoading(null);
  };

  const toggleAccess = async (accessCode: string, isActive: boolean) => {
    if (!confirm(`${isActive ? "Revoke" : "Restore"} access for ${accessCode}?`)) return;
    setActionLoading(`toggle:${accessCode}`);
    const res = await fetch("/api/revoke-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessCode, restore: !isActive }),
    });
    const data = await res.json();
    if (data.success) {
      showMsg(`✅ Access ${isActive ? "revoked" : "restored"}`);
      loadData();
    }
    setActionLoading(null);
  };

  useEffect(() => { if (loggedIn) loadData(); }, [loggedIn]);

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#111111",
    border: "1px solid #222222",
    borderRadius: "16px",
    padding: "24px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
    display: "block",
    boxSizing: "border-box",
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: active ? "#2563eb" : "#1a1a1a",
    color: active ? "#ffffff" : "#6b7280",
    fontSize: "13px",
    fontWeight: active ? "600" : "400",
    cursor: "pointer",
  });

  const metaRow = (label: string, value: string, highlight?: boolean) => (
    <div key={label}>
      <p style={{ fontSize: "10px", color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>
        {label}
      </p>
      <p style={{ fontSize: "12px", color: highlight ? "#facc15" : "#9ca3af", wordBreak: "break-all", lineHeight: "1.5" }}>
        {value || "—"}
      </p>
    </div>
  );

  // ── Login ─────────────────────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ ...cardStyle, width: "100%", maxWidth: "400px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#ffffff", marginBottom: "24px" }}>Admin Login</h1>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            style={{ ...inputStyle, marginBottom: "12px" }}
          />
          <button onClick={login} style={{ ...btn("#2563eb"), width: "100%", padding: "13px", fontSize: "15px" }}>
            Login
          </button>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", color: "#ffffff", padding: "24px 20px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700" }}>Admin Dashboard</h1>
          <button onClick={loadData} style={btn("#1f1f1f")}>↻ Refresh</button>
        </div>

        {/* Message */}
        {msg && (
          <div style={{
            backgroundColor: msg.startsWith("❌") ? "rgba(239,68,68,0.1)" : "rgba(74,222,128,0.1)",
            border: msg.startsWith("❌") ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(74,222,128,0.3)",
            borderRadius: "10px", padding: "12px 16px",
            color: msg.startsWith("❌") ? "#f87171" : "#4ade80", fontSize: "14px",
          }}>
            {msg}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          {[
            { label: "Pending Payments", value: payments.filter((p) => p.status === "pending").length, color: "#facc15" },
            { label: "Available Keys", value: available.length, color: "#4ade80" },
            { label: "Active Tokens", value: tokens.filter((t) => t.status === "active").length, color: "#60a5fa" },
            { label: "Total Users", value: accessCodes.length, color: "#c084fc" },
          ].map((s) => (
            <div key={s.label} style={{ ...cardStyle, textAlign: "center", padding: "16px" }}>
              <p style={{ fontSize: "28px", fontWeight: "700", color: s.color }}>{s.value}</p>
              <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(["payments", "keys", "tokens", "users"] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)} style={tabStyle(activeTab === t)}>
              {t === "payments" && `💳 Payments (${payments.length})`}
              {t === "keys" && `🔑 API Keys`}
              {t === "tokens" && `🎟 Tokens (${tokens.length})`}
              {t === "users" && `👤 Users (${accessCodes.length})`}
            </button>
          ))}
        </div>

        {/* ── PAYMENTS TAB ── */}
        {activeTab === "payments" && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>
              Payments ({payments.length})
            </h2>
            {payments.length === 0 ? (
              <p style={{ color: "#4b5563", fontSize: "13px" }}>No payments yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[...payments].reverse().map((p, i) => (
                  <div
                    key={p.id || `payment-${i}`}
                    style={{
                      backgroundColor: "#1a1a1a",
                      border: `1px solid ${p.status === "approved" ? "#1a3a1a" : "#2a2a2a"}`,
                      borderRadius: "12px", padding: "16px",
                      display: "flex", justifyContent: "space-between",
                      alignItems: "flex-start", flexWrap: "wrap", gap: "12px",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                        <span style={{
                          fontSize: "11px", padding: "3px 10px", borderRadius: "999px", fontWeight: "600",
                          backgroundColor: p.status === "approved" ? "rgba(74,222,128,0.15)" : "rgba(250,204,21,0.15)",
                          color: p.status === "approved" ? "#4ade80" : "#facc15",
                          border: p.status === "approved" ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(250,204,21,0.3)",
                        }}>
                          {p.status === "approved" ? "✅ Approved" : "⏳ Pending"}
                        </span>
                        {p.minutes && (
                          <span style={{
                            fontSize: "11px", padding: "3px 10px", borderRadius: "999px",
                            backgroundColor: "rgba(96,165,250,0.15)", color: "#60a5fa",
                            border: "1px solid rgba(96,165,250,0.3)",
                          }}>
                            ⏱ {p.minutes} min
                          </span>
                        )}
                        <span style={{
                          fontSize: "11px", padding: "3px 10px", borderRadius: "999px",
                          backgroundColor: "rgba(251,146,60,0.15)", color: "#fb923c",
                          border: "1px solid rgba(251,146,60,0.3)",
                        }}>
                          {p.crypto}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px", marginBottom: "8px" }}>
                        {metaRow("Payment ID", p.id)}
                        {metaRow("Transaction ID", p.transactionId || "—")}
                        {metaRow("Amount", p.price || "—")}
                        {metaRow("Submitted", p.createdAt ? new Date(p.createdAt).toLocaleString() : "—")}
                        {p.status === "approved" && metaRow("Approved", p.approvedAt ? new Date(p.approvedAt).toLocaleString() : "—")}
                      </div>

                      {p.status === "approved" && p.streamingToken && (
                        <div style={{ marginTop: "8px" }}>
                          <p style={{ fontSize: "10px", color: "#4b5563", marginBottom: "4px", textTransform: "uppercase" }}>
                            Streaming Token
                          </p>
                          <p style={{ fontSize: "11px", fontFamily: "monospace", color: "#4ade80", wordBreak: "break-all" }}>
                            {p.streamingToken}
                          </p>
                        </div>
                      )}
                    </div>

                    {p.status === "pending" && (
                      <button
                        onClick={() => approve(p.id, Number(p.minutes))}
                        disabled={loading}
                        style={{ ...btn("#2563eb"), opacity: loading ? 0.6 : 1, flexShrink: 0 }}
                      >
                        Approve & Generate Token
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── KEYS TAB ── */}
        {activeTab === "keys" && (
          <>
            <div style={cardStyle}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>Add API Keys</h2>
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>
                Paste multiple keys separated by commas. Each key = ~8.2 minutes.
              </p>
              <textarea
                value={newKeys}
                onChange={(e) => setNewKeys(e.target.value)}
                placeholder="dct_key1, dct_key2, dct_key3"
                rows={4}
                style={{ ...inputStyle, resize: "vertical", marginBottom: "12px" }}
              />
              <button onClick={addKeys} disabled={loading} style={{ ...btn("#16a34a"), opacity: loading ? 0.6 : 1 }}>
                {loading ? "Adding..." : "Add Keys"}
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              <div style={cardStyle}>
                <h2 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "16px", color: "#4ade80" }}>
                  Available Keys ({available.length})
                </h2>
                <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {available.length === 0 ? (
                    <p style={{ color: "#4b5563", fontSize: "13px" }}>No keys available</p>
                  ) : (
                    available.map((k, i) => (
                      <div key={`avail-${i}`} style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#d1d5db", wordBreak: "break-all", flex: 1 }}>{k}</span>
                        <button
                          onClick={() => deleteKey(k, "available")}
                          disabled={deletingKey === `available:${k}`}
                          style={{ backgroundColor: "#7f1d1d", border: "none", borderRadius: "6px", color: "#fca5a5", fontSize: "11px", padding: "4px 8px", cursor: "pointer", flexShrink: 0, opacity: deletingKey === `available:${k}` ? 0.5 : 1, whiteSpace: "nowrap" }}
                        >
                          {deletingKey === `available:${k}` ? "..." : "🗑 Delete"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={cardStyle}>
                <h2 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "16px", color: "#9ca3af" }}>
                  Used Keys ({used.length})
                </h2>
                <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                  {used.length === 0 ? (
                    <p style={{ color: "#4b5563", fontSize: "13px" }}>No used keys</p>
                  ) : (
                    used.map((k, i) => (
                      <div key={`used-${i}`} style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#6b7280", wordBreak: "break-all", flex: 1 }}>{k}</span>
                        <button
                          onClick={() => deleteKey(k, "used")}
                          disabled={deletingKey === `used:${k}`}
                          style={{ backgroundColor: "#7f1d1d", border: "none", borderRadius: "6px", color: "#fca5a5", fontSize: "11px", padding: "4px 8px", cursor: "pointer", flexShrink: 0, opacity: deletingKey === `used:${k}` ? 0.5 : 1, whiteSpace: "nowrap" }}
                        >
                          {deletingKey === `used:${k}` ? "..." : "🗑 Delete"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── TOKENS TAB ── */}
        {activeTab === "tokens" && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>
              Streaming Tokens ({tokens.length})
            </h2>
            {tokens.length === 0 ? (
              <p style={{ color: "#4b5563", fontSize: "13px" }}>No tokens generated yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {[...tokens].reverse().map((t, i) => {
                  const usedSec = Number(t.usedSeconds) || 0;
                  const total = Number(t.totalSeconds) || 0;
                  const remaining = Math.max(0, total - usedSec);
                  const pct = total > 0 ? (usedSec / total) * 100 : 0;
                  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
                  return (
                    <div key={t.tokenId || `token-${i}`} style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                        <div style={{ flex: 1, minWidth: "200px" }}>
                          <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
                            <span style={{
                              fontSize: "11px", padding: "2px 8px", borderRadius: "999px",
                              backgroundColor: t.status === "active" ? "rgba(74,222,128,0.15)" : t.status === "exhausted" ? "rgba(239,68,68,0.15)" : "rgba(156,163,175,0.15)",
                              color: t.status === "active" ? "#4ade80" : t.status === "exhausted" ? "#f87171" : "#9ca3af",
                              border: t.status === "active" ? "1px solid rgba(74,222,128,0.3)" : t.status === "exhausted" ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(156,163,175,0.3)",
                            }}>{t.status}</span>
                            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", backgroundColor: "rgba(96,165,250,0.15)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)" }}>
                              {Math.round(total / 60)} min total
                            </span>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px", marginBottom: "10px" }}>
                            {metaRow("Token ID", t.tokenId)}
                            {metaRow("Payment ID", t.paymentId)}
                            {metaRow("Created", t.issuedAt ? new Date(Number(t.issuedAt)).toLocaleString() : "—")}
                          </div>

                          {/* Time bar */}
                          <div style={{ marginBottom: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "10px", color: "#6b7280" }}>Used: {fmt(usedSec)}</span>
                              <span style={{ fontSize: "10px", color: remaining < 120 ? "#f87171" : "#4ade80" }}>Left: {fmt(remaining)}</span>
                            </div>
                            <div style={{ height: "4px", backgroundColor: "#2a2a2a", borderRadius: "2px" }}>
                              <div style={{ height: "100%", width: `${pct}%`, backgroundColor: pct > 85 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#22c55e", borderRadius: "2px" }} />
                            </div>
                          </div>

                          <p style={{ fontSize: "10px", color: "#4b5563", marginBottom: "4px" }}>TOKEN STRING</p>
                          <p style={{ fontSize: "10px", fontFamily: "monospace", color: "#6b7280", wordBreak: "break-all", lineHeight: "1.5" }}>
                            {t.token}
                          </p>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0 }}>
                          <button
                            onClick={() => { navigator.clipboard.writeText(t.token || ""); showMsg("✅ Token copied!"); }}
                            style={{ backgroundColor: "#374151", border: "none", borderRadius: "8px", color: "#d1d5db", fontSize: "11px", padding: "6px 12px", cursor: "pointer" }}
                          >
                            📋 Copy Token
                          </button>
                          {t.status === "active" && (
                            <button
                              onClick={() => revokeToken(t.tokenId)}
                              disabled={actionLoading === `revoketoken:${t.tokenId}`}
                              style={{ ...btn("#7f1d1d"), color: "#fca5a5", opacity: actionLoading === `revoketoken:${t.tokenId}` ? 0.6 : 1 }}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === "users" && (
          <>
            {/* Generate Code */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "6px", color: "#a78bfa" }}>
                🎟️ Generate New Access Code
              </h2>
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px" }}>
                Auto-generate a unique AVS-XXXX-XXXX code
              </p>
              <input
                type="text"
                placeholder="Optional note (e.g. John Doe, Tester)"
                value={codeNote}
                onChange={(e) => setCodeNote(e.target.value)}
                style={{ ...inputStyle, marginBottom: "12px" }}
              />
              <button
                onClick={generateCode}
                disabled={loading}
                style={{ ...btn("#7c3aed"), opacity: loading ? 0.6 : 1, marginBottom: generatedCode ? "16px" : "0" }}
              >
                {loading ? "Generating..." : "✨ Generate Code"}
              </button>

              {generatedCode && (
                <div style={{ backgroundColor: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "12px", padding: "16px", textAlign: "center", marginTop: "16px" }}>
                  <p style={{ fontSize: "11px", color: "#a78bfa", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                    New Access Code
                  </p>
                  <p style={{ fontSize: "22px", fontFamily: "monospace", color: "#ffffff", fontWeight: "700", letterSpacing: "3px", marginBottom: "12px" }}>
                    {generatedCode}
                  </p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(generatedCode); showMsg("✅ Code copied!"); }}
                    style={{ ...btn("#7c3aed"), fontSize: "12px", padding: "8px 16px" }}
                  >
                    📋 Copy Code
                  </button>
                </div>
              )}
            </div>

            {/* Manual Code */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "6px" }}>
                ✏️ Create Custom Code
              </h2>
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px" }}>
                Set your own custom access code
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
                <input
                  type="text"
                  placeholder="Custom code (e.g. FRIEND-2024)"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  style={{ ...inputStyle, flex: 1, minWidth: "160px", marginBottom: 0 }}
                />
                <input
                  type="text"
                  placeholder="Label (e.g. John)"
                  value={manualLabel}
                  onChange={(e) => setManualLabel(e.target.value)}
                  style={{ ...inputStyle, flex: 1, minWidth: "160px", marginBottom: 0 }}
                />
              </div>
              <button onClick={createManualCode} disabled={loading} style={{ ...btn("#0f766e"), opacity: loading ? 0.6 : 1 }}>
                {loading ? "Creating..." : "Create Custom Code"}
              </button>
            </div>

            {/* Users List */}
            <div style={cardStyle}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px", color: "#a78bfa" }}>
                🔐 Users & Access Codes ({accessCodes.length})
              </h2>

              {accessCodes.length === 0 ? (
                <p style={{ color: "#4b5563", fontSize: "13px" }}>No access codes yet</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[...accessCodes].reverse().map((c: any, index: number) => {
                    const codeVal = String(c.code || c.accessCode || `code-${index}`);
                    const labelVal = String(c.label || c.note || "");
                    const isActive = c.active === "true" || c.status === "active";
                    const isExpanded = expandedCode === codeVal;
                    const purchaseCount = c.purchases?.length || 0;
                    const activatedKeyCount = c.activatedKeys?.length || 0;

                    return (
                      <div
                        key={`${codeVal}-${index}`}
                        style={{
                          backgroundColor: "#1a1a1a",
                          border: `1px solid ${isActive ? "#2a2a2a" : "#7f1d1d"}`,
                          borderRadius: "12px",
                          padding: "16px",
                        }}
                      >
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                          <div style={{ flex: 1 }}>
                            {/* Code */}
                            <p style={{ fontSize: "18px", fontFamily: "monospace", color: isActive ? "#a78bfa" : "#6b7280", fontWeight: "700", letterSpacing: "2px", marginBottom: "6px", wordBreak: "break-all" }}>
                              {codeVal}
                            </p>

                            {/* Badges */}
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              <span style={{
                                fontSize: "11px", padding: "2px 8px", borderRadius: "999px",
                                backgroundColor: isActive ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)",
                                color: isActive ? "#4ade80" : "#f87171",
                                border: isActive ? "1px solid rgba(74,222,128,0.3)" : "1px solid rgba(239,68,68,0.3)",
                              }}>
                                {isActive ? "Active" : "Revoked"}
                              </span>
                              {labelVal && (
                                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", backgroundColor: "rgba(107,114,128,0.15)", color: "#9ca3af", border: "1px solid rgba(107,114,128,0.3)" }}>
                                  👤 {labelVal}
                                </span>
                              )}
                              <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", backgroundColor: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.3)" }}>
                                💰 {purchaseCount} purchase{purchaseCount !== 1 ? "s" : ""}
                              </span>
                              <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", backgroundColor: "rgba(251,146,60,0.15)", color: "#fb923c", border: "1px solid rgba(251,146,60,0.3)" }}>
                                ⚡ {activatedKeyCount} key{activatedKeyCount !== 1 ? "s" : ""}
                              </span>
                              {c.forceLogout === "true" && (
                                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", backgroundColor: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                                  🚪 Logout Pending
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flexShrink: 0 }}>
                            <button
                              onClick={() => { navigator.clipboard.writeText(codeVal); showMsg(`✅ Copied ${codeVal}`); }}
                              style={{ backgroundColor: "#374151", border: "none", borderRadius: "8px", color: "#d1d5db", fontSize: "11px", padding: "6px 12px", cursor: "pointer" }}
                            >
                              📋 Copy
                            </button>

                            <button
                              onClick={() => resetDevice(codeVal)}
                              disabled={actionLoading === `reset:${codeVal}`}
                              style={{ backgroundColor: "#1d4ed8", border: "none", borderRadius: "8px", color: "#fff", fontSize: "11px", padding: "6px 12px", cursor: "pointer", opacity: actionLoading === `reset:${codeVal}` ? 0.5 : 1 }}
                            >
                              {actionLoading === `reset:${codeVal}` ? "..." : "🔄 Reset Device"}
                            </button>

                            <button
                              onClick={() => forceLogout(codeVal)}
                              disabled={actionLoading === `logout:${codeVal}`}
                              style={{ backgroundColor: "#92400e", border: "none", borderRadius: "8px", color: "#fde68a", fontSize: "11px", padding: "6px 12px", cursor: "pointer", opacity: actionLoading === `logout:${codeVal}` ? 0.5 : 1 }}
                            >
                              {actionLoading === `logout:${codeVal}` ? "..." : "🚪 Force Logout"}
                            </button>

                            <button
                              onClick={() => toggleAccess(codeVal, isActive)}
                              disabled={actionLoading === `toggle:${codeVal}`}
                              style={{ backgroundColor: isActive ? "#7f1d1d" : "#14532d", border: "none", borderRadius: "8px", color: isActive ? "#fca5a5" : "#86efac", fontSize: "11px", padding: "6px 12px", cursor: "pointer", opacity: actionLoading === `toggle:${codeVal}` ? 0.5 : 1 }}
                            >
                              {actionLoading === `toggle:${codeVal}` ? "..." : isActive ? "🚫 Revoke" : "✅ Restore"}
                            </button>

                            <button
                              onClick={() => setExpandedCode(isExpanded ? null : codeVal)}
                              style={{ backgroundColor: "#065f46", border: "none", borderRadius: "8px", color: "#86efac", fontSize: "11px", padding: "6px 12px", cursor: "pointer" }}
                            >
                              {isExpanded ? "▲ Hide" : "▼ Details"}
                            </button>
                          </div>
                        </div>

                        {/* Info grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", paddingTop: "12px", borderTop: "1px solid #2a2a2a", marginBottom: isExpanded ? "12px" : "0" }}>
                          {metaRow("Created", c.createdAt ? new Date(c.createdAt).toLocaleString() : c.createdAtReadable || "—")}
                          {metaRow("Device", c.deviceFingerprint ? c.deviceInfo || "Activated" : "⚠️ Not yet activated", !c.deviceFingerprint)}
                          {metaRow("Activated On", c.activatedAt || c.activatedAtReadable || "Never")}
                          {metaRow("Last Login", c.lastUsed ? new Date(c.lastUsed).toLocaleString() : c.lastUsedReadable || "Never")}
                          {metaRow("Login Count", String(c.useCount || "0"))}
                          {metaRow("Last Purchase", c.lastPurchase || c.lastPurchaseReadable || "None")}
                          {c.lastBlockedAttempt && metaRow("⚠️ Blocked Attempt", `${c.lastBlockedAttemptReadable || c.lastBlockedAttempt} — ${c.lastBlockedDevice || ""}`, true)}
                        </div>

                        {/* Expanded */}
                        {isExpanded && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {/* Activated Keys */}
                            <div style={{ paddingTop: "12px", borderTop: "1px solid #2a2a2a" }}>
                              <p style={{ fontSize: "12px", color: "#fb923c", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>
                                ⚡ Activated API Keys ({activatedKeyCount})
                              </p>
                              <p style={{ fontSize: "11px", color: "#4b5563", marginBottom: "10px" }}>
                                Keys this user has entered and used
                              </p>
                              {activatedKeyCount === 0 ? (
                                <p style={{ fontSize: "12px", color: "#4b5563" }}>No activated keys yet</p>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  {(c.activatedKeysMeta || []).map((meta: any, idx: number) => (
                                    <div key={idx} style={{ backgroundColor: "#0a0a0a", border: "1px solid #431407", borderRadius: "8px", padding: "10px 12px" }}>
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                                        <div>
                                          <span style={{ fontSize: "10px", color: "#fb923c", display: "block", marginBottom: "2px" }}>Key #{idx + 1}</span>
                                          <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#fed7aa", wordBreak: "break-all" }}>{meta.key}</span>
                                        </div>
                                        <button
                                          onClick={() => { navigator.clipboard.writeText(meta.key); showMsg("✅ Key copied!"); }}
                                          style={{ backgroundColor: "#431407", border: "none", borderRadius: "6px", color: "#fed7aa", fontSize: "10px", padding: "4px 8px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                                        >
                                          📋 Copy
                                        </button>
                                      </div>
                                      {meta.activatedAtReadable && (
                                        <p style={{ fontSize: "10px", color: "#6b7280", marginTop: "4px" }}>First used: {meta.activatedAtReadable}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Purchase History */}
                            {purchaseCount > 0 && (
                              <div style={{ paddingTop: "12px", borderTop: "1px solid #2a2a2a" }}>
                                <p style={{ fontSize: "12px", color: "#a78bfa", fontWeight: "600", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
                                  📊 Purchase History ({purchaseCount})
                                </p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  {c.purchases.map((pur: any, idx: number) => (
                                    <div key={pur?.id || idx} style={{ backgroundColor: "#0a0a0a", border: `1px solid ${pur?.status === "approved" ? "#1a3a1a" : "#2a2a2a"}`, borderRadius: "10px", padding: "12px 14px" }}>
                                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
                                        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", backgroundColor: pur?.status === "approved" ? "rgba(74,222,128,0.15)" : "rgba(250,204,21,0.15)", color: pur?.status === "approved" ? "#4ade80" : "#facc15", fontWeight: "600" }}>
                                          {pur?.status === "approved" ? "✅ Approved" : "⏳ Pending"}
                                        </span>
                                        <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", backgroundColor: "rgba(251,146,60,0.15)", color: "#fb923c" }}>
                                          {pur?.crypto}
                                        </span>
                                        {pur?.minutes && (
                                          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", backgroundColor: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
                                            {pur.minutes} min
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                                        {metaRow("Payment ID", pur?.id || "—")}
                                        {metaRow("Submitted", pur?.createdAt ? new Date(pur.createdAt).toLocaleString() : "—")}
                                        {pur?.status === "approved" && metaRow("Approved", pur?.approvedAt ? new Date(pur.approvedAt).toLocaleString() : "—")}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}