import dotenv from "dotenv";
dotenv.config();

/** Comma-separated list, e.g. http://localhost:5173,http://192.168.1.5:5173 for LAN demos */
function parseClientOrigins(): string[] {
  const raw = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  clientOrigins: parseClientOrigins(),
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
};
