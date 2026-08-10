import mongoose from "mongoose";

// Only ONE settings document will ever exist (like Admin) - stores
// college-wide configuration that applies to the whole system
const settingsSchema = new mongoose.Schema(
  {
    collegeName: {
      type: String,
      default: "A.V.C College of Engineering",
    },
    collegeLogo: {
      type: String,
      default: "", // URL to logo image, optional
    },
    notificationEmail: {
      type: String,
      default: "",
    },
    dateFormat: {
      type: String,
      enum: ["DD MMM YYYY", "MM/DD/YYYY", "DD/MM/YYYY"],
      default: "DD MMM YYYY",
    },
    timeFormat: {
      type: String,
      enum: ["12 Hour (AM/PM)", "24 Hour"],
      default: "12 Hour (AM/PM)",
    },
    allowStudentRegistration: {
      type: Boolean,
      default: false, // students are created by Admin only, per project design
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Settings", settingsSchema);