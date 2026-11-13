import express from "express";
import rateLimit from "express-rate-limit";
import { generateImage } from "../controllers/GenerateImage.js";

const router = express.Router();

// Пази безплатния лимит на Cloudflare: до 20 генерирания на 10 минути от един IP
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, status: 429, message: "Too many images generated. Please wait a few minutes." },
});

router.post("/", limiter, generateImage);

export default router;
