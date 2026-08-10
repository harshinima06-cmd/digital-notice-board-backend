import Student from "../models/Student.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";

// ================== STUDENT LOGIN ==================
// Student can login using Register Number OR Email + Password
export const loginStudent = async (req, res) => {
  try {
    const { loginId, password } = req.body; // loginId = registerNumber or email

    // Find student by either email or registerNumber
    const student = await Student.findOne({
      $or: [{ email: loginId }, { registerNumber: loginId }],
    }).populate("department", "departmentName");

    if (!student) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.status(200).json({
      _id: student._id,
      name: student.name,
      registerNumber: student.registerNumber,
      email: student.email,
      department: student.department,
      token: generateToken(student._id, "student"),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== GET STUDENT PROFILE ==================
// req.user comes from authMiddleware (after token verification)
export const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id)
      .populate("department", "departmentName")
      .select("-password");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== TOGGLE BOOKMARK ==================
// Adds the notice to bookmarks if not already saved, removes it if it is
export const toggleBookmark = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const noticeId = req.params.noticeId;
    const alreadyBookmarked = student.bookmarkedNotices.some(
      (id) => id.toString() === noticeId
    );

    if (alreadyBookmarked) {
      // Remove it
      student.bookmarkedNotices = student.bookmarkedNotices.filter(
        (id) => id.toString() !== noticeId
      );
    } else {
      // Add it
      student.bookmarkedNotices.push(noticeId);
    }

    await student.save();
    res.status(200).json({
      bookmarked: !alreadyBookmarked,
      bookmarkedNotices: student.bookmarkedNotices,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== GET BOOKMARKED NOTICES ==================
export const getBookmarkedNotices = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).populate({
      path: "bookmarkedNotices",
      options: { sort: { createdAt: -1 } },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json(student.bookmarkedNotices);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== GET BOOKMARK IDs ONLY (lightweight, for UI state) ==================
export const getBookmarkIds = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("bookmarkedNotices");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.status(200).json(student.bookmarkedNotices);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};