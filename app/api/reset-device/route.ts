import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { accessCode } = await req.json();
    if (!accessCode) return NextResponse.json({ error: "Missing accessCode" }, { status: 400 });

    await redis.hset(`access:${accessCode}`, {
      deviceFingerprint: "",
      deviceInfo: "",
      activatedAt: "",
      activatedAtReadable: "",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset device error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}