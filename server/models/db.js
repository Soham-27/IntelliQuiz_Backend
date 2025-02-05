import pkg from "pg"; // Use default import
const { Client } = pkg; // Destructure Client from the default import
import dotenv from "dotenv";

// // Load environment variables
// dotenv.config();

// Create a new client instance
const client = new Client({
  user: process.env.DB_USER || "neondb_owner",
  host:
    process.env.DB_HOST ||
    "ep-damp-block-a49x8n59-pooler.us-east-1.aws.neon.tech",
  database: process.env.DB_NAME || "neondb",
  password: process.env.DB_PASSWORD || "npg_Et45LjpbgqfN",
  port: 5432, // Default PostgreSQL port
  ssl: {
    rejectUnauthorized: false, // Use for secure connections (e.g., cloud DBs)
  },
});

// // Connect the client
async function connectToDatabase() {
  try {
    await client.connect(); // Establish connection
    console.log("Database connected!!!");
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
}

// // Export the client for reuse
export { client, connectToDatabase };
