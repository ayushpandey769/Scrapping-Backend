import "./config/env.js";
import connectDB from "./DB/connectDB.js";
import { app } from "./app.js";

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ UNCAUGHT EXCEPTION! Shutting down...");
  console.error(error.name, error.message);
  console.error(error.stack);
  process.exit(1);
});

connectDB()
  .then(() => {
    const server = app.listen(process.env.PORT || 5000, () => {
      console.log(`Server is running at port: ${process.env.PORT}`);
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (error) => {
      console.error("❌ UNHANDLED REJECTION! Shutting down gracefully...");
      console.error(error.name, error.message);
      console.error(error.stack);
      
      server.close(() => {
        process.exit(1);
      });
    });
  })
  .catch((err) => {
    console.log("❌ MongoDB connection failed", err);
    process.exit(1);
  });

app.use("/data", (req, res) => {
  res.send("SIgisgfdbsgfius");
});
