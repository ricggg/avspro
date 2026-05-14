import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ success: false, error: "Missing code" });

    const record = await redis.hgetall(`access:${code}`);

    if (!record || Object.keys(record).length === 0) {
      return NextResponse.json({ success: false, error: "Invalid access code" });
    }

    const rec = record as any;

    // Check status field (new system)
    if (rec.status === "revoked") {
      return NextResponse.json({ success: false, error: "Access code has been revoked" });
    }
    if (rec.status === "blocked") {
      return NextResponse.json({ success: false, error: "Access code is blocked" });
    }

    // Check active field (old system)
    if (rec.active === "false") {
      return NextResponse.json({ success: false, error: "Access code has been revoked" });
    }

    // Check force logout
    if (rec.forceLogout === "true") {
      // Clear force logout flag after triggering
      await redis.hset(`access:${code}`, { forceLogout: "false" });
      return NextResponse.json({ success: false, error: "You have been logged out by admin" });
    }

    // Update last used
    const now = new Date();
    const useCount = (Number(rec.useCount) || 0) + 1;

    await redis.hset(`access:${code}`, {
      lastUsed: now.toISOString(),
      lastUsedReadable: now.toLocaleString(),
      useCount: String(useCount),
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set("avs_access", code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Verify access error:", error);
    return NextResponse.json({ success: false, error: "Server error" });
  }
}