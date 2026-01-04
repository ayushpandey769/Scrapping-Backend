import express from "express";
import cors from "cors";
import { apiError } from "./utils/apiError.js";

const app = express();

app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true
}));

import router from "./routes/routes.js";
app.use("/api/v1", router);

// 404 Handler - for undefined routes
app.use((req, res, next) => {
  res.status(404).json(
    new apiError(404, `Route ${req.originalUrl} not found`)
  );
});

// Global Error Handler - catches all errors
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json(
    new apiError(
      statusCode,
      message,
      err.errors || []
    )
  );
});

export { app };
