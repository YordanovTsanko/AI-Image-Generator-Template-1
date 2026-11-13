import { createError } from "../errors.js";
import { generateImageBuffer } from "../services/cloudflareAI.js";

const MAX_PROMPT = 15000;

// Ако потребителят сам поиска рисунка/анимация/стил – не налагаме „снимка“
const STYLE_WORDS =
  /\b(cartoon|anime|manga|illustration|illustrated|drawing|sketch|painting|painted|watercolou?r|oil paint|pixel art|3d render|cgi|clay|comic|vector|logo|icon|disney|pixar|chibi|low ?poly|digital art|concept art)\b|анимац|рисун|карикатур|скица|аниме|картина/i;

// Описание като за истинска снимка от фотоапарат (без думи, които филтърът може да сметне за чувствителни)
const PHOTO_STYLE =
  "Realistic photograph taken with a professional DSLR camera, 35mm lens, natural daylight, " +
  "true-to-life colors, realistic textures and details, sharp focus, shallow depth of field, " +
  "documentary photography style, high resolution";

export const buildPhotoPrompt = (prompt) =>
  STYLE_WORDS.test(prompt) ? prompt : `${prompt.replace(/[.\s]+$/, "")}. ${PHOTO_STYLE}.`;

// POST /api/generateImage  { prompt } → { photo: "data:image/jpeg;base64,..." }
export const generateImage = async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || "").trim();
    if (!prompt) return next(createError(400, "Please write a prompt first."));
    if (prompt.length > MAX_PROMPT)
      return next(createError(400, `Prompt is too long (max ${MAX_PROMPT} characters).`));

    const started = Date.now();
    const photoPrompt = buildPhotoPrompt(prompt);
    let buffer;
    try {
      buffer = await generateImageBuffer(photoPrompt);
    } catch (err) {
      // Филтърът блокира разширения промпт → опитваме още веднъж само с оригиналния текст
      if (err.code !== "CF_NSFW" || photoPrompt === prompt) throw err;
      console.warn("↩️  Повторен опит без добавката за реалистична снимка…");
      buffer = await generateImageBuffer(prompt);
    }
    console.log(`🖼️  Generated image (${Math.round(buffer.length / 1024)} KB, ${Date.now() - started} ms)`);

    return res.status(200).json({
      success: true,
      photo: `data:image/jpeg;base64,${buffer.toString("base64")}`,
    });
  } catch (error) {
    next(error);
  }
};