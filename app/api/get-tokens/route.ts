import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    const ids = await redis.lrange("streaming_tokens:all", 0, -1);

    if (!ids || ids.length === 0) {
      return NextResponse.json({ tokens: [] });
    }

    const tokens = await Promise.all(
      ids.map(async (id) => {
        const record = await redis.hgetall(`streaming_token:${id}`);
        if (!record) return null;
        const rec = record as any;
        let keyCount = 0;
        try { keyCount = JSON.parse(rec.keys || "[]").length; } catch { keyCount = 0; }
        return {
          tokenId: id,
          token: rec.token,
          paymentId: rec.paymentId,
          totalSeconds: Number(rec.totalSeconds),
          usedSeconds: Number(rec.usedSeconds),
          status: rec.status,
          issuedAt: rec.issuedAt,
          minutes: rec.minutes,
          keyCount,
        };
      })
    );

    return NextResponse.json({ tokens: tokens.filter(Boolean) });
  } catch (error) {
    console.error("Get tokens error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}