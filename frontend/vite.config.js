import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // /api заявките отиват към backend-а (порт 8080) – като "proxy" в старото CRA
    proxy: {
      "/api": { target: "http://localhost:8080", changeOrigin: true },
    },
  },
});
