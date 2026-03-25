import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import type { AuthedRequest } from "../auth.js";
import { authMiddleware } from "../auth.js";
import { paramUsername } from "../param.js";

const router = Router();

router.get("/me", authMiddleware, async (req, res) => {
  const { id } = (req as AuthedRequest).user;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      bio: true,
      location: true,
      interests: true,
      avatarUrl: true,
      coverUrl: true,
      privacyProfile: true,
      privacyPosts: true,
      createdAt: true,
    },
  });
  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(user);
});

router.get("/:username", async (req, res) => {
  const user = await prisma.user.findFirst({
    where: { username: { equals: paramUsername(req).trim(), mode: "insensitive" } },
    select: {
      id: true,
      username: true,
      name: true,
      bio: true,
      location: true,
      interests: true,
      avatarUrl: true,
      coverUrl: true,
      createdAt: true,
    },
  });
  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(user);
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(2000).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  interests: z.string().max(2000).optional().nullable(),
  avatarUrl: z.string().min(1).optional().nullable(),
  coverUrl: z.string().min(1).optional().nullable(),
  privacyProfile: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]).optional(),
  privacyPosts: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]).optional(),
});

router.patch("/me", authMiddleware, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { id } = (req as AuthedRequest).user;
  const user = await prisma.user.update({
    where: { id },
    data: parsed.data,
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      bio: true,
      location: true,
      interests: true,
      avatarUrl: true,
      coverUrl: true,
      privacyProfile: true,
      privacyPosts: true,
      createdAt: true,
    },
  });
  res.json(user);
});

export default router;
