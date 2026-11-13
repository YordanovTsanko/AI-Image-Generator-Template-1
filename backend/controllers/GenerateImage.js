import { createError } from "../errors.js";
import { generateImageBuffer } from "../services/cloudflareAI.js";

const MAX_PROMPT = 2048;

// POST /api/generateImage  { prompt } → { photo: "data:image/jpeg;base64,..." }
export const generateImage = async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || "").trim();
    if (!prompt) return next(createError(400, "Please write a prompt first."));
    if (prompt.length > MAX_PROMPT)
      return next(createError(400, `Prompt is too long (max ${MAX_PROMPT} characters).`));

    const started = Date.now();
    const buffer = await generateImageBuffer(prompt);
    console.log(`🖼️  Generated image (${Math.round(buffer.length / 1024)} KB, ${Date.now() - started} ms)`);

    return res.status(200).json({
      success: true,
      photo: `data:image/jpeg;base64,${buffer.toString("base64")}`,
    });
  } catch (error) {
    next(error);
  }
};
