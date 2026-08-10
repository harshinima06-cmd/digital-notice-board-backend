import express from "express";
import {
  addNotice,
  getAllNotices,
  updateNotice,
  deleteNotice,
  getStudentNotices,
  searchNotices,
} from "../controllers/noticeController.js";
import { protect, adminOnly, studentOnly } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// ================== ADMIN ROUTES (Notice CRUD) ==================
// upload.single("file") = Multer middleware, "file" is the field name from frontend form
router.post("/", protect, adminOnly, upload.single("file"), addNotice);
router.get("/all", protect, adminOnly, getAllNotices);
router.put("/:id", protect, adminOnly, upload.single("file"), updateNotice);
router.delete("/:id", protect, adminOnly, deleteNotice);

// ================== STUDENT ROUTES (View only) ==================
router.get("/student", protect, studentOnly, getStudentNotices);
router.get("/search", protect, studentOnly, searchNotices);

export default router;