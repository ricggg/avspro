import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { tokenId } = await req.json();
    if (!tokenId) return NextResponse.json({ error: "Missing tokenId" }, { status: 400 });

    await redis.hset(`streaming_token:${tokenId}`, { status: "revoked" });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke token error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}