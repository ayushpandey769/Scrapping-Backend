import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

// TEMP DEBUG (remove later)
console.log("MONGODB_URI:", process.env.MONGODB_URI);