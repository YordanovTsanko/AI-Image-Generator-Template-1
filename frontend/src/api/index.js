import axios from "axios";

// Празно = същия адрес (Vite proxy в dev, vercel.json rewrites в production)
const API = axios.create({ baseURL: import.meta.env.VITE_API_URL || "" });

// Единен формат на грешките: message + status + code (напр. CF_LIMIT)
const toError = (error) => {
  if (!error.response) {
    const e = new Error("Cannot reach the server. Make sure the backend is running on port 8080.");
    e.code = "NETWORK";
    return e;
  }
  const d = error.response.data || {};
  const e = new Error(d.message || d.error || `Request failed (${error.response.status})`);
  e.status = error.response.status;
  e.code = d.code;
  return e;
};

// Пълен URL към снимка (ако API-то е на друг домейн)
export const imageUrl = (path) =>
  path?.startsWith("/") && import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}${path}`
    : path;

export const getHealth = async (refresh = false) => {
  try {
    const res = await API.get("/api/health", { params: refresh ? { refresh: 1 } : {}, timeout: 20000 });
    return res.data;
  } catch (e) {
    throw toError(e);
  }
};

export const getPosts = async () => {
  try {
    const res = await API.get("/api/post");
    return res.data.data;
  } catch (e) {
    throw toError(e);
  }
};

export const generateImage = async (prompt) => {
  try {
    const res = await API.post("/api/generateImage", { prompt }, { timeout: 150000 });
    return res.data.photo;
  } catch (e) {
    throw toError(e);
  }
};

export const createPost = async (post) => {
  try {
    const res = await API.post("/api/post", { post });
    return res.data.data;
  } catch (e) {
    throw toError(e);
  }
};
