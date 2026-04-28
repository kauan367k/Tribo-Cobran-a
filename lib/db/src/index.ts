import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function buildConnectionString(): string {
  if (process.env.SUPABASE_DB_PASSWORD) {
    const pwd = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
    return `postgresql://postgres.rudmspshxrvebwqbyaqx:${pwd}@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
  }
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  throw new Error(
    "Either SUPABASE_DB_PASSWORD or DATABASE_URL must be set.",
  );
}

export const pool = new Pool({ connectionString: buildConnectionString() });
export const db = drizzle(pool, { schema });

export * from "./schema";
