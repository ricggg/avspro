import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { tokenId, usedSeconds } = await req.json();
    if (!tokenId) return NextResponse.json({ error: "Missing tokenId" }, { status: 400 });

    const record = await redis.hgetall(`streaming_token:${tokenId}`);
    if (!record || Object.keys(record).length === 0) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const totalSeconds = Number((record as any).totalSeconds);
    const newUsed = Math.min(Number(usedSeconds), totalSeconds);
    const newStatus = newUsed >= totalSeconds ? "exhausted" : "active";

    await redis.hset(`streaming_token:${tokenId}`, {
      usedSeconds: String(newUsed),
      status: newStatus,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update token usage error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}