import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    registerNumber: {
      type: String,
      required: [true, "Register number is required"],
      unique: true, // each student has a unique register number
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId, // references Department collection
      ref: "Department",
      required: [true, "Department is required"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    bookmarkedNotices: [                     // 👈 NEW FIELD
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notice",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Student", studentSchema);