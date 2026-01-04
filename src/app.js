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

// Middlewares only. Handlers moved to index.js to allow route extension.
export { app };


