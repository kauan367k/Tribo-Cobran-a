import { defineConfig } from "drizzle-kit";
import path from "path";

function buildMigrationUrl(): string {
  if (process.env.SUPABASE_DB_PASSWORD) {
    const pwd = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
    return `postgresql://postgres.rudmspshxrvebwqbyaqx:${pwd}@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`;
  }
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  throw new Error("Either SUPABASE_DB_PASSWORD or DATABASE_URL must be set.");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: buildMigrationUrl(),
  },
});
