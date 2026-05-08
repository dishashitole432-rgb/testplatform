import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    options: {
      type: [String],
      validate: {
        validator: (arr) => arr.length === 4,
        message: "Exactly 4 options are required",
      },
    },
    correctOptionIndex: { type: Number, min: 0, max: 3, required: true },
    marks: { type: Number, min: 1, default: 1 },
    timeLimitSec: { type: Number, min: 5, default: 30 },
    order: { type: Number, required: true },
  },
  { _id: true }
);

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    published: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Test", testSchema);
