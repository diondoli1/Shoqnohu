import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import type { AuthedRequest } from "../auth.js";
import { authMiddleware } from "../auth.js";
import { NotificationType } from "@prisma/client";
import { paramId, paramUsername } from "../param.js";
import { findUserByUsername } from "../userByUsername.js";

const router = Router();

function parseHashtags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 20);
}

const createPostSchema = z.object({
  content: z.string().min(1).max(8000),
  hashtags: z.string().optional(),
  mediaUrl: z.string().min(1).optional().nullable(),
});

router.post("/", authMiddleware, async (req, res) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { id } = (req as AuthedRequest).user;
  const tags = parseHashtags(parsed.data.hashtags);
  const post = await prisma.post.create({
    data: {
      authorId: id,
      content: parsed.data.content,
      mediaUrl: parsed.data.mediaUrl ?? undefined,
      tags: {
        create: tags.map((tag) => ({ tag })),
      },
    },
    include: {
      author: {
        select: { id: true, username: true, name: true, avatarUrl: true },
      },
      tags: true,
      likes: { where: { userId: id }, select: { id: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });
  res.status(201).json(mapPost(post, id));
});

router.get("/feed", authMiddleware, async (req, res) => {
  const { id } = (req as AuthedRequest).user;
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const take = Math.min(Number(req.query.limit) || 10, 50);

  const following = await prisma.follow.findMany({
    where: { followerId: id },
    select: { followingId: true },
  });
  const ids = [id, ...following.map((f) => f.followingId)];

  const posts = await prisma.post.findMany({
    where: { authorId: { in: ids } },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { id: true, username: true, name: true, avatarUrl: true },
      },
      tags: true,
      likes: { where: { userId: id }, select: { id: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  let nextCursor: string | null = null;
  let list = posts;
  if (posts.length > take) {
    const next = posts.pop()!;
    nextCursor = next.id;
    list = posts;
  }

  res.json({
    items: list.map((p) => mapPost(p, id)),
    nextCursor,
  });
});

router.get("/user/:username", authMiddleware, async (req, res) => {
  const { id: viewerId } = (req as AuthedRequest).user;
  const uname = paramUsername(req);
  const target = await findUserByUsername(uname);
  if (!target) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const take = Math.min(Number(req.query.limit) || 20, 50);

  const posts = await prisma.post.findMany({
    where: { authorId: target.id },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: { id: true, username: true, name: true, avatarUrl: true },
      },
      tags: true,
      likes: { where: { userId: viewerId }, select: { id: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  let nextCursor: string | null = null;
  let list = posts;
  if (posts.length > take) {
    const next = posts.pop()!;
    nextCursor = next.id;
    list = posts;
  }

  res.json({
    items: list.map((p) => mapPost(p, viewerId)),
    nextCursor,
  });
});

router.get("/:id", authMiddleware, async (req, res) => {
  const { id: userId } = (req as AuthedRequest).user;
  const post = await prisma.post.findUnique({
    where: { id: paramId(req) },
    include: {
      author: {
        select: { id: true, username: true, name: true, avatarUrl: true },
      },
      tags: true,
      likes: { where: { userId }, select: { id: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(mapPost(post, userId));
});

const commentSchema = z
  .object({
    content: z.string().max(2000).optional().default(""),
    mediaUrl: z.string().min(1).optional().nullable(),
  })
  .refine((d) => d.content.trim().length > 0 || Boolean(d.mediaUrl?.trim()), {
    message: "Add text or an image",
  });

router.post("/:id/comments", authMiddleware, async (req, res) => {
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { id: userId } = (req as AuthedRequest).user;
  const post = await prisma.post.findUnique({ where: { id: paramId(req) } });
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const comment = await prisma.comment.create({
    data: {
      postId: post.id,
      userId,
      content: parsed.data.content.trim(),
      mediaUrl: parsed.data.mediaUrl ?? undefined,
    },
    include: {
      user: { select: { id: true, username: true, name: true, avatarUrl: true } },
    },
  });
  if (post.authorId !== userId) {
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: NotificationType.COMMENT,
        title: "New comment",
        body: `${comment.user.username} commented on your post`,
        link: `/feed#post-${post.id}`,
      },
    });
  }
  res.status(201).json(comment);
});

router.get("/:id/comments", authMiddleware, async (req, res) => {
  const comments = await prisma.comment.findMany({
    where: { postId: paramId(req) },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, username: true, name: true, avatarUrl: true } },
    },
  });
  res.json(comments);
});

router.post("/:id/like", authMiddleware, async (req, res) => {
  const { id: userId } = (req as AuthedRequest).user;
  const post = await prisma.post.findUnique({ where: { id: paramId(req) } });
  if (!post) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId: post.id, userId } },
  });
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    const count = await prisma.like.count({ where: { postId: post.id } });
    res.json({ liked: false, likeCount: count });
    return;
  }
  await prisma.like.create({
    data: { postId: post.id, userId },
  });
  if (post.authorId !== userId) {
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: NotificationType.LIKE,
        title: "New like",
        body: `Someone liked your post`,
        link: `/feed#post-${post.id}`,
      },
    });
  }
  const count = await prisma.like.count({ where: { postId: post.id } });
  res.json({ liked: true, likeCount: count });
});

function mapPost(
  post: {
    id: string;
    content: string;
    mediaUrl: string | null;
    createdAt: Date;
    author: { id: string; username: string; name: string | null; avatarUrl: string | null };
    tags: { tag: string }[];
    likes: { id: string }[];
    _count: { likes: number; comments: number };
  },
  currentUserId: string
) {
  return {
    id: post.id,
    content: post.content,
    mediaUrl: post.mediaUrl,
    createdAt: post.createdAt,
    author: post.author,
    hashtags: post.tags.map((t) => t.tag),
    liked: post.likes.length > 0,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    isOwn: post.author.id === currentUserId,
  };
}

export default router;
