import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import PostRouter from "./routes/Posts.js";
import GenerateImageRouter from "./routes/GenerateImage.js";
import { checkCloudflare, verifyCloudflare } from "./services/cloudflareAI.js";

dotenv.config({ quiet: true });

const app = express();
const port = parseInt(process.env.PORT, 10) || 8080;

app.disable("x-powered-by");
app.set("trust proxy", 1);

// CORS – отворен за всички адреси
app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"] }));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Маршрути
app.use("/api/post", PostRouter);
app.use("/api/generateImage", GenerateImageRouter);

// Състояние на сървъра, базата и връзката с Cloudflare AI (?refresh=1 → нова проверка)
app.get("/api/health", async (req, res, next) => {
  try {
    const cloudflare = await checkCloudflare({ force: req.query.refresh === "1" });
    res.status(200).json({
      success: true,
      db: ["disconnected", "connected", "connecting", "disconnecting"][mongoose.connection.readyState],
      cloudflare,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/", (req, res) => {
  res.status(200).json({ message: "AI Image Generator API is running" });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, status: 404, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Error handler – трябва да е СЛЕД маршрутите
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let status = Number(err.status || err.statusCode) || 500;
  let message = err.message || "Something went wrong";

  if (err.type === "entity.too.large") {
    status = 413;
    message = "Request is too large.";
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(" ");
  }
  if (status >= 500) console.error(`❌ [${req.method} ${req.originalUrl}]`, err.message);

  const code = typeof err.code === "string" ? err.code : undefined;
  return res.status(status).json({ success: false, status, code, message, error: message });
});

const startServer = async () => {
  if (!process.env.MONGODB_URL) {
    console.error("❌ Липсва MONGODB_URL в backend/.env");
    process.exit(1);
  }
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(process.env.MONGODB_URL, { serverSelectionTimeoutMS: 10000 });
    console.log("✅ Successfully connected to MongoDB");
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    console.error("   Провери MONGODB_URL и MongoDB Atlas → Network Access (добави своя IP или 0.0.0.0/0).");
    process.exit(1);
  }

  await verifyCloudflare();

  const server = app.listen(port, () => {
    console.log(`🚀 Server listening at http://localhost:${port}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await mongoose.connection.close().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

// Защита от сривове: логваме неочаквани грешки, вместо сървърът да падне тихо
process.on("unhandledRejection", (reason) => console.error("❌ Unhandled rejection:", reason));
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught exception:", err);
  process.exit(1);
});

if (process.env.NODE_ENV !== "test") startServer();

export default app;
