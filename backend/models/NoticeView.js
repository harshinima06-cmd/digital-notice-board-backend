import mongoose from "mongoose";

const noticeViewSchema = new mongoose.Schema(
  {
    notice: { type: mongoose.Schema.Types.ObjectId, ref: "Notice", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    day: { type: String, required: true }, // "YYYY-MM-DD" in IST
  },
  { timestamps: true }
);

// one view per student, per notice, per day
noticeViewSchema.index({ notice: 1, student: 1, day: 1 }, { unique: true });

export default mongoose.model("NoticeView", noticeViewSchema);