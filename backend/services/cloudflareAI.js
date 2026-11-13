import { createError } from "../errors.js";

const API = process.env.CLOUDFLARE_API_BASE || "https://api.cloudflare.com/client/v4";

const getToken = () => (process.env.CLOUDFLARE_API_TOKEN || "").trim();
const getModel = () =>
  (process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell").trim();
const getSteps = () => {
  const n = parseInt(process.env.CLOUDFLARE_IMAGE_STEPS, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 8) : 8; // flux-1-schnell: максимум 8
};

let cachedAccountId = null;

const cfMessage = (body) =>
  body?.errors?.map((e) => e.message).filter(Boolean).join("; ") || "";

// ---------------- Статус на връзката с Cloudflare ----------------
// status: "unknown" | "connected" | "limit" | "error"
const state = {
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
  model: getModel(),
  steps: getSteps(),
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
      "CF_ACCOUNT"
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
  if (state.status === "limit" && state.limitUntil && Date.now() < Date.parse(state.limitUntil)) {
    return getCloudflareStatus();
  }
  if (!force && state.checkedAt && Date.now() - Date.parse(state.checkedAt) < 60_000) {
    return getCloudflareStatus();
  }

  try {
    const accountId = await getAccountId();
    const res = await fetch(`${API}/accounts/${accountId}/ai/models/search?per_page=1&search=flux`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.success !== false) markConnected();
    else if (res.status === 401 || res.status === 403)
      markError(`Invalid token or missing "Workers AI" permission. ${cfMessage(body)}`.trim());
    else markError(cfMessage(body) || `Cloudflare responded with ${res.status}`);
  } catch (err) {
    markError(err.name === "TimeoutError" ? "Cloudflare did not respond in time" : err.message);
  }
  return getCloudflareStatus();
};

/** Проверка при стартиране – само логва, не спира сървъра. */
export const verifyCloudflare = async () => {
  const s = await checkCloudflare({ force: true });
  if (s.status === "connected") console.log(`🎨 Cloudflare AI: свързан · ${s.model} (${s.steps} стъпки)`);
  else console.error(`❌ Cloudflare AI: ${s.message}`);
};

/** Генерира снимка и връща JPEG като Buffer. */
export const generateImageBuffer = async (prompt) => {
  if (!getToken()) throw createError(500, "CLOUDFLARE_API_TOKEN is missing in backend/.env", "CF_TOKEN");

  let accountId;
  try {
    accountId = await getAccountId();
  } catch (err) {
    markError(err.message);
    throw err;
  }

  let res;
  try {
    res = await fetch(`${API}/accounts/${accountId}/ai/run/${getModel()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      // flux-1-schnell приема само prompt и steps
      body: JSON.stringify({ prompt, steps: getSteps() }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    if (err.name === "TimeoutError")
      throw createError(504, "Cloudflare AI did not respond in time. Try again.", "CF_TIMEOUT");
    markError(`Cannot reach Cloudflare: ${err.message}`);
    throw createError(502, `Cannot reach Cloudflare AI: ${err.message}`, "CF_NETWORK");
  }

  const contentType = res.headers.get("content-type") || "";

  // Някои модели връщат директно изображение (binary)
  if (res.ok && contentType.startsWith("image/")) {
    markConnected();
    return Buffer.from(await res.arrayBuffer());
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    const msg = cfMessage(body);
    if (res.status === 401 || res.status === 403) {
      markError(`Invalid token or missing "Workers AI" permission. ${msg}`.trim());
      throw createError(502, `Invalid Cloudflare token or missing "Workers AI" permission. ${msg}`.trim(), "CF_AUTH");
    }
    if (isLimitError(res.status, msg)) {
      markLimit(msg);
      throw createError(
        429,
        "The daily Cloudflare AI limit has been reached. It resets every day at 00:00 UTC.",
        "CF_LIMIT"
      );
    }
    if (/capacity/i.test(msg))
      throw createError(503, "Cloudflare AI is busy right now. Try again in a moment.", "CF_BUSY");
    if (/nsfw|safety|flagged/i.test(msg))
      throw createError(400, "The prompt was blocked by the safety filter. Try a different prompt.", "CF_NSFW");
    throw createError(502, `Cloudflare AI error: ${msg || res.statusText}`, "CF_ERROR");
  }

  const b64 = body?.result?.image;
  if (!b64) throw createError(502, "Cloudflare AI returned no image.", "CF_EMPTY");
  markConnected();
  return Buffer.from(b64, "base64");
};
