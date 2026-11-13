# AI Image Generator

MERN приложение за генериране на снимки с изкуствен интелект и споделяне в общностна галерия.

- **Генериране:** Cloudflare Workers AI – модел `@cf/black-forest-labs/flux-1-schnell`
- **Backend:** Node.js · Express · Mongoose (MongoDB)
- **Frontend:** React (Vite) · styled-components · MUI

Снимките се пазят директно в MongoDB, затова не е нужен Cloudinary.

---

## 🚀 Стартиране

Изисквания: **Node.js 20.19+**

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Конфигурацията е в `backend/.env` (шаблон: `.env.example`):

```env
PORT=8080
MONGODB_URL=mongodb+srv://...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=        # по избор – открива се автоматично от токена
```

Ако в конзолата излезе „Неуспешно откриване на Cloudflare Account ID“, копирай Account ID от
**Cloudflare Dashboard → Workers AI → Use REST API** и го сложи в `CLOUDFLARE_ACCOUNT_ID`.

### 2. Frontend (в нов терминал)

```bash
cd frontend
npm install
npm run dev
```

Отвори **http://localhost:3000**

---

## 🌐 API

| Метод | Маршрут | Описание |
|---|---|---|
| `POST` | `/api/generateImage` | `{ "prompt": "..." }` → `{ "photo": "data:image/jpeg;base64,..." }` |
| `GET` | `/api/post` | Всички публикации (най-новите първи) |
| `POST` | `/api/post` | `{ "post": { "name", "prompt", "photo" } }` – записва снимката в MongoDB |
| `GET` | `/api/post/:id/image` | Самата снимка (JPEG) |
| `GET` | `/api/health` | Състояние на сървъра и базата |

---

## 🧰 Проблеми

| Проблем | Решение |
|---|---|
| `Failed to connect to MongoDB` | MongoDB Atlas → **Network Access** → добави своя IP (или `0.0.0.0/0`) |
| `Invalid Cloudflare token or missing "Workers AI" permission` | Токенът трябва да има право **Workers AI → Read/Edit** |
| `Cloudflare AI daily limit reached` | Безплатният дневен лимит на Workers AI е изчерпан – опитай утре |
| `blocked by the safety filter` | Промптът е спрян от филтъра за съдържание – промени го |

---

## 📦 Production (Vercel + Render)

`frontend/vercel.json` пренасочва `/api/*` към backend-а. Смени адреса там с адреса на твоя backend.
Ако API-то е на друг домейн без rewrite, задай `VITE_API_URL=https://твоят-backend` преди `npm run build`.
