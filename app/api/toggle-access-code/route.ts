import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { code, action } = await req.json();

    if (!code || !action) {
      return NextResponse.json({ error: "Missing code or action" }, { status: 400 });
    }

    const newStatus = action === "block" ? "blocked" : "active";
    const newActive = action === "block" ? "false" : "true";

    await redis.hset(`access:${code}`, {
      status: newStatus,
      active: newActive,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Toggle access code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}