import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function generateId(): string {
  return Date.now().toString();
}

function generateTransactionId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "TXN-";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const { crypto, minutes, accessCode, price } = await req.json();

    const paymentId = generateId();
    const transactionId = generateTransactionId();
    const now = new Date();

    // Save to Redis
    await redis.hset(`payment:${paymentId}`, {
      id: paymentId,
      transactionId,
      crypto,
      minutes: String(minutes),
      price: price || "",
      accessCode: accessCode || "guest",
      status: "pending",
      createdAt: now.toISOString(),
      createdAtReadable: now.toLocaleString(),
    });

    // Track all payments
    await redis.rpush("payments:all", paymentId);

    // Send Telegram notification
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const message = [
        `🛒 <b>NEW PURCHASE REQUEST</b>`,
        ``,
        `👤 <b>Account:</b> <code>${accessCode || "guest"}</code>`,
        `📦 <b>Package:</b> ${minutes} Minutes`,
        `💰 <b>Price:</b> ${price}`,
        `💎 <b>Crypto:</b> ${crypto}`,
        ``,
        `🔖 <b>Payment ID:</b> <code>${paymentId}</code>`,
        `🔗 <b>Transaction ID:</b> <code>${transactionId}</code>`,
        ``,
        `🕐 <b>Time:</b> ${now.toLocaleString()}`,
        ``,
        `⏳ <i>Waiting for payment confirmation...</i>`,
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

    return NextResponse.json({ paymentId, transactionId });
  } catch (error) {
    console.error("Notify error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}