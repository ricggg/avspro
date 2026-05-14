import { NextResponse } from "next/server";
import type { NextRequest } from "next/request";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect dashboard and buy - NOT the root page
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/buy")) {
    const accessCode = request.cookies.get("avs_access")?.value;
    if (!accessCode) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/buy/:path*",
  ],
};