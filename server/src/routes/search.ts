import { Router } from "express";
import { prisma } from "../db.js";
import type { AuthedRequest } from "../auth.js";
import { authMiddleware } from "../auth.js";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    res.json({ users: [], posts: [], events: [], groups: [] });
    return;
  }

  const [users, posts, events, groups] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        location: true,
      },
    }),
    prisma.post.findMany({
      where: { content: { contains: q, mode: "insensitive" } },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { username: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.event.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
    }),
    prisma.group.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
    }),
  ]);

  res.json({
    users,
    posts: posts.map((p) => ({
      id: p.id,
      snippet: p.content.slice(0, 160),
      mediaUrl: p.mediaUrl,
      author: p.author,
    })),
    events: events.map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt })),
    groups: groups.map((g) => ({ id: g.id, name: g.name })),
  });
});

export default router;
