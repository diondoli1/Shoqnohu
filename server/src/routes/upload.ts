import { Router } from "express";
import { authMiddleware, type AuthedRequest } from "../auth.js";
import { upload, publicUrlForFile } from "../upload.js";

const router = Router();

router.post("/image", authMiddleware, upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file" });
    return;
  }
  const url = publicUrlForFile(req.file.filename);
  res.json({ url });
});

export default router;
