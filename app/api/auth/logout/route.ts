import { NextResponse } from "next/server";

import { CHANNEL_PULSE_SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.cookies.delete(CHANNEL_PULSE_SESSION_COOKIE);

  return response;
}
