import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json(
        { error: "Missing paymentId" },
        { status: 400 }
      );
    }

    // Check payment exists
    const payment = await redis.hgetall(
      `payment:${paymentId}`
    );

    if (!payment) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    // Get next available key (same as keys.available.shift())
    const key = await redis.lpop("keys:available");

    if (!key) {
      return NextResponse.json(
        { error: "No keys available" },
        { status: 400 }
      );
    }

    // Move key to used list (same as keys.used.push(key))
    await redis.rpush("keys:used", key as string);

    // Update payment (same as payment.status = "approved")
    await redis.hset(`payment:${paymentId}`, {
      status: "approved",
      apiKey: key,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Approve error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}