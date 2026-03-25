import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import type { AuthedRequest } from "../auth.js";
import { authMiddleware } from "../auth.js";
import { EventRsvpStatus } from "@prisma/client";
import { paramId } from "../param.js";

const router = Router();

const categories = ["Social", "Networking", "Conference", "Workshop", "Sports", "Entertainment"] as const;

/** Accept /uploads/… or full URL whose path is /uploads/… */
function normalizePlaceImageUrl(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("/uploads/")) return t;
  try {
    const u = new URL(t);
    if (u.pathname.startsWith("/uploads/")) return `${u.pathname}${u.search}`;
  } catch {
    /* ignore */
  }
  return t;
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  startsAt: z.string().min(1),
  category: z.enum(categories),
  placeImages: z.preprocess(
    (val) => {
      if (!Array.isArray(val)) return val;
      return val.map((x) => (typeof x === "string" ? normalizePlaceImageUrl(x) : x));
    },
    z
      .array(z.string().min(1).max(2000))
      .min(2)
      .max(24)
      .refine((urls) => urls.every((u) => u.startsWith("/uploads/")), {
        message: "Add at least 2 venue photos from uploads",
      })
  ),
});

router.get("/", authMiddleware, async (req, res) => {
  const { id: userId } = (req as AuthedRequest).user;
  const events = await prisma.event.findMany({
    orderBy: { startsAt: "asc" },
    include: {
      creator: { select: { id: true, username: true, name: true, avatarUrl: true } },
      rsvps: true,
    },
  });
  res.json(
    events.map((e) => {
      const mine = e.rsvps.find((r) => r.userId === userId);
      return {
        id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        startsAt: e.startsAt,
        category: e.category,
        creator: e.creator,
        goingCount: e.rsvps.filter((r) => r.status === EventRsvpStatus.GOING).length,
        interestedCount: e.rsvps.filter((r) => r.status === EventRsvpStatus.INTERESTED).length,
        myRsvp: mine?.status ?? null,
        placeImages: e.placeImages ?? [],
      };
    })
  );
});

router.post("/", authMiddleware, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { id } = (req as AuthedRequest).user;
  const event = await prisma.event.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? undefined,
      location: parsed.data.location ?? undefined,
      startsAt: new Date(parsed.data.startsAt),
      category: parsed.data.category,
      placeImages: parsed.data.placeImages,
      creatorId: id,
    },
    include: {
      creator: { select: { id: true, username: true, name: true, avatarUrl: true } },
      rsvps: true,
    },
  });
  res.status(201).json(formatEvent(event));
});

router.get("/:id", authMiddleware, async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: paramId(req) },
    include: {
      creator: { select: { id: true, username: true, name: true, avatarUrl: true } },
      rsvps: { include: { user: { select: { id: true, username: true } } } },
    },
  });
  if (!event) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { id: userId } = (req as AuthedRequest).user;
  const mine = event.rsvps.find((r) => r.userId === userId);
  res.json({
    ...formatEvent(event),
    myRsvp: mine?.status ?? null,
  });
});

const rsvpSchema = z.object({
  status: z.enum(["GOING", "INTERESTED"]),
});

router.post("/:id/rsvp", authMiddleware, async (req, res) => {
  const parsed = rsvpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { id: userId } = (req as AuthedRequest).user;
  const event = await prisma.event.findUnique({ where: { id: paramId(req) } });
  if (!event) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const status =
    parsed.data.status === "GOING" ? EventRsvpStatus.GOING : EventRsvpStatus.INTERESTED;
  await prisma.eventRsvp.upsert({
    where: { eventId_userId: { eventId: event.id, userId } },
    create: { eventId: event.id, userId, status },
    update: { status },
  });
  const rsvps = await prisma.eventRsvp.findMany({ where: { eventId: event.id } });
  res.json({
    goingCount: rsvps.filter((r) => r.status === EventRsvpStatus.GOING).length,
    interestedCount: rsvps.filter((r) => r.status === EventRsvpStatus.INTERESTED).length,
    myRsvp: status,
  });
});

function formatEvent(event: {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: Date;
  category: string;
  placeImages?: string[];
  creator: { id: string; username: string; name: string | null; avatarUrl: string | null };
  rsvps: { status: EventRsvpStatus }[];
}) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    startsAt: event.startsAt,
    category: event.category,
    placeImages: event.placeImages ?? [],
    creator: event.creator,
    goingCount: event.rsvps.filter((r) => r.status === EventRsvpStatus.GOING).length,
    interestedCount: event.rsvps.filter((r) => r.status === EventRsvpStatus.INTERESTED).length,
  };
}

export default router;
