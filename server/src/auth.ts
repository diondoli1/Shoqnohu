import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { prisma } from "./db.js";

export type JwtPayload = { sub: string; username: string };

export function signToken(userId: string, username: string): string {
  return jwt.sign({ sub: userId, username }, config.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    (req as AuthedRequest).user = { id: user.id, username: user.username };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export type AuthedRequest = Request & {
  user: { id: string; username: string };
};
