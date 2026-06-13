import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CHANNEL_PULSE_SESSION_COOKIE, getSessionAccount, sanitizeNextPath } from "@/lib/auth";

export async function getCurrentAccount() {
  const cookieStore = await cookies();
  return getSessionAccount(cookieStore.get(CHANNEL_PULSE_SESSION_COOKIE)?.value);
}

export async function requireCurrentAccount(nextPath = "/") {
  const account = await getCurrentAccount();
  if (!account) {
    redirect(`/login?next=${encodeURIComponent(sanitizeNextPath(nextPath))}`);
  }

  return account;
}
