import fs from "fs";
import path from "path";
import multer from "multer";
import { config } from "./config.js";

const dir = path.resolve(config.uploadDir);
fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".bin";
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
});

export function publicUrlForFile(filename: string): string {
  return `/uploads/${filename}`;
}
