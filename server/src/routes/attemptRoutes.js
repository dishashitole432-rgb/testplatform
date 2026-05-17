import express from "express";
import Attempt from "../models/Attempt.js";
import Test from "../models/Test.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

const sanitizeQuestion = (q) => ({
  _id: q._id,
  prompt: q.prompt,
  options: q.options,
  marks: q.marks,
  timeLimitSec: q.timeLimitSec,
  order: q.order,
  imageUrl: q.imageUrl || "",
});

router.post("/start/:testId", requireAuth, requireRole("candidate", "admin"), async (req, res) => {
  const test = await Test.findById(req.params.testId);
  if (!test || !test.published) return res.status(404).json({ message: "Test not found" });
  const existing = await Attempt.findOne({ testId: test._id, userId: req.user._id, status: "in_progress" });
  if (existing) return res.json(existing);
  const totalMarks = test.questions.reduce((sum, q) => sum + q.marks, 0);
  const attempt = await Attempt.create({ testId: test._id, userId: req.user._id, totalMarks });
  return res.status(201).json(attempt);
});

router.get("/:attemptId/question/:order", requireAuth, requireRole("candidate", "admin"), async (req, res) => {
  const attempt = await Attempt.findById(req.params.attemptId);
  if (!attempt || attempt.userId.toString() !== req.user._id.toString()) {
    return res.status(404).json({ message: "Attempt not found" });
  }
  const test = await Test.findById(attempt.testId);
  const question = test.questions.find((q) => q.order === Number(req.params.order));
  if (!question) return res.status(404).json({ message: "Question not found" });
  return res.json({ question: sanitizeQuestion(question), totalQuestions: test.questions.length });
});

router.post("/:attemptId/answer", requireAuth, requireRole("candidate", "admin"), async (req, res) => {
  const attempt = await Attempt.findById(req.params.attemptId);
  if (!attempt || attempt.userId.toString() !== req.user._id.toString() || attempt.status !== "in_progress") {
    return res.status(404).json({ message: "Attempt not active" });
  }
  const { questionId, selectedOptionIndex, timeSpentSec = 0, timedOut = false } = req.body;
  const test = await Test.findById(attempt.testId);
  const question = test.questions.id(questionId);
  if (!question) return res.status(404).json({ message: "Question not found" });
  const isCorrect = !timedOut && Number(selectedOptionIndex) === question.correctOptionIndex;
  const answerPayload = {
    questionId: question._id,
    selectedOptionIndex: timedOut ? null : selectedOptionIndex,
    isCorrect,
    timedOut: !!timedOut,
    timeSpentSec,
  };
  const idx = attempt.answers.findIndex((a) => a.questionId.toString() === question._id.toString());
  if (idx >= 0) attempt.answers[idx] = answerPayload;
  else attempt.answers.push(answerPayload);
  await attempt.save();
  return res.json(attempt);
});

router.post("/:attemptId/submit", requireAuth, requireRole("candidate", "admin"), async (req, res) => {
  const attempt = await Attempt.findById(req.params.attemptId);
  if (!attempt || attempt.userId.toString() !== req.user._id.toString() || attempt.status !== "in_progress") {
    return res.status(404).json({ message: "Attempt not active" });
  }
  const test = await Test.findById(attempt.testId);
  const score = attempt.answers.reduce((sum, ans) => {
    const q = test.questions.id(ans.questionId);
    return ans.isCorrect && q ? sum + q.marks : sum;
  }, 0);
  attempt.score = score;
  attempt.status = "submitted";
  attempt.submittedAt = new Date();
  await attempt.save();
  return res.json({ score: attempt.score, totalMarks: attempt.totalMarks, attemptId: attempt._id });
});

router.get("/:attemptId/result", requireAuth, requireRole("candidate", "admin"), async (req, res) => {
  const attempt = await Attempt.findById(req.params.attemptId);
  if (!attempt) return res.status(404).json({ message: "Attempt not found" });
  if (req.user.role !== "admin" && attempt.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const test = await Test.findById(attempt.testId);
  const review = test.questions.map((q) => {
    const answer = attempt.answers.find((a) => a.questionId.toString() === q._id.toString());
    return {
      question: q.prompt,
      imageUrl: q.imageUrl || "",
      options: q.options,
      selectedOptionIndex: answer?.selectedOptionIndex ?? null,
      correctOptionIndex: q.correctOptionIndex,
      isCorrect: answer?.isCorrect || false,
      timedOut: answer?.timedOut || false,
      marks: q.marks,
    };
  });
  return res.json({
    score: attempt.score,
    totalMarks: attempt.totalMarks,
    status: attempt.status,
    submittedAt: attempt.submittedAt,
    review,
  });
});

export default router;
