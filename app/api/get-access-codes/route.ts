import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    const ids = await redis.lrange("access:all", 0, -1);

    if (!ids || ids.length === 0) {
      return NextResponse.json({ codes: [] });
    }

    const codes = await Promise.all(
      ids.map(async (id) => {
        const record = await redis.hgetall(`access:${id}`);
        if (!record || Object.keys(record).length === 0) {
          return {
            code: id,
            accessCode: id,
            label: "",
            note: "",
            status: "active",
            active: "true",
            createdAt: null,
            lastUsed: null,
            useCount: "0",
          };
        }
        const rec = record as any;
        // Normalize — always ensure both code and accessCode fields exist
        const codeVal = rec.code || rec.accessCode || id;
        return {
          ...rec,
          code: codeVal,
          accessCode: codeVal,
          status: rec.status || (rec.active === "true" ? "active" : "revoked"),
          active: rec.active || (rec.status === "active" ? "true" : "false"),
          label: rec.label || rec.note || "",
          note: rec.note || rec.label || "",
        };
      })
    );

    return NextResponse.json({ codes: codes.filter(Boolean) });
  } catch (error) {
    console.error("Get access codes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}