import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { key } = await req.json();

    if (!key || !key.startsWith("dct_")) {
      return NextResponse.json({ error: "Invalid API key format" }, { status: 400 });
    }

    await redis.rpush("keys:available", key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add key error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}