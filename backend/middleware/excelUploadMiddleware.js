import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure temp folder exists (safety net, in case it wasn't created manually)
const tempDir = "uploads/temp/";
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `excel-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Only allow .xlsx and .xls files
const fileFilter = (req, file, cb) => {
  const allowedExt = [".xlsx", ".xls"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExt.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .xlsx or .xls files are allowed"), false);
  }
};

const excelUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

export default excelUpload;