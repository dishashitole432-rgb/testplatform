import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    selectedOptionIndex: { type: Number, min: 0, max: 3, default: null },
    isCorrect: { type: Boolean, default: false },
    timeSpentSec: { type: Number, min: 0, default: 0 },
    timedOut: { type: Boolean, default: false },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null },
    status: { type: String, enum: ["in_progress", "submitted"], default: "in_progress" },
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    answers: { type: [answerSchema], default: [] },
  },
  { timestamps: true }
);

attemptSchema.index({ testId: 1, userId: 1, status: 1 });

export default mongoose.model("Attempt", attemptSchema);
