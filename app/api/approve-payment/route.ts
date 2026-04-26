import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const paymentsPath = path.join(
  process.cwd(),
  "data/payments.json"
);
const keysPath = path.join(
  process.cwd(),
  "data/api-keys.json"
);

export async function POST(req: Request) {
  const { paymentId } = await req.json();

  const payments = JSON.parse(
    fs.readFileSync(paymentsPath, "utf-8")
  );
  const keys = JSON.parse(
    fs.readFileSync(keysPath, "utf-8")
  );

  const payment = payments.payments.find(
    (p: any) => p.id === paymentId
  );

  if (!payment)
    return NextResponse.json({ error: "Not found" });
  if (keys.available.length === 0)
    return NextResponse.json({ error: "No keys available" });

  const key = keys.available.shift();
  keys.used.push(key);
  payment.status = "approved";
  payment.apiKey = key;

  fs.writeFileSync(
    paymentsPath,
    JSON.stringify(payments, null, 2)
  );
  fs.writeFileSync(
    keysPath,
    JSON.stringify(keys, null, 2)
  );

  return NextResponse.json({ success: true });
}