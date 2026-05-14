import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { tokenId, keyIndex } = await req.json();
    if (!tokenId || keyIndex === undefined) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const record = await redis.hgetall(`streaming_token:${tokenId}`);
    if (!record || Object.keys(record).length === 0) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const rec = record as any;
    let keys: string[] = [];
    try { keys = JSON.parse(rec.keys || "[]"); } catch { keys = []; }

    const exhaustedKey = keys[keyIndex];
    if (exhaustedKey) {
      await redis.rpush("keys:used", exhaustedKey);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark key used error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}