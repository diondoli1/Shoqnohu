import { Router } from "express";
import { prisma } from "../db.js";
import type { AuthedRequest } from "../auth.js";
import { authMiddleware } from "../auth.js";
import { NotificationType } from "@prisma/client";
import { paramUsername } from "../param.js";
import { findUserByUsername } from "../userByUsername.js";

const router = Router();

/** People you follow (for messaging / “friends” picker). Optional ?q= to filter by name or username. */
router.get("/following", authMiddleware, async (req, res) => {
  const { id: me } = (req as AuthedRequest).user;
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";

  const follows = await prisma.follow.findMany({
    where: { followerId: me },
    include: {
      following: {
        select: { id: true, username: true, name: true, avatarUrl: true },
      },
    },
  });

  let users = follows.map((f) => f.following);
  if (q) {
    users = users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q))
    );
  }

  users.sort((a, b) => a.username.localeCompare(b.username));
  res.json(users);
});

router.post("/:username/follow", authMiddleware, async (req, res) => {
  const { id: me } = (req as AuthedRequest).user;
  const target = await findUserByUsername(paramUsername(req));
  if (!target || target.id === me) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: me, followingId: target.id } },
  });
  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    res.json({ following: false });
    return;
  }
  await prisma.follow.create({
    data: { followerId: me, followingId: target.id },
  });
  const follower = await prisma.user.findUnique({ where: { id: me } });
  await prisma.notification.create({
    data: {
      userId: target.id,
      type: NotificationType.FOLLOW,
      title: "New follower",
      body: `${follower?.username ?? "Someone"} started following you`,
      link: `/profile/${follower?.username ?? ""}`,
    },
  });
  res.json({ following: true });
});

router.get("/:username/status", authMiddleware, async (req, res) => {
  const { id: me } = (req as AuthedRequest).user;
  const target = await findUserByUsername(paramUsername(req));
  if (!target) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const f = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: me, followingId: target.id } },
  });
  res.json({ following: !!f });
});

export default router;
