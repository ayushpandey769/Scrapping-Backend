import "./config/env.js";
import connectDB from "./DB/connectDB.js";
import { app } from "./app.js";
import mongoose from "mongoose";

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ UNCAUGHT EXCEPTION! Shutting down...");
  console.error(error.name, error.message);
  console.error(error.stack);
  process.exit(1);
});

const PORT = process.env.PORT || 5000;

// Start Server IMMEDIATELY to satisfy Render Health Check
const server = app.listen(PORT, () => {
  console.log(`🚀 Server is running at port: ${PORT}`);
});

// Health check endpoint (Render uses / by default, but good to have)
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Connecting/Disconnected";
  res.status(200).json({ status: "OK", db: dbStatus });
});

app.use("/data", (req, res) => {
  res.send("SIgisgfdbsgfius");
});

// Import error class properly if needed, or define inline
import { apiError } from "./utils/apiError.js";

// 404 Handler (Must be last route)
app.use((req, res, next) => {
  res.status(404).json(new apiError(404, `Route ${req.originalUrl} not found`));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  res.status(statusCode).json(new apiError(statusCode, message, err.errors || []));
});


// Connect to DB in background
console.log("⏳ Connecting to MongoDB...");
connectDB()
  .then(() => {
    console.log("✅ MongoDB Connected successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    // Don't exit process, just log. Or maybe exit if critical?
    // For now, let's keep it alive so we can see logs.
  });

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("❌ UNHANDLED REJECTION! Shutting down gracefully...");
  console.error(error.name, error.message);
  server.close(() => {
    process.exit(1);
  });
});

