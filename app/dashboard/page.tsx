"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createDecartClient, models } from "@decartai/sdk";
import { useRouter } from "next/navigation";

const KEY_DURATION_SECONDS = 492;
const AVATAR_CONFIRM_FRAMES = 15;

const stablePrompt = `
Exact identity replication.
Strictly match the reference image.
Photorealistic human.
Stable motion.
No ghosting.
`;

interface TokenInfo {
  totalSeconds: number;
  usedSeconds: number;
  keys: string[];
  tokenId: string;
  issuedAt: number;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function btnStyle(bg: string, border?: string): React.CSSProperties {
  return {
    backgroundColor: bg,
    border: border ? `1px solid ${border}` : "none",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "500",
    padding: "8px 14px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };
}

export default function Dashboard() {
  const router = useRouter();

  const rawVideoRef = useRef<HTMLVideoElement>(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const hardOverlayRef = useRef<HTMLDivElement>(null);
  const nuclearOverlayRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const rawDrawRafRef = useRef<number | null>(null);
  const lastGoodFrameRef = useRef<ImageData | null>(null);
  const confirmedFramesRef = useRef(0);
  const avatarConfirmedRef = useRef(false);
  const avatarActiveRef = useRef(false);
  const isStreamingRef = useRef(false);
  const usedSecondsRef = useRef(0);
  const currentKeyIndexRef = useRef(0);
  const keyStartSecondRef = useRef(0);
  const tokenInfoRef = useRef<TokenInfo | null>(null);
  const switchingRef = useRef(false);
  const realtimeClientRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const keyErrorCountRef = useRef<Record<number, number>>({});

  const [tokenInput, setTokenInput] = useState("");
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [usedSeconds, setUsedSeconds] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [lastAvatarFile, setLastAvatarFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showError, setShowError] = useState(false);

  const hiddenVideoStyle: React.CSSProperties = {
    display: "none",
    visibility: "hidden",
    opacity: 0,
    position: "fixed",
    top: "-99999px",
    left: "-99999px",
    width: "1px",
    height: "1px",
    pointerEvents: "none",
    zIndex: -9999,
  };

  const showOverlays = useCallback(() => {
    avatarConfirmedRef.current = false;
    confirmedFramesRef.current = 0;
    const hard = hardOverlayRef.current;
    if (hard) {
      hard.style.display = "flex";
      hard.style.opacity = "1";
      hard.style.pointerEvents = "all";
    }
    const nuclear = nuclearOverlayRef.current;
    if (nuclear) {
      nuclear.style.display = "flex";
      nuclear.style.opacity = "1";
      nuclear.style.pointerEvents = "all";
    }
  }, []);

  const hideOverlays = useCallback(() => {
    const hard = hardOverlayRef.current;
    if (hard) {
      hard.style.opacity = "0";
      hard.style.pointerEvents = "none";
      setTimeout(() => {
        hard.style.display = "none";
      }, 250);
    }
    const nuclear = nuclearOverlayRef.current;
    if (nuclear) {
      nuclear.style.opacity = "0";
      nuclear.style.pointerEvents = "none";
      setTimeout(() => {
        nuclear.style.display = "none";
      }, 250);
    }
  }, []);

  const startRawCamLoop = useCallback(() => {
    if (rawDrawRafRef.current) {
      cancelAnimationFrame(rawDrawRafRef.current);
      rawDrawRafRef.current = null;
    }
    const canvas = displayCanvasRef.current;
    const rawVideo = rawVideoRef.current;
    if (!canvas || !rawVideo) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawRaw = () => {
      if (isStreamingRef.current) return;
      if (rawVideo.readyState >= 2 && rawVideo.videoWidth > 0) {
        if (
          canvas.width !== rawVideo.videoWidth ||
          canvas.height !== rawVideo.videoHeight
        ) {
          canvas.width = rawVideo.videoWidth;
          canvas.height = rawVideo.videoHeight;
        }
        ctx.drawImage(rawVideo, 0, 0, canvas.width, canvas.height);
      }
      rawDrawRafRef.current = requestAnimationFrame(drawRaw);
    };
    rawDrawRafRef.current = requestAnimationFrame(drawRaw);
  }, []);

  const stopRawCamLoop = useCallback(() => {
    if (rawDrawRafRef.current) {
      cancelAnimationFrame(rawDrawRafRef.current);
      rawDrawRafRef.current = null;
    }
  }, []);

  const startRenderLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      if (!isStreamingRef.current) return;

      const avatarVideo = avatarVideoRef.current;
      const avatarHealthy =
        avatarActiveRef.current &&
        avatarVideo !== null &&
        avatarVideo.readyState >= 2 &&
        avatarVideo.videoWidth > 0 &&
        !avatarVideo.paused &&
        !avatarVideo.ended;

      if (avatarHealthy && avatarVideo) {
        if (
          canvas.width !== avatarVideo.videoWidth ||
          canvas.height !== avatarVideo.videoHeight
        ) {
          canvas.width = avatarVideo.videoWidth || 1280;
          canvas.height = avatarVideo.videoHeight || 720;
        }
        ctx.drawImage(avatarVideo, 0, 0, canvas.width, canvas.height);

        try {
          lastGoodFrameRef.current = ctx.getImageData(
            0, 0, canvas.width, canvas.height
          );
        } catch {}

        confirmedFramesRef.current += 1;

        if (
          !avatarConfirmedRef.current &&
          confirmedFramesRef.current >= AVATAR_CONFIRM_FRAMES &&
          isStreamingRef.current
        ) {
          avatarConfirmedRef.current = true;
          hideOverlays();
        }

      } else if (lastGoodFrameRef.current) {
        ctx.putImageData(lastGoodFrameRef.current, 0, 0);

        if (avatarConfirmedRef.current && !avatarActiveRef.current) {
          avatarConfirmedRef.current = false;
          confirmedFramesRef.current = 0;
          showOverlays();
        }

      } else {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width || 1280, canvas.height || 720);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
  }, [hideOverlays, showOverlays]);

  const stopRenderLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const acquireCamera = async () => {
    setCameraError("");
    setCameraReady(false);
    stopRawCamLoop();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
      streamRef.current = null;
    }
    if (rawVideoRef.current) rawVideoRef.current.srcObject = null;

    await new Promise(r => setTimeout(r, 600));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (rawVideoRef.current) {
        rawVideoRef.current.srcObject = stream;
        rawVideoRef.current.onloadedmetadata = () => {
          if (!isStreamingRef.current) startRawCamLoop();
        };
      }
      setCameraReady(true);
    } catch (err: any) {
      setCameraError(
        `Camera unavailable (${err?.name}). Close Zoom, OBS, Teams then retry.`
      );
    }
  };

  useEffect(() => {
    acquireCamera();
    return () => {
      stopRenderLoop();
      stopRawCamLoop();
      streamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch {} });
    };
  }, []);

  useEffect(() => {
    if (!isStreaming) return;
    const watchdog = setInterval(() => {
      if (!isStreamingRef.current) return;
      const avatarVideo = avatarVideoRef.current;
      const avatarHealthy =
        avatarActiveRef.current &&
        avatarVideo !== null &&
        avatarVideo.readyState >= 2 &&
        avatarVideo.videoWidth > 0;
      if (!avatarHealthy && avatarConfirmedRef.current) {
        avatarConfirmedRef.current = false;
        confirmedFramesRef.current = 0;
        showOverlays();
      }
    }, 500);
    return () => clearInterval(watchdog);
  }, [isStreaming, showOverlays]);

  const saveToken = async () => {
    const raw = tokenInput.trim();
    if (!raw) { showErr("Please enter your streaming token."); return; }
    try {
      const res = await fetch("/api/validate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: raw }),
      });
      const data = await res.json();
      if (!data.valid) {
        showErr(data.error || "Invalid or expired streaming token.");
        return;
      }
      const info: TokenInfo = data.tokenInfo;
      if (!info || !info.keys || info.keys.length === 0) {
        showErr("Token has no API keys assigned. Contact admin.");
        return;
      }
      setTokenInfo(info);
      tokenInfoRef.current = info;
      setUsedSeconds(info.usedSeconds);
      usedSecondsRef.current = info.usedSeconds;
      currentKeyIndexRef.current = 0;
      keyErrorCountRef.current = {};
      setShowTokenModal(false);
    } catch {
      showErr("Token validation failed. Try again.");
    }
  };

  // ─── handleCreditError declared before connectWithKey so it can be referenced ───
  const handleCreditError = useCallback(async () => {
    if (switchingRef.current) return;
    switchingRef.current = true;

    console.log("Credit error — rotating key immediately");

    const info = tokenInfoRef.current;
    if (!info) { switchingRef.current = false; return; }

    const currentIndex = currentKeyIndexRef.current;
    keyErrorCountRef.current[currentIndex] =
      (keyErrorCountRef.current[currentIndex] || 0) + 1;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= info.keys.length) {
      switchingRef.current = false;
      await handleTimeExhausted();
      return;
    }

    showOverlays();
    avatarActiveRef.current = false;

    await fetch("/api/mark-key-used", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId: info.tokenId, keyIndex: currentIndex }),
    }).catch(() => {});

    try { await realtimeClientRef.current?.disconnect(); } catch {}
    realtimeClientRef.current = null;
    if (avatarVideoRef.current) avatarVideoRef.current.srcObject = null;

    await new Promise(r => setTimeout(r, 300));

    currentKeyIndexRef.current = nextIndex;
    keyStartSecondRef.current = usedSecondsRef.current;

    const success = await connectWithKey(nextIndex);
    if (!success) await handleTimeExhausted();

    switchingRef.current = false;
  }, [showOverlays]); // eslint-disable-line

  const connectWithKey = async (keyIndex: number): Promise<boolean> => {
    const info = tokenInfoRef.current;
    if (!info || keyIndex >= info.keys.length) return false;
    if (!streamRef.current || !cameraReady) return false;

    avatarActiveRef.current = false;
    avatarConfirmedRef.current = false;
    confirmedFramesRef.current = 0;

    try {
      const apiKey = info.keys[keyIndex];
      console.log(`Connecting key index ${keyIndex}`);

      const client = createDecartClient({ apiKey });

      // ✅ onError removed from connect options — attached separately below
      const realtimeClient = await client.realtime.connect(streamRef.current, {
        model: models.realtime("lucy-2.1"),
        onRemoteStream: (editedStream: MediaStream) => {
          if (!isStreamingRef.current) return;

          if (avatarVideoRef.current) {
            avatarVideoRef.current.srcObject = editedStream;
            avatarVideoRef.current.play().catch(() => {});
          }

          avatarActiveRef.current = true;
          avatarConfirmedRef.current = false;
          confirmedFramesRef.current = 0;
        },
      });

      // ✅ Error handling attached via event listener instead
      realtimeClient.on("error", (error: any) => {
        console.error("SDK onError:", error);
        const msg = String(error?.message || error || "").toLowerCase();
        const isCredit =
          msg.includes("insufficient") ||
          msg.includes("credits") ||
          msg.includes("quota") ||
          msg.includes("limit") ||
          msg.includes("balance") ||
          msg.includes("unauthorized");

        if (isCredit && isStreamingRef.current && !switchingRef.current) {
          handleCreditError();
        }
      });

      realtimeClientRef.current = realtimeClient;

      if (lastAvatarFile) {
        await realtimeClient.set({ prompt: stablePrompt, image: lastAvatarFile });
      }

      return true;
    } catch (err: any) {
      console.error("connectWithKey error:", err);
      const msg = String(err?.message || err || "").toLowerCase();
      const isCredit =
        msg.includes("insufficient") ||
        msg.includes("credits") ||
        msg.includes("quota") ||
        msg.includes("limit") ||
        msg.includes("balance");

      if (isCredit) {
        const nextIndex = keyIndex + 1;
        const info = tokenInfoRef.current;
        if (info && nextIndex < info.keys.length) {
          await fetch("/api/mark-key-used", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tokenId: info.tokenId, keyIndex }),
          }).catch(() => {});
          currentKeyIndexRef.current = nextIndex;
          keyStartSecondRef.current = usedSecondsRef.current;
          return connectWithKey(nextIndex);
        }
      }
      return false;
    }
  };

  const handleTimeExhausted = async () => {
    showOverlays();
    isStreamingRef.current = false;
    avatarActiveRef.current = false;
    avatarConfirmedRef.current = false;
    stopRenderLoop();
    setIsStreaming(false);

    try { await realtimeClientRef.current?.disconnect(); } catch {}
    realtimeClientRef.current = null;
    if (avatarVideoRef.current) avatarVideoRef.current.srcObject = null;

    const canvas = displayCanvasRef.current;
    if (canvas && lastGoodFrameRef.current) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.putImageData(lastGoodFrameRef.current, 0, 0);
    } else if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    await fetch("/api/update-token-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenId: tokenInfoRef.current?.tokenId,
        usedSeconds: usedSecondsRef.current,
      }),
    }).catch(() => {});

    showErr("Your streaming time has been fully used. Purchase more time to continue.");
  };

  const rotateToNextKey = async () => {
    if (switchingRef.current) return;
    switchingRef.current = true;

    const info = tokenInfoRef.current;
    if (!info) { switchingRef.current = false; return; }

    const nextIndex = currentKeyIndexRef.current + 1;
    if (nextIndex >= info.keys.length) {
      switchingRef.current = false;
      await handleTimeExhausted();
      return;
    }

    showOverlays();
    avatarActiveRef.current = false;

    await fetch("/api/mark-key-used", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenId: info.tokenId,
        keyIndex: currentKeyIndexRef.current,
      }),
    }).catch(() => {});

    try { await realtimeClientRef.current?.disconnect(); } catch {}
    realtimeClientRef.current = null;
    if (avatarVideoRef.current) avatarVideoRef.current.srcObject = null;

    await new Promise(r => setTimeout(r, 400));

    currentKeyIndexRef.current = nextIndex;
    keyStartSecondRef.current = nextIndex * KEY_DURATION_SECONDS;

    const success = await connectWithKey(nextIndex);
    if (!success) await handleTimeExhausted();

    switchingRef.current = false;
  };

  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(async () => {
      if (!isStreamingRef.current) return;
      usedSecondsRef.current += 1;
      setUsedSeconds(usedSecondsRef.current);
      const info = tokenInfoRef.current;
      if (!info) return;
      if (usedSecondsRef.current >= info.totalSeconds) {
        clearInterval(interval);
        await handleTimeExhausted();
        return;
      }
      const keyElapsed = usedSecondsRef.current - keyStartSecondRef.current;
      if (keyElapsed >= KEY_DURATION_SECONDS && !switchingRef.current) {
        await rotateToNextKey();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const startStreaming = async () => {
    if (!tokenInfo) { setShowTokenModal(true); return; }
    if (isStreaming || isLoading) return;
    if (!streamRef.current || !cameraReady) {
      showErr("Camera not ready.");
      return;
    }
    const remaining = tokenInfo.totalSeconds - usedSeconds;
    if (remaining <= 0) {
      showErr("No streaming time remaining. Please purchase more.");
      return;
    }

    showOverlays();
    stopRawCamLoop();
    setIsLoading(true);

    lastGoodFrameRef.current = null;
    avatarActiveRef.current = false;
    avatarConfirmedRef.current = false;
    confirmedFramesRef.current = 0;
    keyErrorCountRef.current = {};

    const startIndex = Math.min(
      Math.floor(usedSeconds / KEY_DURATION_SECONDS),
      tokenInfo.keys.length - 1
    );
    currentKeyIndexRef.current = startIndex;
    keyStartSecondRef.current = startIndex * KEY_DURATION_SECONDS;
    isStreamingRef.current = true;

    startRenderLoop();

    const success = await connectWithKey(startIndex);

    if (success) {
      setIsStreaming(true);
      setIsLoading(false);
    } else {
      isStreamingRef.current = false;
      avatarActiveRef.current = false;
      stopRenderLoop();
      setIsLoading(false);
      startRawCamLoop();
      avatarConfirmedRef.current = true;
      hideOverlays();
      showErr("Failed to connect. API key may be exhausted. Contact admin.");
    }
  };

  const stopStreaming = async () => {
    showOverlays();
    isStreamingRef.current = false;
    avatarActiveRef.current = false;
    avatarConfirmedRef.current = false;
    setIsStreaming(false);
    stopRenderLoop();

    try { await realtimeClientRef.current?.disconnect(); } catch {}
    realtimeClientRef.current = null;
    if (avatarVideoRef.current) avatarVideoRef.current.srcObject = null;

    await fetch("/api/update-token-usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenId: tokenInfoRef.current?.tokenId,
        usedSeconds: usedSecondsRef.current,
      }),
    }).catch(() => {});

    startRawCamLoop();
    avatarConfirmedRef.current = true;
    hideOverlays();
  };

  const handleImageUpload = async (file: File) => {
    setLastAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = async () => {
      setPreviewImage(reader.result as string);
      if (!realtimeClientRef.current) return;
      await realtimeClientRef.current.set({ prompt: stablePrompt, image: file });
    };
    reader.readAsDataURL(file);
  };

  const showErr = (msg: string) => { setErrorMsg(msg); setShowError(true); };

  const totalSec = tokenInfo?.totalSeconds ?? 0;
  const remainingSec = Math.max(0, totalSec - usedSeconds);
  const progressPct = totalSec > 0 ? (usedSeconds / totalSec) * 100 : 0;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", color: "#ffffff", display: "flex", flexDirection: "column" }}>

      <video ref={rawVideoRef} autoPlay playsInline muted style={hiddenVideoStyle} />
      <video ref={avatarVideoRef} autoPlay playsInline muted style={hiddenVideoStyle} />

      {/* TOP BAR */}
      <div style={{ backgroundColor: "#111111", borderBottom: "1px solid #222222", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <span style={{ fontSize: "16px", fontWeight: "700", color: "#ffffff" }}>🎭 Avatar Studio Pro</span>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {tokenInfo && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "6px 12px" }}>
              {isStreaming && (
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#4ade80", display: "inline-block", animation: "pulse 1s infinite" }} />
              )}
              <span style={{ fontSize: "11px", fontFamily: "monospace", color: isStreaming ? "#4ade80" : "#9ca3af" }}>
                {isStreaming ? "LIVE " : ""}{formatTime(usedSeconds)} / {formatTime(totalSec)}
              </span>
              <span style={{ fontSize: "11px", color: remainingSec < 60 ? "#f87171" : "#6b7280", fontFamily: "monospace" }}>
                ({formatTime(remainingSec)} left)
              </span>
            </div>
          )}

          <button onClick={() => setShowTokenModal(true)} style={btnStyle("#1f1f1f", "#333")}>
            {tokenInfo ? "Token ✓" : "Enter Token"}
          </button>

          <button onClick={() => router.push("/buy")} style={btnStyle("#1d4ed8")}>
            Buy Time
          </button>

          {!isStreaming ? (
            <button
              onClick={startStreaming}
              disabled={isLoading || !cameraReady || !tokenInfo}
              suppressHydrationWarning
              style={{
                ...btnStyle("#16a34a"),
                opacity: isLoading || !cameraReady || !tokenInfo ? 0.5 : 1,
                cursor: isLoading || !cameraReady || !tokenInfo ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              {isLoading && (
                <span style={{ width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
              )}
              {isLoading ? "Connecting..." : "▶ Start"}
            </button>
          ) : (
            <button onClick={stopStreaming} style={btnStyle("#dc2626")}>■ Stop</button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {tokenInfo && (
        <div style={{ height: "3px", backgroundColor: "#1a1a1a", width: "100%" }}>
          <div style={{
            height: "100%",
            width: `${progressPct}%`,
            backgroundColor: progressPct > 85 ? "#ef4444" : progressPct > 60 ? "#f59e0b" : "#22c55e",
            transition: "width 1s linear",
          }} />
        </div>
      )}

      {/* CONTENT */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px", gap: "20px" }}>

        {cameraError && (
          <div style={{ width: "100%", maxWidth: "800px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "12px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <p style={{ color: "#fca5a5", fontSize: "13px" }}>{cameraError}</p>
            <button onClick={acquireCamera} style={btnStyle("#dc2626")}>Retry</button>
          </div>
        )}

        {!cameraReady && !cameraError && (
          <p style={{ color: "#facc15", fontSize: "13px" }}>Initializing camera...</p>
        )}

        {/* VIDEO CONTAINER */}
        <div style={{ width: "100%", maxWidth: "800px", backgroundColor: "#000", borderRadius: "16px", overflow: "hidden", border: "1px solid #222222", boxShadow: "0 20px 60px rgba(0,0,0,0.8)", aspectRatio: "16/9", position: "relative" }}>

          <canvas
            ref={displayCanvasRef}
            width={1280}
            height={720}
            style={{ width: "100%", height: "100%", display: "block", backgroundColor: "#000" }}
          />

          <div
            ref={hardOverlayRef}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#000000",
              zIndex: 10,
              display: "flex",
              opacity: 1,
              transition: "opacity 0.25s ease",
              pointerEvents: "all",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isLoading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <span style={{ width: "32px", height: "32px", border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#ffffff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: "13px", color: "#6b7280" }}>Connecting avatar...</span>
              </div>
            )}
          </div>

          <div
            ref={nuclearOverlayRef}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#000000",
              zIndex: 11,
              display: "flex",
              opacity: 1,
              transition: "opacity 0.25s ease",
              pointerEvents: "all",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        </div>

        {/* Token Info Bar */}
        {tokenInfo && (
          <div style={{ width: "100%", maxWidth: "800px", backgroundColor: "#111111", border: "1px solid #222222", borderRadius: "12px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              {[
                { label: "TOKEN ID", value: tokenInfo.tokenId, color: "#9ca3af" },
                { label: "TOTAL TIME", value: formatTime(totalSec), color: "#9ca3af" },
                { label: "USED", value: formatTime(usedSeconds), color: "#facc15" },
                { label: "REMAINING", value: formatTime(remainingSec), color: remainingSec < 120 ? "#f87171" : "#4ade80" },
              ].map(item => (
                <div key={item.label}>
                  <p style={{ fontSize: "10px", color: "#4b5563", marginBottom: "2px" }}>{item.label}</p>
                  <p style={{ fontSize: "11px", fontFamily: "monospace", color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reference Image */}
        <div style={{ width: "100%", maxWidth: "800px", backgroundColor: "#111111", border: "1px solid #222222", borderRadius: "16px", padding: "20px" }}>
          <p style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px", fontWeight: "600" }}>
            Reference Image
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "12px", overflow: "hidden", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {previewImage ? (
                <img src={previewImage} alt="ref" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "20px", opacity: 0.4 }}>👤</span>
              )}
            </div>
            <label style={{ flex: 1, backgroundColor: "#1a1a1a", border: "1px dashed #333", borderRadius: "12px", padding: "16px", textAlign: "center", cursor: "pointer", color: "#9ca3af", fontSize: "13px", display: "block" }}>
              {previewImage ? "✅ Image loaded — click to change" : "Click to upload reference image"}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => e.target.files && handleImageUpload(e.target.files[0])}
              />
            </label>
          </div>
          <p style={{ fontSize: "11px", color: "#4b5563", marginTop: "10px" }}>
            Use a clear front-facing portrait for best results.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      {/* TOKEN MODAL */}
      {showTokenModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "24px" }}>
          <div style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", borderRadius: "20px", padding: "36px", width: "100%", maxWidth: "420px", boxShadow: "0 25px 60px rgba(0,0,0,0.8)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "6px" }}>Enter Streaming Token</h2>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px" }}>
              Paste your streaming token to unlock your purchased time.
            </p>
            <input
              type="text"
              placeholder="AVS-XXXXXXXX"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveToken()}
              style={{ width: "100%", padding: "13px 16px", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", color: "#ffffff", fontSize: "14px", outline: "none", display: "block", marginBottom: "12px", boxSizing: "border-box" }}
            />
            <button onClick={saveToken} style={{ width: "100%", padding: "13px", backgroundColor: "#2563eb", border: "none", borderRadius: "12px", color: "#ffffff", fontSize: "14px", fontWeight: "600", cursor: "pointer", marginBottom: "8px" }}>
              Activate Token
            </button>
            {tokenInfo && (
              <button onClick={() => setShowTokenModal(false)} style={{ width: "100%", padding: "11px", backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "12px", color: "#9ca3af", fontSize: "13px", cursor: "pointer", marginBottom: "8px" }}>
                Cancel
              </button>
            )}
            <button onClick={() => { setShowTokenModal(false); router.push("/buy"); }} style={{ width: "100%", background: "none", border: "none", color: "#3b82f6", fontSize: "13px", cursor: "pointer", padding: "8px" }}>
              Don't have a token? Buy streaming time →
            </button>
          </div>
        </div>
      )}

      {/* ERROR MODAL */}
      {showError && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "24px" }}>
          <div style={{ backgroundColor: "#111111", border: "1px solid #7f1d1d", borderRadius: "20px", padding: "36px", width: "100%", maxWidth: "420px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
            <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "12px" }}>Notice</h2>
            <p style={{ fontSize: "13px", color: "#d1d5db", lineHeight: "1.6", marginBottom: "24px", wordBreak: "break-word" }}>{errorMsg}</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setShowError(false)} style={{ padding: "10px 24px", backgroundColor: "#1f1f1f", border: "1px solid #333", borderRadius: "10px", color: "#ffffff", cursor: "pointer", fontSize: "13px" }}>OK</button>
              <button onClick={() => { setShowError(false); router.push("/buy"); }} style={{ padding: "10px 24px", backgroundColor: "#2563eb", border: "none", borderRadius: "10px", color: "#ffffff", cursor: "pointer", fontSize: "13px" }}>Buy More Time</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}