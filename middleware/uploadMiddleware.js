import multer from "multer";
import path from "path";
import fs from "fs";

// Create "uploads" folder automatically if it doesn't exist
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// ================== STORAGE CONFIG ==================
// Tells Multer WHERE and HOW to save the uploaded file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // save all files in "uploads/" folder
  },
  filename: (req, file, cb) => {
    // Create a unique filename: fieldname-timestamp.extension
    // Example: file-1719900000000.pdf (avoids duplicate filename issues)
    const uniqueName = `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// ================== FILE FILTER ==================
// Only allow PDF and Image files (as per Master Prompt requirement)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype);

  if (extName && mimeType) {
    cb(null, true); // accept file
  } else {
    cb(new Error("Only .jpeg, .jpg, .png and .pdf files are allowed"), false);
  }
};

// ================== MULTER INSTANCE ==================
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // max file size = 5MB
});

export default upload;