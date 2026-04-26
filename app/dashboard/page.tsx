"use client";

import { useRef, useState, useEffect } from "react";
import { createDecartClient, models } from "@decartai/sdk";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const realtimeClientRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();

  const [apiKey, setApiKey] = useState("");
  const [apiInput, setApiInput] = useState("");
  const [showApiModal, setShowApiModal] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [usageSeconds, setUsageSeconds] = useState(0);
  const [previewImage, setPreviewImage] = useState<
    string | null
  >(null);
  const [lastAvatarFile, setLastAvatarFile] =
    useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showError, setShowError] = useState(false);

  const stablePrompt = `
Exact identity replication.
Strictly match the reference image.
Photorealistic human.
Stable motion.
No ghosting.
`;

  const acquireCamera = async () => {
    setCameraError("");
    setCameraReady(false);

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((t) => {
          try { t.stop(); } catch {}
        });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    await new Promise((r) => setTimeout(r, 800));

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraReady(true);
    } catch (err: any) {
      setCameraError(
        `Camera unavailable (${err?.name}). Close Zoom, OBS, Teams then click Retry.`
      );
    }
  };

  useEffect(() => {
    acquireCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((t) => {
            try { t.stop(); } catch {}
          });
      }
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isStreaming) {
      interval = setInterval(
        () => setUsageSeconds((p) => p + 1),
        1000
      );
    }

    return () => clearInterval(interval);
  }, [isStreaming]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(
      sec
    ).padStart(2, "0")}`;
  };

  const showErr = (msg: string) => {
    setErrorMsg(msg);
    setShowError(true);
  };

  const startStreaming = async () => {
    if (!apiKey) {
      setShowApiModal(true);
      return;
    }
    if (isStreaming || isLoading) return;
    if (!streamRef.current || !cameraReady) {
      showErr("Camera not ready.");
      return;
    }

    setIsLoading(true);

    try {
      const model = models.realtime("lucy-2.1");
      const client = createDecartClient({ apiKey });

      const realtimeClient =
        await client.realtime.connect(
          streamRef.current,
          {
            model,
            onRemoteStream: (
              editedStream: MediaStream
            ) => {
              if (videoRef.current) {
                videoRef.current.srcObject =
                  editedStream;
              }
            },
          }
        );

      realtimeClientRef.current = realtimeClient;
      setIsStreaming(true);
      setUsageSeconds(0);

// ✅ Save API key for /live page
localStorage.setItem("avatarApiKey", apiKey);

      if (lastAvatarFile) {
        await realtimeClient.set({
          prompt: stablePrompt,
          image: lastAvatarFile,
        });
      }
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();

      if (msg.includes("insufficient")) {
        showErr(
          "Credits exhausted. Buy more API credits."
        );
      } else if (
        msg.includes("unauthorized") ||
        msg.includes("invalid") ||
        msg.includes("forbidden")
      ) {
        showErr(
          "Invalid API key. Check your key."
        );
      } else {
        showErr(
          `Connection failed: ${
            err?.message || "Unknown"
          }`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stopStreaming = async () => {
    try {
      await realtimeClientRef.current?.disconnect();
    } catch {}

    realtimeClientRef.current = null;

    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }

    setIsStreaming(false);
    setUsageSeconds(0);
  };

  const handleImageUpload = async (file: File) => {
    setLastAvatarFile(file);
    const reader = new FileReader();

    reader.onloadend = async () => {
      setPreviewImage(reader.result as string);
      
      if (!realtimeClientRef.current) return;
      await realtimeClientRef.current.set({
        prompt: stablePrompt,
        image: file,
      });
    };

    reader.readAsDataURL(file);
  };

  const saveApiKey = () => {
    if (!apiInput || apiInput.trim().length < 10) {
      showErr("Please enter a valid API key.");
      return;
    }
    setApiKey(apiInput.trim());
    setShowApiModal(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          backgroundColor: "#111111",
          borderBottom: "1px solid #222222",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <span
          style={{
            fontSize: "16px",
            fontWeight: "700",
            color: "#ffffff",
            letterSpacing: "-0.3px",
          }}
        >
          🎭 Avatar Studio Pro
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {isStreaming && (
            <span
              style={{
                fontSize: "12px",
                color: "#4ade80",
                backgroundColor: "rgba(74,222,128,0.1)",
                border: "1px solid rgba(74,222,128,0.3)",
                padding: "4px 12px",
                borderRadius: "999px",
                fontFamily: "monospace",
              }}
            >
              ⏱ {formatTime(usageSeconds)}
            </span>
          )}

          <button
            onClick={() => setShowApiModal(true)}
            style={btnStyle("#1f1f1f", "#333")}
          >
            API Key
          </button>

          <button
            onClick={() => router.push("/buy")}
            style={btnStyle("#1d4ed8")}
          >
            Buy API
          </button>

          <button
            onClick={() => router.push("/live")}
            style={btnStyle("#7c3aed")}
          >
            Live Mode
          </button>

          {!isStreaming ? (
            <button
              onClick={startStreaming}
              disabled={isLoading || !cameraReady}
              style={{
                ...btnStyle("#16a34a"),
                opacity:
                  isLoading || !cameraReady
                    ? 0.5
                    : 1,
                cursor:
                  isLoading || !cameraReady
                    ? "not-allowed"
                    : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {isLoading && (
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    border:
                      "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#ffffff",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              )}
              {isLoading ? "Connecting..." : "▶ Start"}
            </button>
          ) : (
            <button
              onClick={stopStreaming}
              style={btnStyle("#dc2626")}
            >
              ■ Stop
            </button>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "24px 20px",
          gap: "20px",
        }}
      >
        {/* Camera Error */}
        {cameraError && (
          <div
            style={{
              width: "100%",
              maxWidth: "800px",
              backgroundColor: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: "12px",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <p
              style={{
                color: "#fca5a5",
                fontSize: "13px",
                lineHeight: "1.5",
              }}
            >
              {cameraError}
            </p>
            <button
              onClick={acquireCamera}
              style={{
                ...btnStyle("#dc2626"),
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!cameraReady && !cameraError && (
          <p
            style={{
              color: "#facc15",
              fontSize: "13px",
            }}
          >
            Initializing camera...
          </p>
        )}

        {/* VIDEO */}
        <div
          style={{
            width: "100%",
            maxWidth: "800px",
            backgroundColor: "#000000",
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid #222222",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
            aspectRatio: "16/9",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>

        {/* REFERENCE IMAGE */}
        <div
          style={{
            width: "100%",
            maxWidth: "800px",
            backgroundColor: "#111111",
            border: "1px solid #222222",
            borderRadius: "16px",
            padding: "20px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "14px",
              fontWeight: "600",
            }}
          >
            Reference Image
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="ref"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: "20px",
                    opacity: 0.4,
                  }}
                >
                  👤
                </span>
              )}
            </div>

            <label
              style={{
                flex: 1,
                backgroundColor: "#1a1a1a",
                border: "1px dashed #333333",
                borderRadius: "12px",
                padding: "16px",
                textAlign: "center",
                cursor: "pointer",
                color: "#9ca3af",
                fontSize: "13px",
                transition: "all 0.2s",
                display: "block",
              }}
            >
              {previewImage
                ? "✅ Image loaded — click to change"
                : "Click to upload reference image"}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) =>
                  e.target.files &&
                  handleImageUpload(e.target.files[0])
                }
              />
            </label>
          </div>

          <p
            style={{
              fontSize: "11px",
              color: "#4b5563",
              marginTop: "10px",
            }}
          >
            Use a clear front-facing portrait for best
            results.
          </p>
        </div>
      </div>

      {/* SPIN ANIMATION */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* API KEY MODAL */}
      {showApiModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "24px",
          }}
        >
          <div
            style={{
              backgroundColor: "#111111",
              border: "1px solid #2a2a2a",
              borderRadius: "20px",
              padding: "36px",
              width: "100%",
              maxWidth: "420px",
              boxShadow:
                "0 25px 60px rgba(0,0,0,0.8)",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "700",
                color: "#ffffff",
                marginBottom: "6px",
              }}
            >
              Enter API Key
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                marginBottom: "20px",
              }}
            >
              Paste your Decart API key to start.
            </p>

            <input
              type="text"
              placeholder="dct_api_..."
              value={apiInput}
              onChange={(e) =>
                setApiInput(e.target.value)
              }
              onKeyDown={(e) =>
                e.key === "Enter" && saveApiKey()
              }
              style={{
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
              }}
            />

            <button
              onClick={saveApiKey}
              style={{
                width: "100%",
                padding: "13px",
                backgroundColor: "#2563eb",
                border: "none",
                borderRadius: "12px",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                marginBottom: "8px",
              }}
            >
              Save & Connect
            </button>

            {apiKey && (
              <button
                onClick={() => setShowApiModal(false)}
                style={{
                  width: "100%",
                  padding: "11px",
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "12px",
                  color: "#9ca3af",
                  fontSize: "13px",
                  cursor: "pointer",
                  marginBottom: "8px",
                }}
              >
                Cancel
              </button>
            )}

            <button
              onClick={() => {
                setShowApiModal(false);
                router.push("/buy");
              }}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                color: "#3b82f6",
                fontSize: "13px",
                cursor: "pointer",
                padding: "8px",
              }}
            >
              Don't have a key? Buy one →
            </button>
          </div>
        </div>
      )}

      {/* ERROR MODAL */}
      {showError && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "24px",
          }}
        >
          <div
            style={{
              backgroundColor: "#111111",
              border: "1px solid #7f1d1d",
              borderRadius: "20px",
              padding: "36px",
              width: "100%",
              maxWidth: "420px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "40px",
                marginBottom: "16px",
              }}
            >
              ⚠️
            </div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "700",
                marginBottom: "12px",
              }}
            >
              Error
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#d1d5db",
                lineHeight: "1.6",
                marginBottom: "24px",
                wordBreak: "break-word",
              }}
            >
              {errorMsg}
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setShowError(false)}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#1f1f1f",
                  border: "1px solid #333",
                  borderRadius: "10px",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                OK
              </button>
              <button
                onClick={() => {
                  setShowError(false);
                  router.push("/buy");
                }}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "#2563eb",
                  border: "none",
                  borderRadius: "10px",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                Buy API
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function btnStyle(
  bg: string,
  border?: string
): React.CSSProperties {
  return {
    backgroundColor: bg,
    border: border
      ? `1px solid ${border}`
      : "none",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "500",
    padding: "8px 14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}