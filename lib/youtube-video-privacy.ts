export type VideoPrivacyStatus = "public" | "unlisted" | "private" | "unknown";

export function normalizeVideoPrivacyStatus(value: string | null | undefined): VideoPrivacyStatus {
  if (value === "public" || value === "unlisted" || value === "private") {
    return value;
  }

  return "unknown";
}

export function isPublicVideoPrivacyStatus(value: string | null | undefined) {
  return normalizeVideoPrivacyStatus(value) === "public";
}
