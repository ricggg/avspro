import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    // Get all payment IDs
    const ids = await redis.lrange("payments:all", 0, -1);

    if (!ids || ids.length === 0) {
      return NextResponse.json({ payments: [] });
    }

    // Fetch all payments in parallel
    const payments = await Promise.all(
      ids.map((id) => redis.hgetall(`payment:${id}`))
    );

    // Filter out any nulls
    const valid = payments.filter(Boolean);

    return NextResponse.json({ payments: valid });
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}