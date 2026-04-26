"use client";

import { useEffect, useState } from "react";

function btn(
  bg: string,
  extra?: React.CSSProperties
): React.CSSProperties {
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
  const [newKeys, setNewKeys] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

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
      const pr = await fetch("/api/get-payments");
      const pd = await pr.json();
      setPayments(pd.payments || []);

      const kr = await fetch("/api/get-keys");
      const kd = await kr.json();
      setAvailable(kd.available || []);
      setUsed(kd.used || []);
    } catch {}
  };

  const approve = async (id: string) => {
    setLoading(true);
    const res = await fetch("/api/approve-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: id }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else {
      setMsg("✅ Payment approved. Key issued.");
      setTimeout(() => setMsg(""), 3000);
      loadData();
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
    setMsg("✅ Keys added successfully.");
    setTimeout(() => setMsg(""), 3000);
    loadData();
    setLoading(false);
  };

  useEffect(() => {
    if (loggedIn) loadData();
  }, [loggedIn]);

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
  };

  if (!loggedIn) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            ...cardStyle,
            width: "100%",
            maxWidth: "400px",
          }}
        >
          <h1
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "#ffffff",
              marginBottom: "24px",
            }}
          >
            Admin Login
          </h1>

          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            onKeyDown={(e) =>
              e.key === "Enter" && login()
            }
            style={{
              ...inputStyle,
              marginBottom: "12px",
            }}
          />

          <button
            onClick={login}
            style={{
              ...btn("#2563eb"),
              width: "100%",
              padding: "13px",
              fontSize: "15px",
            }}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        color: "#ffffff",
        padding: "24px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              fontSize: "22px",
              fontWeight: "700",
            }}
          >
            Admin Dashboard
          </h1>
          <button
            onClick={loadData}
            style={btn("#1f1f1f")}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Message */}
        {msg && (
          <div
            style={{
              backgroundColor:
                "rgba(74,222,128,0.1)",
              border:
                "1px solid rgba(74,222,128,0.3)",
              borderRadius: "10px",
              padding: "12px 16px",
              color: "#4ade80",
              fontSize: "14px",
            }}
          >
            {msg}
          </div>
        )}

        {/* Add Keys */}
        <div style={cardStyle}>
          <h2
            style={{
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            Add API Keys
          </h2>
          <p
            style={{
              fontSize: "12px",
              color: "#6b7280",
              marginBottom: "12px",
            }}
          >
            Paste multiple keys separated by commas
          </p>
          <textarea
            value={newKeys}
            onChange={(e) =>
              setNewKeys(e.target.value)
            }
            placeholder="dct_key1, dct_key2, dct_key3"
            rows={4}
            style={{
              ...inputStyle,
              resize: "vertical",
              marginBottom: "12px",
            }}
          />
          <button
            onClick={addKeys}
            disabled={loading}
            style={{
              ...btn("#16a34a"),
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Adding..." : "Add Keys"}
          </button>
        </div>

        {/* Key Inventory */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Available */}
          <div style={cardStyle}>
            <h2
              style={{
                fontSize: "15px",
                fontWeight: "600",
                marginBottom: "16px",
                color: "#4ade80",
              }}
            >
              Available Keys ({available.length})
            </h2>
            <div
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {available.length === 0 ? (
                <p
                  style={{
                    color: "#4b5563",
                    fontSize: "13px",
                  }}
                >
                  No keys available
                </p>
              ) : (
                available.map((k, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "11px",
                      fontFamily: "monospace",
                      color: "#d1d5db",
                      wordBreak: "break-all",
                    }}
                  >
                    {k}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Used */}
          <div style={cardStyle}>
            <h2
              style={{
                fontSize: "15px",
                fontWeight: "600",
                marginBottom: "16px",
                color: "#9ca3af",
              }}
            >
              Used Keys ({used.length})
            </h2>
            <div
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {used.length === 0 ? (
                <p
                  style={{
                    color: "#4b5563",
                    fontSize: "13px",
                  }}
                >
                  No used keys
                </p>
              ) : (
                used.map((k, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "11px",
                      fontFamily: "monospace",
                      color: "#6b7280",
                      wordBreak: "break-all",
                    }}
                  >
                    {k}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Payments */}
        <div style={cardStyle}>
          <h2
            style={{
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "20px",
            }}
          >
            Payments ({payments.length})
          </h2>

          {payments.length === 0 ? (
            <p
              style={{
                color: "#4b5563",
                fontSize: "13px",
              }}
            >
              No payments yet
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {payments.map((p) => (
                <div
                  key={p.id}
                  style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "12px",
                    padding: "16px",
                    display: "flex",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#6b7280",
                        marginBottom: "4px",
                      }}
                    >
                      ID: {p.id}
                    </p>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        marginBottom: "6px",
                      }}
                    >
                      {p.crypto}
                    </p>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "3px 10px",
                        borderRadius: "999px",
                        backgroundColor:
                          p.status === "approved"
                            ? "rgba(74,222,128,0.15)"
                            : "rgba(250,204,21,0.15)",
                        color:
                          p.status === "approved"
                            ? "#4ade80"
                            : "#facc15",
                        border:
                          p.status === "approved"
                            ? "1px solid rgba(74,222,128,0.3)"
                            : "1px solid rgba(250,204,21,0.3)",
                      }}
                    >
                      {p.status}
                    </span>

                    {p.status === "approved" &&
                      p.apiKey && (
                        <p
                          style={{
                            fontSize: "11px",
                            fontFamily: "monospace",
                            color: "#4ade80",
                            marginTop: "8px",
                            wordBreak: "break-all",
                          }}
                        >
                          {p.apiKey}
                        </p>
                      )}
                  </div>

                  {p.status === "pending" && (
                    <button
                      onClick={() => approve(p.id)}
                      disabled={loading}
                      style={{
                        ...btn("#2563eb"),
                        opacity: loading ? 0.6 : 1,
                        flexShrink: 0,
                      }}
                    >
                      Approve
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}