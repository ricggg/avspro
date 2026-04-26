import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const data = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "data/api-keys.json"),
      "utf-8"
    )
  );
  return NextResponse.json(data);
}