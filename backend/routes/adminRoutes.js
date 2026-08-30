import express from "express";
import {
  registerAdmin,
  loginAdmin,
  addDepartment,
  getDepartments,
  addStudent,
  getStudents,
  getDashboardStats,
  getAdminProfile,
  updateAdminProfile,
  getSettings,
  updateSettings,
  bulkUploadStudents,
  getBatches,
  deleteBatch,
} from "../controllers/adminController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import excelUpload from "../middleware/excelUploadMiddleware.js";

const router = express.Router();

// ================== PUBLIC ROUTES ==================
router.post("/signup", registerAdmin);
router.post("/login", loginAdmin);

// ================== PROTECTED ROUTES (Admin only) ==================
router.get("/dashboard", protect, adminOnly, getDashboardStats);

// Profile routes
router.get("/profile", protect, adminOnly, getAdminProfile);
router.put("/profile", protect, adminOnly, updateAdminProfile);

// Settings routes
router.get("/settings", protect, adminOnly, getSettings);
router.put("/settings", protect, adminOnly, updateSettings);

// Department routes
router.post("/department", protect, adminOnly, addDepartment);
router.get("/department", protect, adminOnly, getDepartments);

// Student management routes
router.post("/student", protect, adminOnly, addStudent);
router.get("/student", protect, adminOnly, getStudents);

// Bulk upload students via Excel
router.post(
  "/students/bulk-upload",
  protect,
  adminOnly,
  excelUpload.single("file"),
  bulkUploadStudents
);

// Batch management routes
router.get("/batches", protect, adminOnly, getBatches);
router.delete("/batches/:id", protect, adminOnly, deleteBatch);

export default router;