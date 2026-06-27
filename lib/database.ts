import { createTursoAdminClient } from "@/lib/turso-admin-client";

export function createDatabaseAdminClient(): any {
  const tursoDatabaseUrl = process.env.TURSO_DATABASE_URL;
  if (!tursoDatabaseUrl) {
    throw new Error("Missing environment variable: TURSO_DATABASE_URL");
  }

  return createTursoAdminClient(tursoDatabaseUrl, process.env.TURSO_AUTH_TOKEN);
}
