import express from "express";
import "express-async-errors";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import eventRoutes from "./routes/events.js";
import groupRoutes from "./routes/groups.js";
import notificationRoutes from "./routes/notifications.js";
import messageRoutes from "./routes/messages.js";
import searchRoutes from "./routes/search.js";
import followRoutes from "./routes/follows.js";
import uploadRoutes from "./routes/upload.js";
import supportRoutes from "./routes/support.js";
import { Prisma } from "@prisma/client";
import { prisma } from "./db.js";

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use("/uploads", express.static(path.resolve(config.uploadDir)));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/support", supportRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error("[Prisma]", err.code, err.meta);
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error("[Prisma validation]", err.message);
  }
  res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, () => {
  void prisma.$connect().then(
    () => {
      console.log(`Shoqnohu API listening on http://localhost:${config.port}`);
    },
    (err) => {
      console.error("Failed to connect to the database. Check DATABASE_URL and that PostgreSQL is running.\n", err);
      process.exit(1);
    }
  );
});
