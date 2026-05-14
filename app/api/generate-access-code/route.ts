import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments = [];
  for (let s = 0; s < 3; s++) {
    let seg = "";
    for (let i = 0; i < 4; i++) {
      seg += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(seg);
  }
  return "AVS-" + segments.join("-");
}

export async function POST(req: Request) {
  try {
    const { note, label } = await req.json();

    const accessCode = generateCode();
    const now = new Date();

    await redis.hset(`access:${accessCode}`, {
      code: accessCode,
      accessCode,
      label: label || note || "",
      note: note || label || "",
      status: "active",
      active: "true",
      createdAt: now.toISOString(),
      createdAtReadable: now.toLocaleString(),
      lastUsed: "",
      useCount: "0",
      deviceFingerprint: "",
      forceLogout: "false",
    });

    await redis.rpush("access:all", accessCode);

    return NextResponse.json({ success: true, accessCode, code: accessCode });
  } catch (error) {
    console.error("Generate access code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}