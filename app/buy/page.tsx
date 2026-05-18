"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const ADDRESSES: Record<string, string> = {
  BTC: "bc1qrme2en6y0avreczqskpkzlwqsf60ae5u72wzvz",
  SOL: "E9UXFiVL2LSq81aYFCbpe3gUjWSC6EE9BVUJZpPK4VvA",
  USDT: "TUuQx2H4K7eNmQBKS5YUnZziAH7zR9atRH",
};

const PACKAGES = [
  { minutes: 8,  price: "$15.00", label: "8 Minutes" },
  { minutes: 16, price: "$28.00", label: "16 Minutes" },
  { minutes: 24, price: "$42.00", label: "24 Minutes" },
  { minutes: 32, price: "$56.00", label: "32 Minutes" },
  { minutes: 40, price: "$70.00", label: "40 Minutes" },
];

export default function BuyPage() {
  const router = useRouter();
  const [crypto, setCrypto] = useState("");
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [step, setStep] = useState<"select" | "pay" | "check">("select");
  const [paymentId, setPaymentId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [streamingToken, setStreamingToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [autoChecking, setAutoChecking] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split("=");
      if (key === "avs_access") {
        setAccessCode(decodeURIComponent(value || ""));
        break;
      }
    }
  }, []);

  useEffect(() => {
    if (step !== "check" || streamingToken || !paymentId) return;

    setAutoChecking(true);
    const interval = setInterval(async () => {
      setCheckCount(prev => prev + 1);
      try {
        const res = await fetch("/api/check-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId }),
        });
        const data = await res.json();
        if (data.status === "approved" && data.streamingToken) {
          setStreamingToken(data.streamingToken);
          setAutoChecking(false);
          clearInterval(interval);
        }
      } catch {}
    }, 15000);

    return () => {
      clearInterval(interval);
      setAutoChecking(false);
    };
  }, [step, paymentId, streamingToken]);

  const card: React.CSSProperties = {
    backgroundColor: "#111111",
    border: "1px solid #222222",
    borderRadius: "20px",
    padding: "40px",
    width: "100%",
    maxWidth: "500px",
    boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 16px",
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
    display: "block",
    marginBottom: "12px",
    boxSizing: "border-box",
  };

  const btnPrimary: React.CSSProperties = {
    width: "100%",
    padding: "14px",
    backgroundColor: "#2563eb",
    border: "none",
    borderRadius: "12px",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginBottom: "10px",
  };

  const btnSecondary: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "12px",
    color: "#9ca3af",
    fontSize: "13px",
    cursor: "pointer",
    marginBottom: "10px",
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handlePaid = async () => {
    if (!crypto || !selectedMinutes) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crypto,
          minutes: selectedMinutes,
          accessCode: accessCode || "guest",
          price: selectedPkg?.price,
        }),
      });
      const data = await res.json();
      setPaymentId(data.paymentId);
      setTransactionId(data.transactionId);
      setStep("check");
    } catch {
      alert("Failed to submit. Please try again.");
    }
    setLoading(false);
  };

  const checkApproval = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/check-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const data = await res.json();
      if (data.status === "approved" && data.streamingToken) {
        setStreamingToken(data.streamingToken);
      } else {
        alert("Not approved yet. Please wait for admin confirmation.");
      }
    } catch {
      alert("Check failed. Please try again.");
    }
    setLoading(false);
  };

  const selectedPkg = PACKAGES.find((p) => p.minutes === selectedMinutes);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={card}>

        <button
          onClick={() => router.push("/dashboard")}
          style={{ background: "none", border: "none", color: "#6b7280", fontSize: "13px", cursor: "pointer", marginBottom: "24px", padding: 0 }}
        >
          ← Back to Studio
        </button>

        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff", marginBottom: "6px" }}>
          Buy Streaming Time
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>
          Purchase stream time. Admin approves and issues your token.
        </p>

        {accessCode && (
          <div style={{ backgroundColor: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: "10px", padding: "8px 14px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: "#6b7280" }}>Purchasing as:</span>
            <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#93c5fd", fontWeight: "600" }}>
              {accessCode}
            </span>
          </div>
        )}

        {step === "select" && (
          <>
            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
              Select Package
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              {PACKAGES.map((pkg) => (
                <button
                  key={pkg.minutes}
                  onClick={() => setSelectedMinutes(pkg.minutes)}
                  style={{
                    backgroundColor: selectedMinutes === pkg.minutes ? "rgba(37,99,235,0.2)" : "#1a1a1a",
                    border: selectedMinutes === pkg.minutes ? "2px solid #2563eb" : "1px solid #2a2a2a",
                    borderRadius: "12px",
                    padding: "16px 10px",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s",
                    position: "relative",
                  }}
                >
                  {pkg.minutes === 24 && (
                    <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#2563eb", color: "#fff", fontSize: "9px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", whiteSpace: "nowrap" }}>
                      POPULAR
                    </div>
                  )}
                  <div style={{ fontSize: "17px", fontWeight: "700", color: "#ffffff", marginBottom: "4px" }}>
                    {pkg.label}
                  </div>
                  <div style={{ fontSize: "14px", color: selectedMinutes === pkg.minutes ? "#93c5fd" : "#6b7280", fontWeight: "600" }}>
                    {pkg.price}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Credits Banner */}
            <div style={{
              backgroundColor: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.25)",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>✨</span>
                <p style={{ fontSize: "13px", color: "#c4b5fd", fontWeight: "500", margin: 0 }}>
                  Want more credits customized?
                </p>
              </div>
              <a
                href="mailto:support@avs.ai"
                style={{
                  fontSize: "12px",
                  color: "#a78bfa",
                  fontWeight: "700",
                  textDecoration: "none",
                  backgroundColor: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  borderRadius: "8px",
                  padding: "5px 12px",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.3px",
                }}
              >
                Contact Support →
              </a>
            </div>

            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
              Payment Method
            </p>
            <select
              value={crypto}
              onChange={(e) => setCrypto(e.target.value)}
              style={{ ...inputStyle, appearance: "none" }}
            >
              <option value="">Choose crypto...</option>
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="SOL">Solana (SOL)</option>
              <option value="USDT">USDT (TRC20)</option>
            </select>

            {crypto && selectedMinutes && (
              <button onClick={() => setStep("pay")} style={btnPrimary}>
                Continue → Pay {selectedPkg?.price} for {selectedPkg?.label}
              </button>
            )}
          </>
        )}

        {step === "pay" && (
          <>
            <div style={{ backgroundColor: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.3)", borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
              <p style={{ fontSize: "11px", color: "#93c5fd", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>
                Order Summary
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "16px", fontWeight: "700", color: "#ffffff", marginBottom: "2px" }}>
                    {selectedPkg?.label}
                  </p>
                  <p style={{ fontSize: "12px", color: "#6b7280" }}>
                    Pay via {crypto}
                  </p>
                </div>
                <p style={{ fontSize: "22px", fontWeight: "700", color: "#4ade80" }}>
                  {selectedPkg?.price}
                </p>
              </div>
              {accessCode && (
                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(37,99,235,0.2)" }}>
                  <p style={{ fontSize: "11px", color: "#6b7280" }}>
                    Account: <span style={{ color: "#93c5fd", fontFamily: "monospace" }}>{accessCode}</span>
                  </p>
                </div>
              )}
            </div>

            <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
              <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
                Send exactly {selectedPkg?.price} of {crypto} to:
              </p>
              <div style={{ backgroundColor: "#0f0f0f", borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
                <p style={{ fontSize: "12px", fontFamily: "monospace", color: "#ffffff", wordBreak: "break-all", lineHeight: "1.7" }}>
                  {ADDRESSES[crypto]}
                </p>
              </div>
              <button onClick={() => copyText(ADDRESSES[crypto], "addr")} style={btnSecondary}>
                {copied === "addr" ? "✅ Address Copied!" : "📋 Copy Address"}
              </button>
            </div>

            <div style={{ backgroundColor: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: "10px", padding: "12px 14px", marginBottom: "16px" }}>
              <p style={{ fontSize: "12px", color: "#fbbf24", lineHeight: "1.6" }}>
                ⚠️ Send the exact amount in {crypto}. After sending, click the button below.
              </p>
            </div>

            <button
              onClick={handlePaid}
              disabled={loading}
              style={{ ...btnPrimary, backgroundColor: "#16a34a", opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Submitting..." : "✅ I Have Sent Payment"}
            </button>

            <button onClick={() => setStep("select")} style={btnSecondary}>
              ← Change Package
            </button>
          </>
        )}

        {step === "check" && !streamingToken && (
          <>
            <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#facc15", animation: "pulse 1.5s infinite" }} />
                <p style={{ color: "#facc15", fontSize: "14px", fontWeight: "600" }}>
                  Payment Submitted — Awaiting Approval
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div style={{ backgroundColor: "#0f0f0f", borderRadius: "8px", padding: "10px" }}>
                  <p style={{ fontSize: "10px", color: "#4b5563", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Package</p>
                  <p style={{ fontSize: "13px", color: "#ffffff", fontWeight: "600" }}>{selectedPkg?.label}</p>
                  <p style={{ fontSize: "12px", color: "#4ade80" }}>{selectedPkg?.price}</p>
                </div>
                <div style={{ backgroundColor: "#0f0f0f", borderRadius: "8px", padding: "10px" }}>
                  <p style={{ fontSize: "10px", color: "#4b5563", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Crypto</p>
                  <p style={{ fontSize: "13px", color: "#ffffff", fontWeight: "600" }}>{crypto}</p>
                </div>
              </div>

              <div style={{ backgroundColor: "#0f0f0f", borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
                <p style={{ fontSize: "10px", color: "#4b5563", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Transaction ID</p>
                <p style={{ fontSize: "12px", fontFamily: "monospace", color: "#9ca3af", wordBreak: "break-all" }}>{transactionId}</p>
              </div>

              <div style={{ backgroundColor: "#0f0f0f", borderRadius: "8px", padding: "12px", marginBottom: "10px" }}>
                <p style={{ fontSize: "10px", color: "#4b5563", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Payment ID</p>
                <p style={{ fontSize: "12px", fontFamily: "monospace", color: "#9ca3af" }}>{paymentId}</p>
              </div>

              {accessCode && (
                <div style={{ backgroundColor: "#0f0f0f", borderRadius: "8px", padding: "12px" }}>
                  <p style={{ fontSize: "10px", color: "#4b5563", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Account</p>
                  <p style={{ fontSize: "12px", fontFamily: "monospace", color: "#93c5fd" }}>{accessCode}</p>
                </div>
              )}
            </div>

            {autoChecking && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "10px", padding: "10px 14px", marginBottom: "12px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#9ca3af", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                <p style={{ fontSize: "12px", color: "#6b7280" }}>
                  Auto-checking for approval... (check #{checkCount})
                </p>
              </div>
            )}

            <p style={{ fontSize: "12px", color: "#6b7280", textAlign: "center", marginBottom: "16px", lineHeight: "1.7" }}>
              Admin will verify your payment and approve your token. This page auto-checks every 15 seconds, or click below to check manually.
            </p>

            <button
              onClick={checkApproval}
              disabled={loading}
              style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Checking..." : "🔍 Check Approval Status"}
            </button>

            <button onClick={() => copyText(paymentId, "pid")} style={btnSecondary}>
              {copied === "pid" ? "✅ Copied!" : "📋 Copy Payment ID"}
            </button>
          </>
        )}

        {streamingToken && (
          <>
            <div style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span style={{ fontSize: "20px" }}>🎉</span>
                <p style={{ color: "#4ade80", fontSize: "15px", fontWeight: "700" }}>
                  Payment Approved!
                </p>
              </div>

              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "14px" }}>
                Your {selectedPkg?.label} streaming token is ready. Copy it and paste it in the studio to start.
              </p>

              <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: "10px", padding: "16px", marginBottom: "12px" }}>
                <p style={{ fontSize: "10px", color: "#4b5563", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Your Streaming Token
                </p>
                <p style={{ fontSize: "14px", fontFamily: "monospace", color: "#4ade80", wordBreak: "break-all", fontWeight: "700", letterSpacing: "2px" }}>
                  {streamingToken}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                <div style={{ backgroundColor: "#0f0f0f", borderRadius: "8px", padding: "10px" }}>
                  <p style={{ fontSize: "10px", color: "#4b5563", marginBottom: "4px" }}>PACKAGE</p>
                  <p style={{ fontSize: "12px", color: "#ffffff", fontWeight: "600" }}>{selectedPkg?.label}</p>
                </div>
                <div style={{ backgroundColor: "#0f0f0f", borderRadius: "8px", padding: "10px" }}>
                  <p style={{ fontSize: "10px", color: "#4b5563", marginBottom: "4px" }}>AMOUNT PAID</p>
                  <p style={{ fontSize: "12px", color: "#4ade80", fontWeight: "600" }}>{selectedPkg?.price}</p>
                </div>
              </div>

              <button
                onClick={() => copyText(streamingToken, "token")}
                style={{ ...btnPrimary, backgroundColor: "#16a34a", marginBottom: "8px" }}
              >
                {copied === "token" ? "✅ Token Copied!" : "📋 Copy Token"}
              </button>

              <button
                onClick={() => router.push("/dashboard")}
                style={btnSecondary}
              >
                Go to Studio → Enter Token
              </button>
            </div>

            <div style={{ backgroundColor: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: "10px", padding: "12px 14px" }}>
              <p style={{ fontSize: "12px", color: "#fbbf24", lineHeight: "1.6" }}>
                💾 Save your token somewhere safe. You will need it every time you start a stream.
              </p>
            </div>
          </>
        )}

        {/* Global Custom Credits Footer */}
        <div style={{
          marginTop: "28px",
          paddingTop: "20px",
          borderTop: "1px solid #1a1a1a",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "12px", color: "#4b5563", marginBottom: "6px" }}>
            Want more credits customized?
          </p>
          <a
            href="mailto:support@avs.ai"
            style={{
              fontSize: "13px",
              color: "#818cf8",
              fontWeight: "600",
              textDecoration: "none",
              letterSpacing: "0.3px",
            }}
          >
            Contact Support — support@avs.ai
          </a>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      `}</style>
    </div>
  );
}