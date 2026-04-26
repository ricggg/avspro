import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  const { paymentId } = await req.json();

  const data = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "data/payments.json"),
      "utf-8"
    )
  );

  const payment = data.payments.find(
    (p: any) => p.id === paymentId
  );

  if (!payment)
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );

  return NextResponse.json(payment);
}