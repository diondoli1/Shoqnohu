import type { Request } from "express";

export function paramId(req: Request): string {
  const v = req.params["id"];
  if (Array.isArray(v)) return v[0] ?? "";
  return typeof v === "string" ? v : "";
}

export function paramUsername(req: Request): string {
  const v = req.params["username"];
  if (Array.isArray(v)) return v[0] ?? "";
  return typeof v === "string" ? v : "";
}
