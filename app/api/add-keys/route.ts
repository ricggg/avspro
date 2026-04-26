import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const keysPath = path.join(
  process.cwd(),
  "data/api-keys.json"
);

export async function POST(req: Request) {
  const { keys } = await req.json();

  const data = JSON.parse(
    fs.readFileSync(keysPath, "utf-8")
  );

  const newKeys = keys
    .split(",")
    .map((k: string) => k.trim())
    .filter(
      (k: string) =>
        k.length > 5 &&
        !data.available.includes(k) &&
        !data.used.includes(k)
    );

  data.available.push(...newKeys);

  fs.writeFileSync(
    keysPath,
    JSON.stringify(data, null, 2)
  );

  return NextResponse.json({ success: true });
}