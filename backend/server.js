import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";



// Connect to MongoDB
connectDB();

// ES6 modules don't have __dirname by default, so we recreate it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ================== MIDDLEWARE ==================
app.use(cors()); // allows frontend (different port) to call this API
app.use(express.json()); // parses incoming JSON request bodies
app.use(express.urlencoded({ extended: true })); // parses form data

// Serve uploaded files (PDF/Images) as static files
// Example: http://localhost:5000/uploads/file-12345.pdf
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================== ROUTES ==================
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/notice", noticeRoutes);

// ================== TEST ROUTE ==================
app.get("/", (req, res) => {
  res.send("Digital Notice Board API is running...");
});

// ================== 404 HANDLER ==================
// Runs when no route matches the request
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ================== GLOBAL ERROR HANDLER ==================
// Catches errors thrown anywhere in the app (like Multer file errors)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong on the server",
  });
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});