import express from "express";
import {
  registerAdmin,
  loginAdmin,
  addDepartment,
  getDepartments,
  addStudent,
  getStudents,
  getDashboardStats,
} from "../controllers/adminController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { getAdminProfile, updateAdminProfile } from "../controllers/adminController.js"; // add to existing import
import { getSettings, updateSettings } from "../controllers/adminController.js"; // add to existing import line

const router = express.Router();
// Add these two lines with the other protected routes:
router.get("/profile", protect, adminOnly, getAdminProfile);
router.put("/profile", protect, adminOnly, updateAdminProfile);

// Add these 2 lines with the other protected routes:
router.get("/settings", protect, adminOnly, getSettings);
router.put("/settings", protect, adminOnly, updateSettings);

// ================== PUBLIC ROUTES ==================
// Anyone can call these (no login needed)
router.post("/signup", registerAdmin);
router.post("/login", loginAdmin);

// ================== PROTECTED ROUTES (Admin only) ==================
// protect = checks if valid JWT token exists
// adminOnly = checks if role is "admin"
router.get("/dashboard", protect, adminOnly, getDashboardStats);

// Department routes
router.post("/department", protect, adminOnly, addDepartment);
router.get("/department", protect, adminOnly, getDepartments);

// Student management routes
router.post("/student", protect, adminOnly, addStudent);
router.get("/student", protect, adminOnly, getStudents);

export default router;