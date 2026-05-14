import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ valid: false, error: "Missing token" });
    }

    const cleanToken = token.trim().toUpperCase();
    console.log("Validating token:", cleanToken);

    // Look up token
    const record = await redis.hgetall(`streaming_token:${cleanToken}`);
    console.log("Record found:", record ? Object.keys(record).length > 0 : false);

    if (!record || Object.keys(record).length === 0) {
      return NextResponse.json({
        valid: false,
        error: "Token not found",
      });
    }

    const rec = record as any;
    console.log("Token status:", rec.status);

    if (rec.status !== "active") {
      return NextResponse.json({
        valid: false,
        error: `Token is ${rec.status}`,
      });
    }

    const totalSeconds = Number(rec.totalSeconds);
    const usedSeconds = Number(rec.usedSeconds);

    // Parse keys safely
    let keys: string[] = [];
    const rawKeys = rec.keys;

    if (!rawKeys) {
      keys = [];
    } else if (typeof rawKeys === "string") {
      if (rawKeys.startsWith("[")) {
        try {
          keys = JSON.parse(rawKeys);
        } catch {
          keys = rawKeys.length > 0 ? [rawKeys] : [];
        }
      } else if (rawKeys.startsWith("dct")) {
        keys = [rawKeys];
      } else {
        try {
          keys = JSON.parse(rawKeys);
        } catch {
          keys = [];
        }
      }
    } else if (Array.isArray(rawKeys)) {
      keys = rawKeys;
    }

    console.log("Keys count:", keys.length);
    console.log("Total seconds:", totalSeconds);

    return NextResponse.json({
      valid: true,
      tokenInfo: {
        tokenId: cleanToken,
        totalSeconds,
        usedSeconds,
        keys,
        issuedAt: Number(rec.issuedAt || Date.now()),
      },
    });

  } catch (error) {
    console.error("Validate token error:", error);
    return NextResponse.json({ valid: false, error: "Server error" });
  }
}