"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ADDRESSES: Record<string, string> = {
  BTC: "bc1qrme2en6y0avreczqskpkzlwqsf60ae5u72wzvz",
  SOL: "E9UXFiVL2LSq81aYFCbpe3gUjWSC6EE9BVUJZpPK4VvA",
  LTC: "ltc1q99ky6ypune073f700ztjsf627cf5mcengyptlt",
  USDC: "E9UXFiVL2LSq81aYFCbpe3gUjWSC6EE9BVUJZpPK4VvA",
  USDT: "TUuQx2H4K7eNmQBKS5YUnZziAH7zR9atRH",
};

export default function BuyPage() {
  const router = useRouter();
  const [crypto, setCrypto] = useState("");
  const [step, setStep] = useState<
    "select" | "pay" | "check"
  >("select");
  const [paymentId, setPaymentId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const card: React.CSSProperties = {
    backgroundColor: "#111111",
    border: "1px solid #222222",
    borderRadius: "20px",
    padding: "40px",
    width: "100%",
    maxWidth: "440px",
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
    appearance: "none",
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

  const handlePaid = async () => {
    setLoading(true);
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crypto }),
    });
    const data = await res.json();
    setPaymentId(data.paymentId);
    setStep("check");
    setLoading(false);
  };

  const checkApproval = async () => {
    setLoading(true);
    const res = await fetch("/api/check-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });
    const data = await res.json();
    if (data.status === "approved") {
      setApiKey(data.apiKey);
    } else {
      alert(
        "Not approved yet. Please wait for admin confirmation."
      );
    }
    setLoading(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(
      ADDRESSES[crypto]
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      <div style={card}>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            background: "none",
            border: "none",
            color: "#6b7280",
            fontSize: "13px",
            cursor: "pointer",
            marginBottom: "24px",
            padding: 0,
          }}
        >
          ← Back to Studio
        </button>

        <h1
          style={{
            fontSize: "24px",
            fontWeight: "700",
            color: "#ffffff",
            marginBottom: "6px",
          }}
        >
          Buy API Credits
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#6b7280",
            marginBottom: "28px",
          }}
        >
          1000 Units = $7.50 USD
        </p>

        {step === "select" && (
          <>
            <label
              style={{
                fontSize: "12px",
                color: "#6b7280",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Select Cryptocurrency
            </label>
            <select
              value={crypto}
              onChange={(e) =>
                setCrypto(e.target.value)
              }
              style={inputStyle}
            >
              <option value="">
                Choose crypto...
              </option>
              <option value="BTC">
                Bitcoin (BTC)
              </option>
              <option value="SOL">
                Solana (SOL)
              </option>
              <option value="LTC">
                Litecoin (LTC)
              </option>
              <option value="USDC">
                USDC (Solana)
              </option>
              <option value="USDT">
                USDT (TRC20)
              </option>
            </select>

            {crypto && (
              <button
                onClick={() => setStep("pay")}
                style={btnPrimary}
              >
                Continue →
              </button>
            )}
          </>
        )}

        {step === "pay" && (
          <>
            <div
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "12px",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  marginBottom: "8px",
                }}
              >
                Send $7.50 of {crypto} to:
              </p>
              <p
                style={{
                  fontSize: "12px",
                  fontFamily: "monospace",
                  color: "#ffffff",
                  wordBreak: "break-all",
                  lineHeight: "1.6",
                }}
              >
                {ADDRESSES[crypto]}
              </p>
            </div>

            <button
              onClick={copyAddress}
              style={btnSecondary}
            >
              {copied ? "✅ Copied!" : "Copy Address"}
            </button>

            <button
              onClick={handlePaid}
              disabled={loading}
              style={{
                ...btnPrimary,
                backgroundColor: "#16a34a",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? "Processing..."
                : "✅ I Have Paid"}
            </button>
          </>
        )}

        {step === "check" && !apiKey && (
          <>
            <div
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: "12px",
                padding: "20px",
                textAlign: "center",
                marginBottom: "16px",
              }}
            >
              <p
                style={{
                  color: "#facc15",
                  fontSize: "14px",
                  marginBottom: "6px",
                }}
              >
                Payment submitted ✅
              </p>
              <p
                style={{
                  color: "#4b5563",
                  fontSize: "11px",
                }}
              >
                ID: {paymentId}
              </p>
            </div>

            <button
              onClick={checkApproval}
              disabled={loading}
              style={{
                ...btnPrimary,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? "Checking..."
                : "Check Approval"}
            </button>
          </>
        )}

        {apiKey && (
          <div
            style={{
              backgroundColor:
                "rgba(74,222,128,0.1)",
              border:
                "1px solid rgba(74,222,128,0.3)",
              borderRadius: "12px",
              padding: "20px",
              marginTop: "16px",
            }}
          >
            <p
              style={{
                color: "#4ade80",
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "10px",
              }}
            >
              ✅ Your API Key
            </p>
            <p
              style={{
                fontSize: "12px",
                fontFamily: "monospace",
                color: "#ffffff",
                wordBreak: "break-all",
                lineHeight: "1.6",
                marginBottom: "14px",
              }}
            >
              {apiKey}
            </p>
            <button
              onClick={() =>
                navigator.clipboard.writeText(apiKey)
              }
              style={{
                ...btnPrimary,
                backgroundColor: "#16a34a",
                marginBottom: 0,
              }}
            >
              Copy API Key
            </button>
          </div>
        )}
      </div>
    </div>
  );
}