import { prisma } from "./db.js";

/** Case-insensitive username match (PostgreSQL). */
export async function findUserByUsername(raw: string) {
  const username = raw.trim();
  if (!username) return null;
  return prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
  });
}
