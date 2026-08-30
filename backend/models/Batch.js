import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    originalFilename: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    section: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    startYear: {
      type: Number,
      required: true,
    },
    endYear: {
      type: Number,
      required: true,
    },
    studentCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // createdAt = "Uploaded" date
  }
);

export default mongoose.model("Batch", batchSchema);