import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const paymentsPath = path.join(
  process.cwd(),
  "data/payments.json"
);

export async function POST(req: Request) {
  const { crypto } = await req.json();
  const paymentId = Date.now().toString();

  const data = JSON.parse(
    fs.readFileSync(paymentsPath, "utf-8")
  );

  data.payments.push({
    id: paymentId,
    crypto,
    status: "pending",
    apiKey: null,
  });

  fs.writeFileSync(
    paymentsPath,
    JSON.stringify(data, null, 2)
  );

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
}