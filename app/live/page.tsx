"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createDecartClient, models } from "@decartai/sdk";
import { useRouter } from "next/navigation";

export default function LivePage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const realtimeClientRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState("Initializing...");
  const [connected, setConnected] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const stablePrompt = `
Exact identity replication.
Strictly match the reference image.
Photorealistic human.
Stable motion.
No ghosting.
`;

  const cleanup = useCallback(async () => {
    try {
      await realtimeClientRef.current?.disconnect();
    } catch {}

    realtimeClientRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startLive = useCallback(async () => {
    if (isStarting) return;

    setIsStarting(true);
    setConnected(false);
    setErrorText(null);

    try {
      // Clean any previous attempt
      await cleanup();

      // ✅ Read saved data from dashboard
      const apiKey = localStorage.getItem("avatarApiKey");
      const savedImage = localStorage.getItem("avatarLastImage");

      if (!apiKey || apiKey.trim().length < 10) {
        setStatus("Missing API key");
        setErrorText(
          "No API key found. Go to Dashboard, enter API key, then click Live Mode again."
        );
        setIsStarting(false);
        return;
      }

      setStatus("Accessing camera...");

      // ✅ Acquire camera (simple constraints for best compatibility)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;

      setStatus("Connecting to Lucy...");

      const model = models.realtime("lucy-2.1");
      const client = createDecartClient({ apiKey });

      const realtimeClient = await client.realtime.connect(stream, {
        model,
        onRemoteStream: (editedStream: MediaStream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = editedStream;
          }
          setConnected(true);
          setStatus("Live");
        },
      });

      realtimeClientRef.current = realtimeClient;

      // ✅ Apply saved avatar image if available
      if (savedImage) {
        setStatus("Applying reference image...");

        // savedImage is a data URL; fetch works in modern browsers
        const res = await fetch(savedImage);
        const blob = await res.blob();

        const file = new File([blob], "avatar.jpg", {
          type: blob.type || "image/jpeg",
        });

        await realtimeClient.set({
          prompt: stablePrompt,
          image: file,
          enhance: false,
        });

        // if stream already connected, return to "Live"
        setStatus("Live");
      } else {
        // Not an error; just no identity set yet
        setStatus("Live (no reference image set)");
      }

      // ✅ Attempt fullscreen kiosk mode (may fail without gesture; safe to ignore)
      document.documentElement.requestFullscreen().catch(() => {});
    } catch (err: any) {
      console.error("Live page error:", err);

      const name = err?.name || "Error";
      const message = err?.message || "Unknown error";

      // Camera busy message
      if (name === "NotReadableError") {
        setStatus("Camera busy");
        setErrorText(
          "Camera is in use by another app/tab. Close Zoom/OBS Video Capture Device/other camera apps. If Dashboard is open, navigate away from it (Dashboard holds camera). Then click Retry."
        );
      } else {
        setStatus("Error");
        setErrorText(`${name}: ${message}`);
      }
    } finally {
      setIsStarting(false);
    }
  }, [cleanup, isStarting]);

  useEffect(() => {
    startLive();
    return () => {
      cleanup();
    };
  }, [startLive, cleanup]);

  return (
    <div
      style={{
        backgroundColor: "#000000",
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Video Output */}
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

      {/* Logo (always safe) */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          padding: "6px 14px",
          borderRadius: "8px",
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: "500",
          zIndex: 5,
        }}
      >
        Avatar Studio Pro
      </div>

      {/* Status Overlay (only when not connected OR when error) */}
      {(!connected || errorText) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000000",
            flexDirection: "column",
            gap: "16px",
            padding: "24px",
            zIndex: 4,
            textAlign: "center",
          }}
        >
          {/* Spinner */}
          {!errorText && (
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "3px solid rgba(255,255,255,0.12)",
                borderTopColor: "#3b82f6",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          )}

          <p style={{ color: "#9ca3af", fontSize: "14px" }}>{status}</p>

          {errorText && (
            <p
              style={{
                color: "#fca5a5",
                fontSize: "13px",
                maxWidth: "720px",
                lineHeight: 1.5,
                wordBreak: "break-word",
              }}
            >
              {errorText}
            </p>
          )}

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={startLive}
              style={{
                backgroundColor: "#2563eb",
                border: "none",
                borderRadius: "10px",
                color: "#ffffff",
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                opacity: isStarting ? 0.7 : 1,
              }}
              disabled={isStarting}
            >
              {isStarting ? "Retrying..." : "Retry"}
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              style={{
                backgroundColor: "#1f1f1f",
                border: "1px solid #333",
                borderRadius: "10px",
                color: "#ffffff",
                padding: "10px 16px",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}