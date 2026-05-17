import express from "express";
import { z } from "zod";
import Test from "../models/Test.js";
import Attempt from "../models/Attempt.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { uploadQuestionImage } from "../middleware/upload.js";

const router = express.Router();

const questionPayloadSchema = z.object({
  prompt: z.string().min(2),
  options: z.array(z.string().min(1)).length(4),
  correctOptionIndex: z.number().int().min(0).max(3),
  marks: z.number().int().min(1).default(1),
  timeLimitSec: z.number().int().min(5).default(30),
  imageUrl: z.string().optional(),
});

router.post("/upload-image", requireAuth, requireRole("admin"), (req, res) => {
  uploadQuestionImage.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed" });
    if (!req.file) return res.status(400).json({ message: "No image file provided" });
    return res.status(201).json({ imageUrl: `/uploads/${req.file.filename}` });
  });
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = z.object({ title: z.string().min(2), description: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload" });
  }
  const test = await Test.create({
    title: parsed.data.title,
    description: parsed.data.description || "",
    createdBy: req.user._id,
  });
  return res.status(201).json(test);
});

router.get("/admin", requireAuth, requireRole("admin"), async (req, res) => {
  const tests = await Test.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  return res.json(tests);
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const test = await Test.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    { title: req.body.title, description: req.body.description },
    { new: true }
  );
  if (!test) return res.status(404).json({ message: "Test not found" });
  return res.json(test);
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const deleted = await Test.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!deleted) return res.status(404).json({ message: "Test not found" });
  return res.json({ message: "Deleted" });
});

router.post("/:id/questions", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = questionPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
  }
  const test = await Test.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!test) return res.status(404).json({ message: "Test not found" });
  test.questions.push({
    ...parsed.data,
    imageUrl: parsed.data.imageUrl || "",
    order: test.questions.length + 1,
  });
  await test.save();
  return res.status(201).json(test);
});

router.patch("/questions/:questionId", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = questionPayloadSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
  }
  const test = await Test.findOne({ createdBy: req.user._id, "questions._id": req.params.questionId });
  if (!test) return res.status(404).json({ message: "Question not found" });
  const q = test.questions.id(req.params.questionId);
  Object.assign(q, parsed.data);
  if (parsed.data.imageUrl === "") q.imageUrl = "";
  await test.save();
  return res.json(test);
});

router.delete("/questions/:questionId", requireAuth, requireRole("admin"), async (req, res) => {
  const test = await Test.findOne({ createdBy: req.user._id, "questions._id": req.params.questionId });
  if (!test) return res.status(404).json({ message: "Question not found" });
  test.questions = test.questions.filter((q) => q._id.toString() !== req.params.questionId);
  test.questions = test.questions.map((q, i) => ({ ...q.toObject(), order: i + 1 }));
  await test.save();
  return res.json(test);
});

router.patch("/:id/publish", requireAuth, requireRole("admin"), async (req, res) => {
  const test = await Test.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    { published: !!req.body.published },
    { new: true }
  );
  if (!test) return res.status(404).json({ message: "Test not found" });
  return res.json(test);
});

router.get("/available/list", requireAuth, requireRole("candidate", "admin"), async (_req, res) => {
  const tests = await Test.find({ published: true }).select("title description questions published createdAt");
  return res.json(tests);
});

router.get("/:id/submissions", requireAuth, requireRole("admin"), async (req, res) => {
  const attempts = await Attempt.find({ testId: req.params.id, status: "submitted" }).populate("userId", "name email");
  return res.json(attempts);
});

export default router;
