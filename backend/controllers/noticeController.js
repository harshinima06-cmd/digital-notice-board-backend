import Notice from "../models/Notice.js";
import Student from "../models/Student.js"; // add this import if not already there
import sendNoticeEmail from "../utils/sendEmail.js"; // 👈 NEW

// ================== ADD NOTICE (Admin only) ==================
export const addNotice = async (req, res) => {
  try {
    const { title, description, category, department, expiryDate } = req.body;

    const filePath = req.file ? req.file.path.replace(/\\/g, "/") : null;

    const notice = await Notice.create({
      title,
      description,
      category,
      department: department || "All Departments",
      file: filePath,
      expiryDate: expiryDate || null,
      createdBy: req.user.id,
    });

    // Send email to relevant students - runs AFTER responding so the
    // admin doesn't have to wait for emails to finish sending
    res.status(201).json(notice);

    // Find students who should be notified (their department, or everyone if "All Departments")
    let studentsToNotify;
    if (notice.department === "All Departments") {
      studentsToNotify = await Student.find().select("email");
    } else {
      const Department = (await import("../models/Department.js")).default;
      const dept = await Department.findOne({ departmentName: notice.department });
      studentsToNotify = dept
        ? await Student.find({ department: dept._id }).select("email")
        : [];
    }

    const emails = studentsToNotify.map((s) => s.email);
    console.log(`📧 Found ${emails.length} student(s) to notify:`, emails); 
    sendNoticeEmail(emails, notice); // fire-and-forget, doesn't block response
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== GET ALL NOTICES (Admin view) ==================
export const getAllNotices = async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 });
    res.status(200).json(notices);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== UPDATE NOTICE (Admin only) ==================
export const updateNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    // Update only the fields sent in the request body
    const { title, description, category, department, expiryDate } = req.body;
    notice.title = title || notice.title;
    notice.description = description || notice.description;
    notice.category = category || notice.category;
    notice.department = department || notice.department;
    notice.expiryDate = expiryDate || notice.expiryDate;

    // If a new file was uploaded, replace the old file path
    if (req.file) {
      notice.file = req.file.path.replace(/\\/g, "/");
    }

    const updatedNotice = await notice.save();
    res.status(200).json(updatedNotice);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== DELETE NOTICE (Admin only) ==================
export const deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({ message: "Notice not found" });
    }

    await notice.deleteOne();
    res.status(200).json({ message: "Notice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== GET NOTICES FOR STUDENT (Department Security) ==================
// This is the MOST IMPORTANT function for department-based access control
export const getStudentNotices = async (req, res) => {
  try {
    // Get logged-in student's department from database (NOT from frontend/URL)
    // This prevents students from faking their department
    const student = await Student.findById(req.user.id).populate(
      "department",
      "departmentName"
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const studentDept = student.department.departmentName;
    const today = new Date();

    const notices = await Notice.find({
      $or: [{ department: "All Departments" }, { department: studentDept }],
      $and: [
        {
          $or: [
            { expiryDate: null },              // 👈 no expiry = always show
            { expiryDate: { $gte: today } },   // 👈 not expired yet
          ],
        },
      ],
    }).sort({ createdAt: -1 });

    res.status(200).json(notices);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== SEARCH NOTICES (Student) ==================
export const searchNotices = async (req, res) => {
  try {
    const { keyword, category, fromDate, toDate } = req.query; // 👈 added fromDate, toDate

    // Get student's department (server-side, secure)
    const student = await Student.findById(req.user.id).populate(
      "department",
      "departmentName"
    );
    const studentDept = student.department.departmentName;
    const today = new Date();

    // Build search filter dynamically
    const filter = {
      $and: [
        { $or: [{ department: "All Departments" }, { department: studentDept }] },
        // Only show notices that haven't expired
        {
          $or: [{ expiryDate: null }, { expiryDate: { $gte: today } }],
        },
      ],
    };

    // If keyword given, search in title (case-insensitive)
    if (keyword) {
      filter.$and.push({ title: { $regex: keyword, $options: "i" } });
    }

    // If category given, filter by category
    if (category) {
      filter.$and.push({ category });
    }

    // If fromDate given, only notices created on/after this date
    if (fromDate) {
      filter.$and.push({ createdAt: { $gte: new Date(fromDate) } });
    }

    // If toDate given, only notices created on/before this date (end of that day)
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setHours(23, 59, 59, 999);
      filter.$and.push({ createdAt: { $lte: endOfDay } });
    }

    const notices = await Notice.find(filter).sort({ createdAt: -1 });
    res.status(200).json(notices);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};