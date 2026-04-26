import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { crypto } = await req.json();

    if (!crypto) {
      return NextResponse.json(
        { error: "Missing crypto" },
        { status: 400 }
      );
    }

    const paymentId = Date.now().toString();

    // Save payment — same data shape as your JSON file
    await redis.hset(`payment:${paymentId}`, {
      id: paymentId,
      crypto,
      status: "pending",
      apiKey: null,
    });

    // Keep a list of all payment IDs (same as your payments array)
    await redis.rpush("payments:all", paymentId);

    // Send Telegram notification — exactly as before
    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `💰 New Payment\nCrypto: ${crypto}\nID: ${paymentId}`,
        }),
      }
    ).catch(() => {});

    return NextResponse.json({ success: true, paymentId });
  } catch (error) {
    console.error("Notify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}