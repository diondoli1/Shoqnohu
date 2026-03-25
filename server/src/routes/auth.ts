import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { signToken } from "../auth.js";
import { findUserByUsername } from "../userByUsername.js";

const router = Router();

const registerSchema = z.object({
  username: z.string().trim().min(2).max(32),
  email: z.string().trim().email(),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { username, email, password } = parsed.data;
  const exists = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: username, mode: "insensitive" } },
        { email: { equals: email, mode: "insensitive" } },
      ],
    },
  });
  if (exists) {
    res.status(409).json({ error: "Username or email already taken" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      name: username,
    },
  });
  const token = signToken(user.id, user.username);
  res.status(201).json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { username, password } = parsed.data;
  const user = await findUserByUsername(username);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = signToken(user.id, user.username);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  });
});

export default router;
