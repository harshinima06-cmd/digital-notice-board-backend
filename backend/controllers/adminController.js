import Admin from "../models/Admin.js";
import Student from "../models/Student.js";
import Department from "../models/Department.js";
import Notice from "../models/Notice.js";
import Batch from "../models/Batch.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";
import Settings from "../models/Settings.js";
import XLSX from "xlsx";
import fs from "fs";

// ================== ADMIN SIGNUP ==================
// Only ONE admin allowed for the entire college
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const adminExists = await Admin.findOne();
    if (adminExists) {
      return res.status(400).json({
        message: "Admin already exists. Only one admin allowed per college.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = await Admin.create({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    res.status(201).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      token: generateToken(admin._id, "admin"),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== ADMIN LOGIN ==================
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.status(200).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      token: generateToken(admin._id, "admin"),
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== ADD DEPARTMENT ==================
export const addDepartment = async (req, res) => {
  try {
    const { departmentName } = req.body;

    const exists = await Department.findOne({ departmentName });
    if (exists) {
      return res.status(400).json({ message: "Department already exists" });
    }

    const department = await Department.create({ departmentName });
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== GET ALL DEPARTMENTS ==================
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    res.status(200).json(departments);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== ADD STUDENT ==================
// Only Admin can create student accounts
export const addStudent = async (req, res) => {
  try {
    const { name, registerNumber, email, department, password } = req.body;

    const studentExists = await Student.findOne({
      $or: [{ email }, { registerNumber }],
    });
    if (studentExists) {
      return res.status(400).json({
        message: "Student with this email or register number already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const student = await Student.create({
      name,
      registerNumber,
      email,
      department,
      password: hashedPassword,
    });

    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== GET ALL STUDENTS ==================
export const getStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate("department", "departmentName")
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== ADMIN DASHBOARD STATS ==================
export const getDashboardStats = async (req, res) => {
  try {
    const [totalNotices, totalStudents, totalDepartments] = await Promise.all([
      Notice.countDocuments(),
      Student.countDocuments(),
      Department.countDocuments(),
    ]);

    const recentNotices = await Notice.find()
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      totalNotices,
      totalStudents,
      totalDepartments,
      recentNotices,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== GET ADMIN PROFILE ==================
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }
    res.status(200).json(admin);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== UPDATE ADMIN PROFILE ==================
export const updateAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const { name, phone } = req.body;
    admin.name = name || admin.name;
    admin.phone = phone || admin.phone;

    const updatedAdmin = await admin.save();
    res.status(200).json({
      _id: updatedAdmin._id,
      name: updatedAdmin.name,
      email: updatedAdmin.email,
      phone: updatedAdmin.phone,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== GET SETTINGS ==================
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== UPDATE SETTINGS ==================
export const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    const {
      collegeName,
      collegeLogo,
      notificationEmail,
      dateFormat,
      timeFormat,
      allowStudentRegistration,
      maintenanceMode,
    } = req.body;

    settings.collegeName = collegeName ?? settings.collegeName;
    settings.collegeLogo = collegeLogo ?? settings.collegeLogo;
    settings.notificationEmail = notificationEmail ?? settings.notificationEmail;
    settings.dateFormat = dateFormat ?? settings.dateFormat;
    settings.timeFormat = timeFormat ?? settings.timeFormat;
    settings.allowStudentRegistration =
      allowStudentRegistration ?? settings.allowStudentRegistration;
    settings.maintenanceMode = maintenanceMode ?? settings.maintenanceMode;

    const updated = await settings.save();
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== BULK UPLOAD STUDENTS (Excel) ==================
export const bulkUploadStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Excel file is required" });
    }
    const originalFilename = req.file.originalname;
    // Read the uploaded Excel file
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Delete temp file - no longer needed after reading
    fs.unlink(req.file.path, () => {});

    if (!rows.length) {
      return res.status(400).json({ message: "Excel file is empty" });
    }

     // ---------- Try to detect batch info from the filename ----------
    // Expected pattern: DEPT_SECTION_STARTYEAR_ENDYEAR.xlsx (e.g. IT_A_2023_2027.xlsx)
    const filenamePattern = /^([A-Za-z0-9]+)_([A-Za-z0-9]+)_(\d{4})_(\d{4})\.(xlsx|xls)$/i;
    const filenameMatch = originalFilename.match(filenamePattern);

    let batchId = null;
    let batchInfo = null;

    if (filenameMatch) {
      // Pre-generate the ID so we can attach it to students as we create them,
      // then create the Batch document using this same ID afterwards.
      batchId = new mongoose.Types.ObjectId();
      batchInfo = {
        department: filenameMatch[1].toUpperCase(),
        section: filenameMatch[2].toUpperCase(),
        startYear: parseInt(filenameMatch[3], 10),
        endYear: parseInt(filenameMatch[4], 10),
      };
    }

    // Pre-fetch departments once (avoid DB call inside loop)
    const departments = await Department.find();
    const deptMap = {};
    departments.forEach((d) => {
      deptMap[d.departmentName.trim().toLowerCase()] = d;
    });

    const results = { success: [], failed: [] };

    for (const row of rows) {
      const name = row.Name?.toString().trim();
      const registerNumber = row.RegisterNumber?.toString().trim();
      const email = row.Email?.toString().trim().toLowerCase();
      const deptName = row.Department?.toString().trim();

      // Validate required fields
      if (!name || !registerNumber || !email || !deptName) {
        results.failed.push({
          row,
          reason: "Missing Name, RegisterNumber, Email, or Department",
        });
        continue;
      }

      // Find department
      const dept = deptMap[deptName.toLowerCase()];
      if (!dept) {
        results.failed.push({ row, reason: `Department "${deptName}" not found` });
        continue;
      }

      // Check duplicate (email OR registerNumber)
      const existingStudent = await Student.findOne({
        $or: [{ email }, { registerNumber }],
      });
      if (existingStudent) {
        results.failed.push({
          row,
          reason: "Email or Register Number already exists",
        });
        continue;
      }

      // Password = RegisterNumber, hashed with bcrypt
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(registerNumber, salt);

      try {
        const student = await Student.create({
          name,
          registerNumber,
          email,
          department: dept._id,
          password: hashedPassword,
          batchId: batchId || null,
        });
        results.success.push({
          name: student.name,
          registerNumber: student.registerNumber,
          email: student.email,
        });
      } catch (err) {
        results.failed.push({ row, reason: err.message });
      }
    }

    // ---------- Create the Batch record (only if filename matched AND at least 1 student was added) ----------
    let batchCreated = null;
    if (batchId && results.success.length > 0) {
      batchCreated = await Batch.create({
        _id: batchId,
        originalFilename,
        department: batchInfo.department,
        section: batchInfo.section,
        startYear: batchInfo.startYear,
        endYear: batchInfo.endYear,
        studentCount: results.success.length,
      });
    }

    res.status(200).json({
      message: `${results.success.length} students added, ${results.failed.length} failed`,
      results,
      batch: batchCreated
        ? {
            id: batchCreated._id,
            department: batchCreated.department,
            section: batchCreated.section,
            startYear: batchCreated.startYear,
            endYear: batchCreated.endYear,
            studentCount: batchCreated.studentCount,
          }
        : null,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== GET ALL BATCHES ==================
export const getBatches = async (req, res) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });
    res.status(200).json(batches);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== DELETE BATCH (and its students) ==================
export const deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }

    // Delete only students linked to this specific batch
    const deleteResult = await Student.deleteMany({ batchId: id });

    await batch.deleteOne();

    res.status(200).json({
      message: `Batch deleted successfully. ${deleteResult.deletedCount} student(s) removed.`,
      deletedStudents: deleteResult.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};