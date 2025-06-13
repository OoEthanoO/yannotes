import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL environment variable is not set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString,
});

pool.on("connect", () => {
  console.log("Connected to the Neon PostgreSQL database!");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client with Neon database", err);
  process.exit(-1);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

(async () => {
  try {
    const client = await pool.connect();
    console.log(
      "Successfully acquired client from Neon pool and tested connection."
    );
    const res = await client.query("SELECT NOW()");
    console.log("Neon PostgreSQL current time:", res.rows[0].now);
    client.release();
  } catch (err) {
    console.error(
      "Error connecting to Neon PostgreSQL or executing test query:",
      err
    );
  }
})();

export default pool;
