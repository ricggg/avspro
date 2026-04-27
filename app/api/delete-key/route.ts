import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { key, list } = await req.json();

    if (!key || !list) {
      return NextResponse.json(
        { error: "Missing key or list" },
        { status: 400 }
      );
    }

    if (list !== "available" && list !== "used") {
      return NextResponse.json(
        { error: "list must be available or used" },
        { status: 400 }
      );
    }

    // lrem removes all occurrences of the value from the list
    const removed = await redis.lrem(
      `keys:${list}`,
      0,
      key
    );

    if (removed === 0) {
      return NextResponse.json(
        { error: "Key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete key error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}