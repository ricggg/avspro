import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    const ids = await redis.lrange("access:all", 0, -1);

    console.log("All IDs:", ids);

    const results = [];

    for (const id of ids) {
      const record = await redis.hgetall(`access:${id}`);
      console.log(`access:${id} =>`, record);

      // If code field is missing, patch it
      if (record && !(record as any).code) {
        await redis.hset(`access:${id}`, { code: id });
        results.push({ id, fixed: true });
      } else {
        results.push({ id, fixed: false, code: (record as any)?.code });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}