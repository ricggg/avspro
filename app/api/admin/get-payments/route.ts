import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    const paymentIds = await redis.lrange("payments:all", 0, -1);

    const payments = await Promise.all(
      paymentIds.map(async (id) => {
        const record = await redis.hgetall(`payment:${id}`);
        if (!record) return null;
        const rec = record as any;
        return {
          id: id as string,
          crypto: rec.crypto,
          status: rec.status,
          streamingToken: rec.streamingToken,
          minutes: rec.minutes,
          price: rec.price,
          accessCode: rec.accessCode || "guest",
          createdAt: rec.createdAt,
        };
      })
    );

    return NextResponse.json({ payments: payments.filter(Boolean) });
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}