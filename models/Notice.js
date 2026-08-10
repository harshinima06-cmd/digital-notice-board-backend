import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Exam",
        "Scholarship",
        "Placement",
        "Events",
        "Circular",
        "Workshop",
        "Internship",
        "Seminar",
        "Sports",
        "Cultural",
        "General Announcement",
      ], // only these values allowed
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      default: "All Departments", // if not specified, visible to all
    },
    file: {
      type: String, // stores file path (PDF/Image) uploaded via Multer
      default: null,
    },
     expiryDate: {                       
      type: Date,
      default: null,                       // null = notice never expires
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", // notice always created by Admin
      required: true,
    },
  },
  {
    timestamps: true, // createdAt automatically tracked here
  }
);

export default mongoose.model("Notice", noticeSchema);