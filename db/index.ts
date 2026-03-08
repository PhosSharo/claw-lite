import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Database connection setup for Railway PostgreSQL
 * 
 * Required environment variables:
 * - DATABASE_URL: PostgreSQL connection string from Railway
 * 
 * For Railway, the URL typically looks like:
 * postgresql://user:password@host:port/database?sslmode=require
 */

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not set");
    console.error("   Get the connection string from your Railway project dashboard");
}

// Parse Railway URL and ensure SSL is enabled
const getPoolConfig = () => {
    if (!DATABASE_URL) {
        return null;
    }

    // Railway requires SSL
    const url = new URL(DATABASE_URL);
    const sslMode = url.searchParams.get("sslmode") || url.searchParams.get("ssl");

    return {
        connectionString: DATABASE_URL,
        // Railway requires SSL - use 'require' if not specified
        ssl: sslMode ? true : { rejectUnauthorized: false },
        // Connection timeouts
        connectionTimeoutMillis: 10000,
        query_timeout: 30000,
        // Pool settings
        max: 10,
        idleTimeoutMillis: 30000,
    };
};

// Create pool lazily to avoid crashes on startup if DB not configured
let pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getPool(): Pool {
    if (!pool) {
        const config = getPoolConfig();
        if (!config) {
            throw new Error("DATABASE_URL is not configured");
        }
        pool = new Pool(config);

        pool.on("error", (err) => {
            console.error("Unexpected database pool error:", err);
        });

        pool.on("connect", () => {
            console.log("✅ Database connection established");
        });
    }
    return pool;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
    get(target, prop) {
        if (!_db) {
            _db = drizzle({ client: getPool(), schema });
        }
        return (_db as any)[prop];
    },
});

// Export schema for type access
export { schema };

// Helper to test database connection
export async function testConnection(): Promise<boolean> {
    try {
        const client = getPool();
        const result = await client.query("SELECT 1 as test");
        console.log("✅ Database connection test successful");
        return true;
    } catch (error) {
        console.error("❌ Database connection test failed:", error);
        return false;
    }
}
