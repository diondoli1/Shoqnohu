import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import type { AuthedRequest } from "../auth.js";
import { authMiddleware } from "../auth.js";
import { NotificationType } from "@prisma/client";
import { paramId } from "../param.js";

const router = Router();

router.get("/conversations", authMiddleware, async (req, res) => {
  const { id: userId } = (req as AuthedRequest).user;
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";

  const parts = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          group: { select: { id: true, name: true } },
          participants: {
            include: {
              user: {
                select: { id: true, username: true, name: true, avatarUrl: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: { select: { id: true, username: true } },
            },
          },
        },
      },
    },
  });

  let list = parts.map((p) => {
    const grp = p.conversation.group;
    const other = grp
      ? undefined
      : p.conversation.participants.find((x) => x.userId !== userId)?.user;
    const last = p.conversation.messages[0];
    return {
      id: p.conversation.id,
      other,
      group: grp,
      lastMessage: last
        ? { content: last.content, createdAt: last.createdAt, senderId: last.senderId }
        : null,
      updatedAt: p.conversation.updatedAt,
    };
  });

  if (q) {
    list = list.filter(
      (c) =>
        (c.group && c.group.name.toLowerCase().includes(q)) ||
        c.other?.username.toLowerCase().includes(q) ||
        (c.other?.name && c.other.name.toLowerCase().includes(q)) ||
        c.lastMessage?.content.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  res.json(list);
});

router.post("/conversations", authMiddleware, async (req, res) => {
  const schema = z.object({ userId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { id: me } = (req as AuthedRequest).user;
  const otherId = parsed.data.userId;
  if (otherId === me) {
    res.status(400).json({ error: "Cannot message yourself" });
    return;
  }

  const candidates = await prisma.conversation.findMany({
    where: {
      AND: [
        { participants: { some: { userId: me } } },
        { participants: { some: { userId: otherId } } },
      ],
    },
    include: { participants: true },
  });
  const pair = candidates.find((c) => c.participants.length === 2);
  let conversationId = pair?.id;

  if (!conversationId) {
    const conv = await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: me }, { userId: otherId }],
        },
      },
    });
    conversationId = conv.id;
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: { select: { id: true, username: true, name: true, avatarUrl: true } },
        },
      },
    },
  });

  res.status(201).json({ id: conversation!.id, participants: conversation!.participants });
});

router.get("/conversations/:id/messages", authMiddleware, async (req, res) => {
  const { id: userId } = (req as AuthedRequest).user;
  const cid = paramId(req);
  const member = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId: cid, userId },
    },
  });
  if (!member) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const messages = await prisma.message.findMany({
    where: { conversationId: cid },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, username: true, name: true, avatarUrl: true } },
    },
  });
  res.json(messages);
});

const sendSchema = z.object({
  content: z.string().min(1).max(8000),
});

router.post("/conversations/:id/messages", authMiddleware, async (req, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { id: userId } = (req as AuthedRequest).user;
  const convId = paramId(req);
  const member = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: convId, userId } },
  });
  if (!member) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const others = await prisma.conversationParticipant.findMany({
    where: { conversationId: convId, userId: { not: userId } },
  });
  const msg = await prisma.message.create({
    data: {
      conversationId: convId,
      senderId: userId,
      content: parsed.data.content,
    },
    include: {
      sender: { select: { id: true, username: true, name: true, avatarUrl: true } },
    },
  });
  await prisma.conversation.update({
    where: { id: convId },
    data: { updatedAt: new Date() },
  });
  for (const o of others) {
    await prisma.notification.create({
      data: {
        userId: o.userId,
        type: NotificationType.MESSAGE,
        title: "New message",
        body: msg.content.slice(0, 120),
        link: `/messages?c=${convId}`,
      },
    });
  }
  res.status(201).json(msg);
});

export default router;
