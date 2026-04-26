import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    // Same as reading api-keys.json { available: [], used: [] }
    const available = await redis.lrange(
      "keys:available",
      0,
      -1
    );
    const used = await redis.lrange("keys:used", 0, -1);

    return NextResponse.json({ available, used });
  } catch (error) {
    console.error("Get keys error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}