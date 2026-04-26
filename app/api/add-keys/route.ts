import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { keys } = await req.json();

    if (!keys) {
      return NextResponse.json(
        { error: "Missing keys" },
        { status: 400 }
      );
    }

    // Get existing keys to avoid duplicates — same logic as before
    const existingAvailable = await redis.lrange(
      "keys:available",
      0,
      -1
    );
    const existingUsed = await redis.lrange(
      "keys:used",
      0,
      -1
    );

    const newKeys = (keys as string)
      .split(",")
      .map((k: string) => k.trim())
      .filter(
        (k: string) =>
          k.length > 5 &&
          !existingAvailable.includes(k) &&
          !existingUsed.includes(k)
      );

    if (newKeys.length === 0) {
      return NextResponse.json({
        success: true,
        added: 0,
        message: "No new keys to add",
      });
    }

    // Add all new keys to available list
    await redis.rpush("keys:available", ...newKeys);

    return NextResponse.json({
      success: true,
      added: newKeys.length,
    });
  } catch (error) {
    console.error("Add keys error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}