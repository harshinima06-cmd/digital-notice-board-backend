// ==========================================================================
// script.js - Common utility functions used across the whole frontend
// ==========================================================================

// Base URL of our backend API (change this if backend runs on a different port)
const API_BASE_URL = "https://digital-notice-board-backend-1.onrender.com/api";

/**
 * Show/hide password text when the eye icon is clicked.
 * Works on every page because we attach the listener to all
 * elements with the class "toggle-eye".
 */
document.addEventListener("DOMContentLoaded", () => {
  const eyeButtons = document.querySelectorAll(".toggle-eye");

  eyeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      const icon = btn.querySelector("i");

      if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }
    });
  });
});

/**
 * Show an error message box (used for login/signup failures)
 * @param {string} elementId - id of the error <div>
 * @param {string} message - message to display
 */
function showError(elementId, message) {
  const box = document.getElementById(elementId);
  if (!box) return;
  box.textContent = message;
  box.classList.add("show");
}

/**
 * Hide an error message box
 * @param {string} elementId
 */
function hideError(elementId) {
  const box = document.getElementById(elementId);
  if (!box) return;
  box.classList.remove("show");
}

/**
 * Wrapper around fetch() that automatically attaches the JWT token
 * (if present) and handles JSON parsing + errors consistently.
 *
 * @param {string} endpoint - e.g. "/admin/login"
 * @param {object} options - fetch options (method, body, isFormData)
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = options.isFormData
    ? {} // don't set Content-Type for FormData, browser sets it automatically
    : { "Content-Type": "application/json" };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || "GET",
    headers,
    body: options.isFormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Throw so the calling code can catch it and show the error
    throw new Error(data.message || "Something went wrong. Please try again.");
  }

  return data;
}

/**
 * Save login session details (token, role, name) to localStorage
 */
function saveSession(data, role) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("role", role);
  localStorage.setItem("name", data.name);
  localStorage.setItem("userId", data._id);
}

/**
 * Clear session and redirect to the correct login page
 */
function logout() {
  const role = localStorage.getItem("role");
  localStorage.clear();
  window.location.href = role === "admin" ? "admin-login.html" : "student-login.html";
}

/**
 * Format a date string into "20 May 2025" style
 */
function formatDate(dateString) {
  const options = { day: "2-digit", month: "short", year: "numeric" };
  return new Date(dateString).toLocaleDateString("en-GB", options).replace(/ /g, " ");
}

/**
 * Guard function - call this at the top of dashboard pages
 * to make sure only logged-in users with the correct role can view them.
 * @param {string} requiredRole - "admin" or "student"
 */
function requireAuth(requiredRole) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token || role !== requiredRole) {
    // Not logged in, or wrong role trying to access this page -> kick out
    window.location.href = requiredRole === "admin" ? "admin-login.html" : "student-login.html";
  }
}

/**
 * Builds a full, browser-usable URL for a file stored on the backend
 * (e.g. a notice's PDF/Image, saved in backend/uploads).
 */
function getFileUrl(filePath) {
  if (!filePath) return null;
  const serverBaseUrl = API_BASE_URL.replace("/api", "");
  return `${serverBaseUrl}/${filePath}`;
}

/**
 * Force-downloads a file from the backend (works even across
 * different ports/origins, unlike a plain <a download> tag which
 * browsers ignore for cross-origin URLs).
 */
async function downloadFile(fileUrl, suggestedName) {
  try {
    const response = await fetch(fileUrl);
    const blob = await response.blob();

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = suggestedName || "notice-attachment";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    alert("Could not download the file. Please try again.");
  }
}

/**
 * Returns a CSS badge class name based on the notice category
 * (used to color-code the category pills in tables)
 */
function getCategoryBadgeClass(category) {
  const map = {
    Exam: "badge-exam",
    Scholarship: "badge-scholarship",
    Placement: "badge-placements",
    Events: "badge-events",
    Circular: "badge-circulars",
    Workshop: "badge-workshop",
    Internship: "badge-internship",
    Seminar: "badge-seminar",
    Sports: "badge-sports",
    Cultural: "badge-cultural",
    "General Announcement": "badge-general",
  };
  return map[category] || "badge-general";
}