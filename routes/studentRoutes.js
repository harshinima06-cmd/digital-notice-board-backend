import express from "express";
import {
  loginStudent,
  getStudentProfile,
  toggleBookmark,
  getBookmarkedNotices,
  getBookmarkIds,
} from "../controllers/studentController.js";
import { protect, studentOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ================== PUBLIC ROUTE ==================
router.post("/login", loginStudent);

// ================== PROTECTED ROUTES (Student only) ==================
router.get("/profile", protect, studentOnly, getStudentProfile);
router.put("/bookmark/:noticeId", protect, studentOnly, toggleBookmark);
router.get("/bookmarks", protect, studentOnly, getBookmarkedNotices);
router.get("/bookmark-ids", protect, studentOnly, getBookmarkIds);

export default router;