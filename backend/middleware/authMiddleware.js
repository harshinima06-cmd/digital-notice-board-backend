import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import Student from "../models/Student.js";

// ================== PROTECT (Verify JWT Token) ==================
// This middleware checks if the request has a valid token
export const protect = async (req, res, next) => {
  let token;

  // Token usually sent as: "Authorization: Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Extract token (remove "Bearer " part)
      token = req.headers.authorization.split(" ")[1];

      // Verify token using our secret key
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // decoded contains { id, role } that we set in generateToken.js
      // Fetch the actual user from database based on role
      if (decoded.role === "admin") {
        req.user = await Admin.findById(decoded.id).select("-password");
      } else if (decoded.role === "student") {
        req.user = await Student.findById(decoded.id).select("-password");
      }

      if (!req.user) {
        return res.status(401).json({ message: "User not found, authorization denied" });
      }

      // Attach role separately too (useful for adminOnly/studentOnly checks)
      req.user.role = decoded.role;

      next(); // token valid, move to next middleware/controller
    } catch (error) {
      res.status(401).json({ message: "Token invalid or expired, please login again" });
    }
  } else {
    res.status(401).json({ message: "No token provided, authorization denied" });
  }
};

// ================== ADMIN ONLY ==================
// This runs AFTER protect middleware, checks role === "admin"
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next(); // user is admin, allow access
  } else {
    res.status(403).json({ message: "Access denied. Admins only." });
  }
};

// ================== STUDENT ONLY ==================
// This runs AFTER protect middleware, checks role === "student"
export const studentOnly = (req, res, next) => {
  if (req.user && req.user.role === "student") {
    next(); // user is student, allow access
  } else {
    res.status(403).json({ message: "Access denied. Students only." });
  }
};