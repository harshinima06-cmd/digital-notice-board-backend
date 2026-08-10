import jwt from "jsonwebtoken";

// This function creates a JWT token with user id and role (admin/student)
// role helps us know WHO is logged in when we verify the token later
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role }, // payload - data stored inside token
    process.env.JWT_SECRET, // secret key from .env
    { expiresIn: "7d" } // token valid for 7 days
  );
};

export default generateToken;