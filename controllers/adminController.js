import Admin from "../models/Admin.js";
import Student from "../models/Student.js";
import Department from "../models/Department.js";
import Notice from "../models/Notice.js";
import bcrypt from "bcryptjs";
import generateToken from "../utils/generateToken.js";
import Settings from "../models/Settings.js"; 

// ================== ADMIN SIGNUP ==================
// Only ONE admin allowed for the entire college
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if admin already exists (only 1 admin allowed)
    const adminExists = await Admin.findOne();
    if (adminExists) {
      return res.status(400).json({
        message: "Admin already exists. Only one admin allowed per college.",
      });
    }

    // Hash the password before saving (never store plain text password)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    const admin = await Admin.create({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    // Send response with token
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

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare entered password with hashed password in database
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Send response with token
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

    // Check if department already exists
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

    // Check if student already exists (by email or register number)
    const studentExists = await Student.findOne({
      $or: [{ email }, { registerNumber }],
    });
    if (studentExists) {
      return res.status(400).json({
        message: "Student with this email or register number already exists",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const student = await Student.create({
      name,
      registerNumber,
      email,
      department, // this should be a Department _id
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
    // populate() replaces department ObjectId with actual department data
    const students = await Student.find()
      .populate("department", "departmentName")
      .select("-password") // exclude password field from response
      .sort({ createdAt: -1 });

    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ================== ADMIN DASHBOARD STATS ==================
export const getDashboardStats = async (req, res) => {
  try {
    // Run all counts in parallel for better performance
    const [totalNotices, totalStudents, totalDepartments] = await Promise.all([
      Notice.countDocuments(),
      Student.countDocuments(),
      Department.countDocuments(),
    ]);

    // Get 5 most recent notices for the dashboard table
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

    // Email is intentionally NOT editable here (used for login identity)

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
    // Find the single settings document, or create a default one if none exists yet
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