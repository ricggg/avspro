import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

    await redis.hdel(`access:${code}`, "sessionId");
    await redis.hset(`access:${code}`, { forceLogout: "true" });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Force logout error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}