import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    const codesList = await redis.lrange("access_codes", 0, -1);

    const codes = await Promise.all(
      codesList.map(async (code) => {
        const record = await redis.hgetall(`access:${code}`);
        if (!record) return null;

        const rec = record as any;

        // Count purchases for this access code
        const allPayments = await redis.lrange("payments:all", 0, -1);
        let purchaseCount = 0;
        for (const paymentId of allPayments) {
          const payment = await redis.hgetall(`payment:${paymentId}`);
          if (payment && (payment as any).accessCode === code) {
            purchaseCount++;
          }
        }

        return {
          code: code as string,
          email: rec.email,
          createdAt: rec.createdAt,
          lastUsed: rec.lastUsed,
          useCount: Number(rec.useCount || 0),
          status: rec.status || "active",
          sessionId: rec.sessionId,
          purchaseCount,
        };
      })
    );

    return NextResponse.json({ codes: codes.filter(Boolean) });
  } catch (error) {
    console.error("Get codes error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}