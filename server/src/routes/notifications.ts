import { Router } from "express";
import { prisma } from "../db.js";
import type { AuthedRequest } from "../auth.js";
import { authMiddleware } from "../auth.js";
import { paramId } from "../param.js";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  const { id } = (req as AuthedRequest).user;
  const limit = Math.min(Number(req.query.limit) || 5, 20);
  const items = await prisma.notification.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json(items);
});

router.post("/:id/read", authMiddleware, async (req, res) => {
  const { id: userId } = (req as AuthedRequest).user;
  await prisma.notification.updateMany({
    where: { id: paramId(req), userId },
    data: { read: true },
  });
  res.json({ ok: true });
});

router.post("/read-all", authMiddleware, async (req, res) => {
  const { id } = (req as AuthedRequest).user;
  await prisma.notification.updateMany({
    where: { userId: id, read: false },
    data: { read: true },
  });
  res.json({ ok: true });
});

export default router;
