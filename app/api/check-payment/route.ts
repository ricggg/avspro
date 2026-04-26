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

    const payment = await redis.hgetall(
      `payment:${paymentId}`
    );

    if (!payment) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    // Returns same shape as before: { id, crypto, status, apiKey }
    return NextResponse.json(payment);
  } catch (error) {
    console.error("Check payment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}