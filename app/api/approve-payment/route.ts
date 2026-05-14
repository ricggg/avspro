import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEY_DURATION_SECONDS = 492;

function generateShortToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "AVS-";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const { paymentId, minutes } = await req.json();

    if (!paymentId || !minutes) {
      return NextResponse.json({ error: "Missing paymentId or minutes" }, { status: 400 });
    }

    const payment = await redis.hgetall(`payment:${paymentId}`);
    if (!payment || Object.keys(payment).length === 0) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if ((payment as any).status === "approved") {
      return NextResponse.json({ error: "Already approved" }, { status: 400 });
    }

    const totalSeconds = Number(minutes) * 60;
    const keysNeeded = Math.ceil(totalSeconds / KEY_DURATION_SECONDS);

    // Pull keys from pool
    const keys: string[] = [];
    for (let i = 0; i < keysNeeded; i++) {
      const key = await redis.lpop("keys:available");
      if (!key) {
        if (keys.length > 0) {
          await redis.lpush("keys:available", ...keys);
        }
        return NextResponse.json(
          { error: `Not enough API keys. Need ${keysNeeded}, only ${keys.length} available.` },
          { status: 400 }
        );
      }
      keys.push(key as string);
    }

    const token = generateShortToken();
    const issuedAt = Date.now();
    const now = new Date();

    // Save token
    await redis.hset(`streaming_token:${token}`, {
      token,
      paymentId,
      totalSeconds: String(totalSeconds),
      usedSeconds: "0",
      keys: JSON.stringify(keys),
      status: "active",
      issuedAt: String(issuedAt),
      minutes: String(minutes),
      accessCode: (payment as any).accessCode || "guest",
      price: (payment as any).price || "",
    });

    await redis.rpush("streaming_tokens:all", token);

    // Update payment
    await redis.hset(`payment:${paymentId}`, {
      status: "approved",
      streamingToken: token,
      approvedAt: now.toISOString(),
      approvedAtReadable: now.toLocaleString(),
    });

    // Send Telegram approval notification
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const accessCode = (payment as any).accessCode || "guest";
      const price = (payment as any).price || "";
      const crypto = (payment as any).crypto || "";

      const message = [
        `✅ <b>PAYMENT APPROVED</b>`,
        ``,
        `👤 <b>Account:</b> <code>${accessCode}</code>`,
        `📦 <b>Package:</b> ${minutes} Minutes`,
        `💰 <b>Price:</b> ${price}`,
        `💎 <b>Crypto:</b> ${crypto}`,
        ``,
        `🎫 <b>Streaming Token:</b>`,
        `<code>${token}</code>`,
        ``,
        `🔖 <b>Payment ID:</b> <code>${paymentId}</code>`,
        ``,
        `🕐 <b>Approved At:</b> ${now.toLocaleString()}`,
        ``,
        `✨ <i>Token is now active and ready to use.</i>`,
      ].join("\n");

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      streamingToken: token,
    });

  } catch (error) {
    console.error("Approve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}