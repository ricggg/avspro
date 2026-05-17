import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    const tokenIds = await redis.lrange("streaming_tokens:all", 0, -1);

    const assignments = await Promise.all(
      tokenIds.map(async (id) => {
        const record = await redis.hgetall(`streaming_token:${id}`);
        if (!record) return null;
        const rec = record as any;

        let keys: string[] = [];
        try {
          keys = JSON.parse(rec.keys || "[]");
        } catch {
          keys = [];
        }

        return {
          token: id as string,
          keys,
          minutes: rec.minutes || "0",
          accessCode: rec.accessCode || "unknown",
        };
      })
    );

    return NextResponse.json({ assignments: assignments.filter(Boolean) });
  } catch (error) {
    console.error("Get key assignments error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}