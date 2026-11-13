import { createError } from "../errors.js";

const API =
  process.env.CLOUDFLARE_API_BASE || "https://api.cloudflare.com/client/v4";

const DEFAULT_MODEL = "@cf/black-forest-labs/flux-2-klein-9b";
const FALLBACK_MODEL = "@cf/black-forest-labs/flux-1-schnell";

const getToken = () => (process.env.CLOUDFLARE_API_TOKEN || "").trim();
const getModel = () =>
  (process.env.CLOUDFLARE_IMAGE_MODEL || DEFAULT_MODEL).trim();
const getSize = () => {
  const n = parseInt(process.env.CLOUDFLARE_IMAGE_SIZE, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 512), 1536) : 1024;
};
const getSteps = (model = getModel()) => {
  const n = parseInt(process.env.CLOUDFLARE_IMAGE_STEPS, 10);
  if (/flux-1-schnell/.test(model))
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), 8) : 8; // максимум 8
  if (/flux-2-dev/.test(model))
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), 50) : 28;
  if (/lucid-origin|phoenix/.test(model))
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), 40) : 30;
  return null; // flux-2-klein: стъпките са фиксирани от модела
};

// FLUX.2 моделите приемат само multipart/form-data
const isMultipart = (model) => /flux-2/.test(model);

/** Тялото на заявката според модела (всеки модел приема различни параметри). */
const buildBody = (model, prompt) => {
  const size = getSize();
  const steps = getSteps(model);

  if (isMultipart(model)) {
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("width", String(size));
    form.append("height", String(size));
    if (steps) form.append("steps", String(steps));
    return { body: form, headers: {} }; // fetch сам слага multipart boundary
  }

  let json;
  if (/flux-1-schnell/.test(model)) json = { prompt, steps };
  else if (/lucid-origin|phoenix/.test(model))
    json = { prompt, width: size, height: size, num_steps: steps };
  else json = { prompt };
  return {
    body: JSON.stringify(json),
    headers: { "Content-Type": "application/json" },
  };
};

let cachedAccountId = null;

const cfMessage = (body) =>
  body?.errors
    ?.map((e) => e.message)
    .filter(Boolean)
    .join("; ") || "";

// ---------------- Статус на връзката с Cloudflare ----------------
// status: "unknown" | "connected" | "limit" | "error"
const state = {
  activeModel: null,
  status: "unknown",
  message: "",
  accountName: "",
  checkedAt: null,
  limitUntil: null,
};

// Безплатният дневен лимит на Workers AI се нулира в 00:00 UTC
const nextUtcMidnight = () => {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
};

const isLimitError = (status, msg) =>
  /neuron|daily free allocation|allocation|quota/i.test(msg) ||
  (status === 429 && !/capacity/i.test(msg));

const markConnected = () => {
  state.status = "connected";
  state.message = "";
  state.limitUntil = null;
  state.checkedAt = new Date().toISOString();
};
const markLimit = (msg) => {
  state.status = "limit";
  state.message = msg || "Daily limit reached";
  state.limitUntil = nextUtcMidnight();
  state.checkedAt = new Date().toISOString();
};
const markError = (msg) => {
  state.status = "error";
  state.message = msg;
  state.checkedAt = new Date().toISOString();
};

export const getCloudflareStatus = () => ({
  ...state,
  model: state.activeModel || getModel(),
  steps: getSteps(state.activeModel || getModel()),
});

/** ID на акаунта – от .env или автоматично чрез токена. */
export const getAccountId = async () => {
  const fromEnv = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  if (fromEnv) return fromEnv;
  if (cachedAccountId) return cachedAccountId;

  const res = await fetch(`${API}/accounts?per_page=5`, {
    headers: { Authorization: `Bearer ${getToken()}` },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => ({}));
  const account = body?.result?.[0];
  if (!res.ok || !account?.id) {
    throw createError(
      500,
      "Cannot detect Cloudflare Account ID. Add CLOUDFLARE_ACCOUNT_ID to backend/.env " +
        `(Cloudflare Dashboard → Workers AI → Use REST API). ${cfMessage(body)}`.trim(),
      "CF_ACCOUNT",
    );
  }
  cachedAccountId = account.id;
  state.accountName = account.name || "";
  console.log(`☁️  Cloudflare акаунт: ${account.name || ""} (${account.id})`);
  return cachedAccountId;
};

/**
 * Проверява връзката (без да харчи от лимита).
 * Резултатът се кешира за 60 секунди; при изчерпан лимит – до нулирането му.
 */
export const checkCloudflare = async ({ force = false } = {}) => {
  if (!getToken()) {
    markError("CLOUDFLARE_API_TOKEN is missing in backend/.env");
    return getCloudflareStatus();
  }
  if (
    state.status === "limit" &&
    state.limitUntil &&
    Date.now() < Date.parse(state.limitUntil)
  ) {
    return getCloudflareStatus();
  }
  if (
    !force &&
    state.checkedAt &&
    Date.now() - Date.parse(state.checkedAt) < 60_000
  ) {
    return getCloudflareStatus();
  }

  try {
    const accountId = await getAccountId();
    const res = await fetch(
      `${API}/accounts/${accountId}/ai/models/search?per_page=1&search=flux`,
      {
        headers: { Authorization: `Bearer ${getToken()}` },
        signal: AbortSignal.timeout(15_000),
      },
    );
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.success !== false) markConnected();
    else if (res.status === 401 || res.status === 403)
      markError(
        `Invalid token or missing "Workers AI" permission. ${cfMessage(body)}`.trim(),
      );
    else
      markError(cfMessage(body) || `Cloudflare responded with ${res.status}`);
  } catch (err) {
    markError(
      err.name === "TimeoutError"
        ? "Cloudflare did not respond in time"
        : err.message,
    );
  }
  return getCloudflareStatus();
};

