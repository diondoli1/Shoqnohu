import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import type { AuthedRequest } from "../auth.js";
import { authMiddleware } from "../auth.js";
import { GroupPrivacy } from "@prisma/client";
import { paramId } from "../param.js";

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(5000).optional().nullable(),
  category: z.string().max(80).optional().nullable(),
  privacy: z.enum(["PUBLIC", "PRIVATE"]),
});

/** One conversation per group; all members are participants. Creates or repairs links. */
async function ensureGroupConversation(groupId: string): Promise<string | null> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      conversation: true,
      members: { select: { userId: true } },
    },
  });
  if (!group) return null;

  if (group.conversation) {
    const convId = group.conversation.id;
    const existing = await prisma.conversationParticipant.findMany({
      where: { conversationId: convId },
      select: { userId: true },
    });
    const have = new Set(existing.map((e) => e.userId));
    const toAdd = group.members.filter((m) => !have.has(m.userId));
    if (toAdd.length > 0) {
      await prisma.conversationParticipant.createMany({
        data: toAdd.map((m) => ({ conversationId: convId, userId: m.userId })),
        skipDuplicates: true,
      });
    }
    return convId;
  }

  if (group.members.length === 0) return null;

  const conv = await prisma.conversation.create({
    data: {
      groupId: group.id,
      participants: {
        create: group.members.map((m) => ({ userId: m.userId })),
      },
    },
  });
  return conv.id;
}

router.get("/", authMiddleware, async (req, res) => {
  const { id: userId } = (req as AuthedRequest).user;
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { id: true, username: true, name: true, avatarUrl: true } },
      _count: { select: { members: true } },
      conversation: { select: { id: true } },
      members: {
        where: { userId },
        select: { id: true },
      },
    },
  });
  res.json(
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      category: g.category,
      privacy: g.privacy,
      creator: g.creator,
      memberCount: g._count.members,
      isMember: g.members.length > 0,
      conversationId: g.conversation?.id ?? null,
    }))
  );
});

router.get("/:id/detail", authMiddleware, async (req, res) => {
  const { id: userId } = (req as AuthedRequest).user;
  const groupId = paramId(req);
  if (!groupId) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        where: { userId },
        select: { id: true },
      },
    },
  });
  if (!group) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (group.members.length === 0) {
    res.status(403).json({ error: "Join the group to view chat and members" });
    return;
  }

  const conversationId = await ensureGroupConversation(groupId);
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    orderBy: { joinedAt: "asc" },
    include: {
      user: { select: { id: true, username: true, name: true, avatarUrl: true } },
    },
  });

  res.json({
    id: group.id,
    name: group.name,
    conversationId,
    members: members.map((m) => m.user),
  });
});

router.post("/", authMiddleware, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { id } = (req as AuthedRequest).user;
  const privacy =
    parsed.data.privacy === "PUBLIC" ? GroupPrivacy.PUBLIC : GroupPrivacy.PRIVATE;
  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? undefined,
      category: parsed.data.category ?? undefined,
      privacy,
      creatorId: id,
      members: { create: { userId: id } },
      conversation: {
        create: {
          participants: { create: { userId: id } },
        },
      },
    },
    include: {
      creator: { select: { id: true, username: true, name: true, avatarUrl: true } },
      _count: { select: { members: true } },
      conversation: { select: { id: true } },
      members: {
        where: { userId: id },
        select: { id: true },
      },
    },
  });
  res.status(201).json({
    id: group.id,
    name: group.name,
    description: group.description,
    category: group.category,
    privacy: group.privacy,
    creator: group.creator,
    memberCount: group._count.members,
    isMember: true,
    conversationId: group.conversation?.id ?? null,
  });
});

router.post("/:id/join", authMiddleware, async (req, res) => {
  const { id: userId } = (req as AuthedRequest).user;
  const group = await prisma.group.findUnique({
    where: { id: paramId(req) },
    include: { _count: { select: { members: true } } },
  });
  if (!group) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId } },
  });
  if (existing) {
    const conversationId = await ensureGroupConversation(group.id);
    const count = await prisma.groupMember.count({ where: { groupId: group.id } });
    res.json({ joined: true, memberCount: count, conversationId });
    return;
  }
  if (group.privacy === GroupPrivacy.PRIVATE) {
    res.status(403).json({ error: "Private group requires approval (not implemented)" });
    return;
  }
  await prisma.groupMember.create({
    data: { groupId: group.id, userId },
  });
  const conversationId = await ensureGroupConversation(group.id);
  const count = await prisma.groupMember.count({ where: { groupId: group.id } });
  res.json({ joined: true, memberCount: count, conversationId });
});

export default router;
