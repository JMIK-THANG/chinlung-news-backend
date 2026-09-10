import "dotenv/config";
import { readFile } from "node:fs/promises";
import pg from "pg";

const databaseName = "news_app";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing from .env.");
  process.exit(1);
}

const applicationUrl = new URL(process.env.DATABASE_URL);
const maintenanceUrl = new URL(process.env.DATABASE_URL);
maintenanceUrl.pathname = "/postgres";

const maintenancePool = new pg.Pool({ connectionString: maintenanceUrl.toString() });

try {
  const existingDatabase = await maintenancePool.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [databaseName],
  );

  if (existingDatabase.rowCount === 0) {
    await maintenancePool.query(`CREATE DATABASE ${databaseName}`);
    console.log(`Created database: ${databaseName}`);
  } else {
    console.log(`Database already exists: ${databaseName}`);
  }
} finally {
  await maintenancePool.end();
}

applicationUrl.pathname = `/${databaseName}`;
const applicationPool = new pg.Pool({ connectionString: applicationUrl.toString() });

try {
  const schema = await readFile(new URL("../sql/schema.sql", import.meta.url), "utf8");
  await applicationPool.query(schema);
  console.log("Created or verified tables: news_articles, admin_users");
} finally {
  await applicationPool.end();
}