/** Проверка при стартиране – само логва, не спира сървъра. */
export const verifyCloudflare = async () => {
  const s = await checkCloudflare({ force: true });
  if (s.status === "connected")
    console.log(
      `🎨 Cloudflare AI: свързан · ${s.model} · ${getSize()}x${getSize()}`,
    );
  else console.error(`❌ Cloudflare AI: ${s.message}`);
};

// Моделът не съществува / няма достъп до него → пробваме резервния
const isModelUnavailable = (status, msg) =>
  (status === 400 || status === 404) &&
  /no such model|model not found|not found|does not exist|not available|unknown model|5007/i.test(
    msg,
  );

/** Една заявка към конкретен модел. */
const runModel = async (accountId, model, prompt) => {
  const { body, headers } = buildBody(model, prompt);
  let res;
  try {
    res = await fetch(`${API}/accounts/${accountId}/ai/run/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}`, ...headers },
      body,
      signal: AbortSignal.timeout(150_000),
    });
  } catch (err) {
    if (err.name === "TimeoutError")
      throw createError(
        504,
        "Cloudflare AI did not respond in time. Try again.",
        "CF_TIMEOUT",
      );
    markError(`Cannot reach Cloudflare: ${err.message}`);
    throw createError(
      502,
      `Cannot reach Cloudflare AI: ${err.message}`,
      "CF_NETWORK",
    );
  }

  const contentType = res.headers.get("content-type") || "";
  // Някои модели връщат директно изображение (binary)
  if (res.ok && contentType.startsWith("image/"))
    return { buffer: Buffer.from(await res.arrayBuffer()) };

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false)
    return { status: res.status, msg: cfMessage(json) || res.statusText };

  const b64 = json?.result?.image;
  if (!b64)
    throw createError(502, "Cloudflare AI returned no image.", "CF_EMPTY");
  return { buffer: Buffer.from(b64, "base64") };
};

/** Генерира снимка и връща JPEG като Buffer. */
export const generateImageBuffer = async (prompt) => {
  if (!getToken())
    throw createError(
      500,
      "CLOUDFLARE_API_TOKEN is missing in backend/.env",
      "CF_TOKEN",
    );

  let accountId;
  try {
    accountId = await getAccountId();
  } catch (err) {
    markError(err.message);
    throw err;
  }

  const models = [...new Set([getModel(), FALLBACK_MODEL])];
  let result;
  for (const model of models) {
    result = await runModel(accountId, model, prompt);
    if (result.buffer) {
      state.activeModel = model;
      markConnected();
      return result.buffer;
    }
    if (
      isModelUnavailable(result.status, result.msg) &&
      model !== models[models.length - 1]
    ) {
      console.warn(
        `⚠️  Моделът ${model} не е достъпен (${result.msg}) – превключвам към ${FALLBACK_MODEL}`,
      );
      continue;
    }
    break;
  }

  const { status, msg } = result;
  if (status === 401 || status === 403) {
    markError(
      `Invalid token or missing "Workers AI" permission. ${msg}`.trim(),
    );
    throw createError(
      502,
      `Invalid Cloudflare token or missing "Workers AI" permission. ${msg}`.trim(),
      "CF_AUTH",
    );
  }
  if (isLimitError(status, msg)) {
    markLimit(msg);
    throw createError(
      429,
      "The daily Cloudflare AI limit has been reached. It resets every day at 00:00 UTC.",
      "CF_LIMIT",
    );
  }
  if (/capacity/i.test(msg))
    throw createError(
      503,
      "Cloudflare AI is busy right now. Try again in a moment.",
      "CF_BUSY",
    );
  if (/nsfw|safety|flagged/i.test(msg)) {
    throw createError(
      400,
      `The prompt was blocked by the Cloudflare safety filter (${msg}). Try a different prompt.`,
      "CF_NSFW",
    );
  }
  throw createError(502, `Cloudflare AI error: ${msg}`, "CF_ERROR");
};
