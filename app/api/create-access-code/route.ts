import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { code, label } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const cleanCode = code.trim();

    const existing = await redis.hgetall(`access:${cleanCode}`);
    if (existing && Object.keys(existing).length > 0) {
      return NextResponse.json({ error: "Code already exists" }, { status: 400 });
    }

    const now = new Date();

    await redis.hset(`access:${cleanCode}`, {
      code: cleanCode,
      accessCode: cleanCode,
      label: label || "",
      note: label || "",
      status: "active",
      active: "true",
      createdAt: now.toISOString(),
      createdAtReadable: now.toLocaleString(),
      lastUsed: "",
      useCount: "0",
      deviceFingerprint: "",
      forceLogout: "false",
    });

    await redis.rpush("access:all", cleanCode);

    return NextResponse.json({ success: true, code: cleanCode, accessCode: cleanCode });
  } catch (error) {
    console.error("Create access code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}