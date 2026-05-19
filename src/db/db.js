import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
console.log("---------------db ---------------")
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);
