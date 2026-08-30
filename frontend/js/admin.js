// ==========================================================================
// admin.js - Handles Admin Login page + Admin Signup page logic
// (This file is only loaded on admin-login.html)
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // ---------- If we are on the admin dashboard page, load dashboard data ----------
  if (document.getElementById("recentNoticesBody")) {
    requireAuth("admin"); // kicks out non-admins / logged-out users
    loadAdminHeader();
    loadDashboardStats();
  }

  // ---------- If we are on the Manage Notices page, load notices list ----------
  if (document.getElementById("noticesTableBody")) {
    requireAuth("admin");
    loadAdminHeader();
    initNoticesPage();
  }

  // ---------- If we are on the Add/Edit Notice page, set up the form ----------
  if (document.getElementById("noticeForm")) {
    requireAuth("admin");
    loadAdminHeader();
    initNoticeForm();
  }

  // ---------- If we are on the Departments page, load + wire up add form ----------
  if (document.getElementById("departmentsTableBody")) {
    requireAuth("admin");
    loadAdminHeader();
    initDepartmentsPage();
  }

  // ---------- If we are on the Students page, load table + wire up modal ----------
  if (document.getElementById("studentsTableBody")) {
    requireAuth("admin");
    loadAdminHeader();
    initStudentsPage();
  }

  // ---------- If we are on the Profile page, load + wire up profile form ----------
  if (document.getElementById("profileForm")) {
    requireAuth("admin");
    loadAdminHeader();
    initProfilePage();
  }

  // ---------- If we are on the Settings page ----------
  if (document.getElementById("settingsForm")) {
    requireAuth("admin");
    loadAdminHeader();
    initSettingsPage();
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }

  const loginSection = document.getElementById("loginSection");
  const signupSection = document.getElementById("signupSection");
  const showSignup = document.getElementById("showSignup");
  const showLogin = document.getElementById("showLogin");

  // ---------- Toggle between Login and Signup sections ----------
  if (showSignup) {
    showSignup.addEventListener("click", (e) => {
      e.preventDefault();
      loginSection.classList.remove("active");
      signupSection.classList.add("active");
    });
  }

  if (showLogin) {
    showLogin.addEventListener("click", (e) => {
      e.preventDefault();
      signupSection.classList.remove("active");
      loginSection.classList.add("active");
    });
  }

  // ---------- ADMIN LOGIN ----------
  const loginForm = document.getElementById("adminLoginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError("loginError");

      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;
      const loginBtn = document.getElementById("loginBtn");

      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";

      try {
        const data = await apiRequest("/admin/login", {
          method: "POST",
          body: { email, password },
        });

        saveSession(data, "admin");
        window.location.href = "admin-dashboard.html";
      } catch (error) {
        showError("loginError", error.message);
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Login <i class="fa-solid fa-arrow-right"></i>';
      }
    });
  }

  // ---------- ADMIN SIGNUP ----------
  const signupForm = document.getElementById("adminSignupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError("signupError");

      const name = document.getElementById("signupName").value.trim();
      const email = document.getElementById("signupEmail").value.trim();
      const phone = document.getElementById("signupPhone").value.trim();
      const password = document.getElementById("signupPassword").value;
      const confirmPassword = document.getElementById("signupConfirmPassword").value;
      const signupBtn = document.getElementById("signupBtn");

      // Basic client-side validation
      if (password !== confirmPassword) {
        showError("signupError", "Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        showError("signupError", "Password must be at least 6 characters.");
        return;
      }

      signupBtn.disabled = true;
      signupBtn.textContent = "Creating account...";

      try {
        const data = await apiRequest("/admin/signup", {
          method: "POST",
          body: { name, email, phone, password },
        });

        saveSession(data, "admin");
        window.location.href = "admin-dashboard.html";
      } catch (error) {
        showError("signupError", error.message);
        signupBtn.disabled = false;
        signupBtn.textContent = "Sign Up";
      }
    });
  }
});

/**
 * Fill "Welcome, <name>" text and avatar initial from the logged-in
 * admin's details saved in localStorage during login.
 */
function loadAdminHeader() {
  const name = localStorage.getItem("name") || "Admin";
  const nameEl = document.getElementById("adminName");
  const avatarEl = document.getElementById("avatarInitial");

  if (nameEl) nameEl.textContent = name;
  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
}

/**
 * Fetch dashboard stats (total notices, students, departments, recent notices)
 * from the backend and fill the stat cards + recent notices table.
 */
async function loadDashboardStats() {
  const tableBody = document.getElementById("recentNoticesBody");

  try {
    const data = await apiRequest("/admin/dashboard", { method: "GET" });

    // Fill stat cards
    document.getElementById("statTotalNotices").textContent = data.totalNotices ?? 0;
    document.getElementById("statTotalStudents").textContent = data.totalStudents ?? 0;
    document.getElementById("statTotalDepartments").textContent = data.totalDepartments ?? 0;
    document.getElementById("statTodayViews").textContent = data.todayViews ?? 0;

    // Fill recent notices table
    if (!data.recentNotices || data.recentNotices.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No notices added yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = data.recentNotices
      .map((notice) => {
        const isExpired = notice.expiryDate && new Date(notice.expiryDate) < new Date();
        const statusHtml = isExpired
          ? `<span class="badge-tag badge-holidays">Expired</span>`
          : `<span class="status-active">Active</span>`;

        return `
        <tr>
          <td>${notice.title}</td>
          <td><span class="badge-tag ${getCategoryBadgeClass(notice.category)}">${notice.category}</span></td>
          <td>${notice.department}</td>
          <td>${formatDate(notice.createdAt)}</td>
          <td>${statusHtml}</td>
        </tr>`;
      })
      .join("");
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">Could not load notices: ${error.message}</td></tr>`;
  }
}

// ==========================================================================
// Functions below are used only on admin-notices.html (Manage Notices page)
// ==========================================================================

let allNoticesCache = []; // holds the full list so we can filter without re-fetching
let noticeIdPendingDelete = null; // remembers which notice the delete modal is acting on

/**
 * Sets up the Manage Notices page: fetches notices + departments,
 * wires up search/filter inputs and the delete confirmation modal.
 */
async function initNoticesPage() {
  await loadDepartmentsIntoFilter();
  await fetchAllNotices();

  // Re-render the table whenever search box or filters change
  document.getElementById("searchInput").addEventListener("input", renderNoticesTable);
  document.getElementById("categoryFilter").addEventListener("change", renderNoticesTable);
  document.getElementById("departmentFilter").addEventListener("change", renderNoticesTable);

  // Delete modal buttons
  document.getElementById("cancelDeleteBtn").addEventListener("click", closeDeleteModal);
  document.getElementById("confirmDeleteBtn").addEventListener("click", confirmDeleteNotice);
}

/**
 * Fetch all departments and fill the department filter dropdown
 */
async function loadDepartmentsIntoFilter() {
  const select = document.getElementById("departmentFilter");
  try {
    const departments = await apiRequest("/admin/department", { method: "GET" });
    departments.forEach((dept) => {
      const option = document.createElement("option");
      option.value = dept.departmentName;
      option.textContent = dept.departmentName;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Could not load departments for filter:", error.message);
  }
}

/**
 * Fetch every notice from the backend and store it in allNoticesCache,
 * then render the table for the first time.
 */
async function fetchAllNotices() {
  const tableBody = document.getElementById("noticesTableBody");
  try {
    allNoticesCache = await apiRequest("/notice/all", { method: "GET" });
    renderNoticesTable();
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">Could not load notices: ${error.message}</td></tr>`;
  }
}

/**
 * Applies the current search text + category + department filters
 * to allNoticesCache and redraws the table rows.
 */
function renderNoticesTable() {
  const tableBody = document.getElementById("noticesTableBody");
  const countLabel = document.getElementById("noticesCountLabel");

  const keyword = document.getElementById("searchInput").value.trim().toLowerCase();
  const category = document.getElementById("categoryFilter").value;
  const department = document.getElementById("departmentFilter").value;

  const filtered = allNoticesCache.filter((notice) => {
    const matchesKeyword = !keyword || notice.title.toLowerCase().includes(keyword);
    const matchesCategory = !category || notice.category === category;
    const matchesDepartment = !department || notice.department === department;
    return matchesKeyword && matchesCategory && matchesDepartment;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">No notices found.</td></tr>`;
    countLabel.textContent = "";
    return;
  }

  tableBody.innerHTML = filtered
    .map((notice) => {
      const isExpired = notice.expiryDate && new Date(notice.expiryDate) < new Date();
      const statusHtml = isExpired
        ? `<span class="badge-tag badge-holidays">Expired</span>`
        : `<span class="status-active">Active</span>`;

      return `
      <tr>
        <td>${notice.title}</td>
        <td><span class="badge-tag ${getCategoryBadgeClass(notice.category)}">${notice.category}</span></td>
        <td>${notice.department}</td>
        <td>${formatDate(notice.createdAt)}</td>
        <td>${statusHtml}</td>
        <td>
          <a href="admin-add-notice.html?id=${notice._id}" class="btn-view" style="margin-right:6px;">
            <i class="fa-solid fa-pen"></i>
          </a>
          <button class="btn-view" style="color:var(--color-danger); border-color:var(--color-danger);" onclick="openDeleteModal('${notice._id}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>`;
    })
    .join("");

  countLabel.textContent = `Showing ${filtered.length} of ${allNoticesCache.length} notices`;
}

/**
 * Opens the delete confirmation modal and remembers which notice
 * is about to be deleted.
 */
function openDeleteModal(noticeId) {
  noticeIdPendingDelete = noticeId;
  document.getElementById("deleteModal").style.display = "flex";
}

function closeDeleteModal() {
  noticeIdPendingDelete = null;
  document.getElementById("deleteModal").style.display = "none";
}

/**
 * Calls the DELETE API for the notice confirmed by the user,
 * then removes it from the cache and re-renders the table.
 */
async function confirmDeleteNotice() {
  if (!noticeIdPendingDelete) return;

  try {
    await apiRequest(`/notice/${noticeIdPendingDelete}`, { method: "DELETE" });
    allNoticesCache = allNoticesCache.filter((n) => n._id !== noticeIdPendingDelete);
    renderNoticesTable();
  } catch (error) {
    alert(`Could not delete notice: ${error.message}`);
  } finally {
    closeDeleteModal();
  }
}

// ==========================================================================
// Functions below are used only on admin-add-notice.html (Add/Edit Notice)
// ==========================================================================

let selectedNoticeFile = null; // holds the File object chosen by the user

/**
 * Sets up the Add/Edit Notice form:
 * - loads departments into the dropdown
 * - wires up the drag/click file upload zone
 * - if a ?id=... is present in the URL, loads that notice for editing
 * - wires up the submit handler
 */
async function initNoticeForm() {
  await loadDepartmentsIntoSelect();

  // ---------- File upload zone ----------
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("file");
  const fileNameLabel = document.getElementById("fileNameLabel");

  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      selectedNoticeFile = fileInput.files[0];
      fileNameLabel.textContent = selectedNoticeFile.name;
    }
  });

  // ---------- Check if we are editing an existing notice ----------
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("id");

  if (editId) {
    await loadNoticeForEdit(editId);
  }

  // ---------- Form submit (handles both Add and Edit) ----------
  document.getElementById("noticeForm").addEventListener("submit", handleNoticeSubmit);
}

/**
 * Loads all departments and adds them as options to the department dropdown
 * (in addition to the default "All Departments" option already in the HTML)
 */
async function loadDepartmentsIntoSelect() {
  const select = document.getElementById("department");
  try {
    const departments = await apiRequest("/admin/department", { method: "GET" });
    departments.forEach((dept) => {
      const option = document.createElement("option");
      option.value = dept.departmentName;
      option.textContent = dept.departmentName;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Could not load departments:", error.message);
  }
}

/**
 * Fetches an existing notice's details and fills the form
 * (used when the page is opened as admin-add-notice.html?id=xxxx)
 */
async function loadNoticeForEdit(noticeId) {
  document.getElementById("formTitle").textContent = "Edit Notice";
  document.getElementById("formSubtitle").textContent = "Update the notice details below.";
  document.getElementById("submitBtnText").textContent = "Update Notice";

  try {
    const notices = await apiRequest("/notice/all", { method: "GET" });
    const notice = notices.find((n) => n._id === noticeId);

    if (!notice) {
      showError("formError", "Notice not found.");
      return;
    }

    document.getElementById("noticeId").value = notice._id;
    document.getElementById("title").value = notice.title;
    document.getElementById("description").value = notice.description;
    document.getElementById("category").value = notice.category;
    document.getElementById("department").value = notice.department;

    // If notice has an expiry date, format it as YYYY-MM-DD for the date input
    if (notice.expiryDate) {
      document.getElementById("expiryDate").value = notice.expiryDate.split("T")[0];
    }
  } catch (error) {
    showError("formError", `Could not load notice: ${error.message}`);
  }
}

/**
 * Handles form submission for both adding a new notice and
 * updating an existing one (decided by whether noticeId has a value).
 */
async function handleNoticeSubmit(e) {
  e.preventDefault();
  hideError("formError");
  document.getElementById("formSuccess").classList.remove("show");

  const noticeId = document.getElementById("noticeId").value;
  const submitBtn = document.getElementById("submitBtn");

  // Use FormData because we may be sending a file (Multer expects multipart/form-data)
  const formData = new FormData();
  formData.append("title", document.getElementById("title").value.trim());
  formData.append("description", document.getElementById("description").value.trim());
  formData.append("category", document.getElementById("category").value);
  formData.append("department", document.getElementById("department").value);

  const expiryDate = document.getElementById("expiryDate").value;
  if (expiryDate) {
    formData.append("expiryDate", expiryDate);
  }

  if (selectedNoticeFile) {
    formData.append("file", selectedNoticeFile);
  }

  submitBtn.disabled = true;

  try {
    if (noticeId) {
      // Editing an existing notice
      await apiRequest(`/notice/${noticeId}`, {
        method: "PUT",
        body: formData,
        isFormData: true,
      });
    } else {
      // Adding a new notice
      await apiRequest("/notice", {
        method: "POST",
        body: formData,
        isFormData: true,
      });
    }

    showError("formSuccess", "Notice saved successfully!");
    document.getElementById("formSuccess").classList.add("show");

    // Redirect back to the notices list after a short delay
    setTimeout(() => {
      window.location.href = "admin-notices.html";
    }, 1200);
  } catch (error) {
    showError("formError", error.message);
  } finally {
    submitBtn.disabled = false;
  }
}

// ==========================================================================
// Functions below are used only on admin-departments.html
// ==========================================================================

/**
 * Sets up the Departments page: loads the table and wires up
 * the "Add Department" button.
 */
async function initDepartmentsPage() {
  await loadDepartmentsTable();

  document.getElementById("addDeptBtn").addEventListener("click", handleAddDepartment);

  // Also allow pressing Enter in the input field to submit
  document.getElementById("newDeptName").addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleAddDepartment();
  });
}

/**
 * Fetches all departments and renders them into the table.
 */
async function loadDepartmentsTable() {
  const tableBody = document.getElementById("departmentsTableBody");

  try {
    const departments = await apiRequest("/admin/department", { method: "GET" });

    if (departments.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="2" class="empty-state">No departments added yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = departments
      .map(
        (dept) => `
        <tr>
          <td>${dept.departmentName}</td>
          <td>${formatDate(dept.createdAt)}</td>
        </tr>`
      )
      .join("");
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="2" class="empty-state">Could not load departments: ${error.message}</td></tr>`;
  }
}

/**
 * Reads the "new department" input, sends it to the backend,
 * and refreshes the table on success.
 */
async function handleAddDepartment() {
  hideError("deptFormError");

  const input = document.getElementById("newDeptName");
  const departmentName = input.value.trim();

  if (!departmentName) {
    showError("deptFormError", "Please enter a department name.");
    return;
  }

  try {
    await apiRequest("/admin/department", {
      method: "POST",
      body: { departmentName },
    });

    input.value = "";
    await loadDepartmentsTable();
  } catch (error) {
    showError("deptFormError", error.message);
  }
}

// ==========================================================================
// Functions below are used only on admin-students.html
// ==========================================================================

let allStudentsCache = []; // full students list, used for client-side search

/**
 * Sets up the Students page: loads the table, loads departments into
 * the "Add Student" form, and wires up modal open/close + search.
 */
async function initStudentsPage() {
  await loadDepartmentsIntoStudentForm();
  await fetchAllStudents();

  document.getElementById("studentSearchInput").addEventListener("input", renderStudentsTable);

  document.getElementById("openAddStudentBtn").addEventListener("click", () => {
    document.getElementById("addStudentModal").style.display = "flex";
  });

  document.getElementById("closeAddStudentBtn").addEventListener("click", () => {
    document.getElementById("addStudentModal").style.display = "none";
  });

  document.getElementById("addStudentForm").addEventListener("submit", handleAddStudent);

  // ---------- Excel bulk upload ----------
  document.getElementById("openExcelUploadBtn").addEventListener("click", () => {
    document.getElementById("excelFileInput").click();
  });

  document.getElementById("excelFileInput").addEventListener("change", handleExcelUpload);

  // ---------- Batch management ----------
  await fetchAllBatches();
  document.getElementById("cancelDeleteBatchBtn").addEventListener("click", closeDeleteBatchModal);
  document.getElementById("confirmDeleteBatchBtn").addEventListener("click", confirmDeleteBatch);
}


/**
 * Loads departments into the "Department" dropdown inside the Add Student modal.
 * We use the department's _id as the option value because that's what the
 * backend Student model expects (ObjectId reference).
 */
async function loadDepartmentsIntoStudentForm() {
  const select = document.getElementById("studentDept");
  try {
    const departments = await apiRequest("/admin/department", { method: "GET" });
    departments.forEach((dept) => {
      const option = document.createElement("option");
      option.value = dept._id;
      option.textContent = dept.departmentName;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Could not load departments:", error.message);
  }
}

/**
 * Fetches all students from the backend and renders the table.
 */
async function fetchAllStudents() {
  const tableBody = document.getElementById("studentsTableBody");
  try {
    allStudentsCache = await apiRequest("/admin/student", { method: "GET" });
    renderStudentsTable();
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">Could not load students: ${error.message}</td></tr>`;
  }
}

/**
 * Filters allStudentsCache by the search box text and redraws the table.
 */
function renderStudentsTable() {
  const tableBody = document.getElementById("studentsTableBody");
  const countLabel = document.getElementById("studentsCountLabel");
  const keyword = document.getElementById("studentSearchInput").value.trim().toLowerCase();

  const filtered = allStudentsCache.filter(
    (s) =>
      !keyword ||
      s.name.toLowerCase().includes(keyword) ||
      s.registerNumber.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">No students found.</td></tr>`;
    countLabel.textContent = "";
    return;
  }

  tableBody.innerHTML = filtered
    .map(
      (s) => `
      <tr>
        <td>${s.registerNumber}</td>
        <td>${s.name}</td>
        <td>${s.department?.departmentName || "-"}</td>
        <td>${s.email}</td>
      </tr>`
    )
    .join("");

  countLabel.textContent = `Showing ${filtered.length} of ${allStudentsCache.length} students`;
}

/**
 * Handles the Add Student form submission - sends the new student's
 * details to the backend (Admin-only endpoint) and refreshes the table.
 */
async function handleAddStudent(e) {
  e.preventDefault();
  hideError("studentFormError");

  const name = document.getElementById("studentName").value.trim();
  const registerNumber = document.getElementById("studentRegNo").value.trim();
  const email = document.getElementById("studentEmail").value.trim();
  const department = document.getElementById("studentDept").value;
  const password = document.getElementById("studentPassword").value;
  const submitBtn = document.getElementById("addStudentSubmitBtn");

  submitBtn.disabled = true;
  submitBtn.textContent = "Adding...";

  try {
    await apiRequest("/admin/student", {
      method: "POST",
      body: { name, registerNumber, email, department, password },
    });

    // Reset form and close modal
    document.getElementById("addStudentForm").reset();
    document.getElementById("addStudentModal").style.display = "none";

    await fetchAllStudents();
  } catch (error) {
    showError("studentFormError", error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Add Student";
  }
}


/**
 * Handles Excel file selection - uploads it to the bulk-upload endpoint
 * and displays a success/failure summary, then refreshes the table.
 */
async function handleExcelUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const statusBox = document.getElementById("excelUploadStatus");
  const uploadBtn = document.getElementById("openExcelUploadBtn");

  // Basic client-side file type check
  const validExt = [".xlsx", ".xls"];
  const isValid = validExt.some((ext) => file.name.toLowerCase().endsWith(ext));
  if (!isValid) {
    statusBox.style.display = "block";
    statusBox.innerHTML = `<div class="form-error" style="display:block;">Only .xlsx or .xls files are allowed.</div>`;
    e.target.value = ""; // reset so the same file can be re-selected
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

  statusBox.style.display = "block";
  statusBox.innerHTML = `<p style="color:var(--color-text-secondary);">Uploading and processing Excel file...</p>`;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const result = await apiRequest("/admin/students/bulk-upload", {
      method: "POST",
      body: formData,
      isFormData: true,
    });

    const successCount = result.results.success.length;
    const failedCount = result.results.failed.length;

    let html = `<div style="padding:14px; border-radius:8px; background:#eafaf0; border:1px solid #b7e4c7; margin-bottom:10px;">
      <strong>${result.message}</strong>
    </div>`;

    if (failedCount > 0) {
      html += `<div style="max-height:200px; overflow-y:auto; font-size:13px;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="text-align:left; color:var(--color-text-secondary);">
              <th style="padding:6px;">Row</th>
              <th style="padding:6px;">Reason</th>
            </tr>
          </thead>
          <tbody>
            ${result.results.failed
              .map(
                (f) => `
              <tr style="border-top:1px solid #eee;">
                <td style="padding:6px;">${f.row.Name || "-"} (${f.row.RegisterNumber || "-"})</td>
                <td style="padding:6px; color:var(--color-danger);">${f.reason}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
    }

    statusBox.innerHTML = html;

    // Refresh the students table so newly added students appear immediately
    await fetchAllStudents();
    await fetchAllBatches();
  } catch (error) {
    statusBox.innerHTML = `<div class="form-error" style="display:block;">Upload failed: ${error.message}</div>`;
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<i class="fa-solid fa-file-excel"></i> Upload Excel';
    e.target.value = ""; // reset input so the same file can be re-uploaded if needed
  }
}

// ==========================================================================
// Batch management (Admin → Students page)
// ==========================================================================

let batchIdPendingDelete = null; // remembers which batch the delete modal is acting on

/**
 * Fetches all uploaded batches and renders the "Uploaded Batches" list.
 */
async function fetchAllBatches() {
  const container = document.getElementById("batchesList");
  try {
    const batches = await apiRequest("/admin/batches", { method: "GET" });
    renderBatchesList(batches);
  } catch (error) {
    container.innerHTML = `<p class="empty-state">Could not load batches: ${error.message}</p>`;
  }
}

/**
 * Renders the batch list with a Delete button for each batch.
 */
function renderBatchesList(batches) {
  const container = document.getElementById("batchesList");

  if (!batches || batches.length === 0) {
    container.innerHTML = `<p class="empty-state">No batches uploaded yet.</p>`;
    return;
  }

  container.innerHTML = batches
    .map((b) => {
      const label = `${b.department} - Section ${b.section} - ${b.startYear}-${b.endYear}`;
      return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px solid #eee;">
        <div>
          <div style="font-weight:600;">${label}</div>
          <div style="font-size:13px; color:var(--color-text-secondary);">
            Students: ${b.studentCount} &nbsp;|&nbsp; Uploaded: ${formatDate(b.createdAt)}
          </div>
        </div>
        <button class="btn-secondary" style="color:var(--color-danger); border-color:var(--color-danger);" onclick="openDeleteBatchModal('${b._id}', '${label}')">
          <i class="fa-solid fa-trash"></i> Delete Batch
        </button>
      </div>`;
    })
    .join("");
}

/**
 * Opens the delete-batch confirmation modal for the given batch.
 */
function openDeleteBatchModal(batchId, batchLabel) {
  batchIdPendingDelete = batchId;
  document.getElementById("deleteBatchMessage").textContent =
    `Are you sure you want to delete all students belonging to ${batchLabel}?`;
  document.getElementById("deleteBatchModal").style.display = "flex";
}

function closeDeleteBatchModal() {
  batchIdPendingDelete = null;
  document.getElementById("deleteBatchModal").style.display = "none";
}

/**
 * Calls the DELETE API for the batch confirmed by the user,
 * then refreshes both the batches list and the students table.
 */
async function confirmDeleteBatch() {
  if (!batchIdPendingDelete) return;

  try {
    const result = await apiRequest(`/admin/batches/${batchIdPendingDelete}`, {
      method: "DELETE",
    });
    alert(result.message);
    await fetchAllBatches();
    await fetchAllStudents();
  } catch (error) {
    alert(`Could not delete batch: ${error.message}`);
  } finally {
    closeDeleteBatchModal();
  }
}
// ==========================================================================
// Functions below are used only on admin-profile.html
// ==========================================================================

/**
 * Loads the admin's current profile details into the form,
 * and wires up the submit handler.
 */
async function initProfilePage() {
  try {
    const admin = await apiRequest("/admin/profile", { method: "GET" });

    document.getElementById("profileName").value = admin.name;
    document.getElementById("profileEmail").value = admin.email;
    document.getElementById("profilePhone").value = admin.phone || "";
    document.getElementById("profileNameDisplay").textContent = admin.name;
    document.getElementById("profileAvatar").textContent = admin.name.charAt(0).toUpperCase();
  } catch (error) {
    showError("profileError", `Could not load profile: ${error.message}`);
  }

  document.getElementById("profileForm").addEventListener("submit", handleProfileUpdate);
}

/**
 * Sends the updated name/phone to the backend and refreshes
 * the header greeting + localStorage so the change reflects everywhere.
 */
async function handleProfileUpdate(e) {
  e.preventDefault();
  hideError("profileError");
  document.getElementById("profileSuccess").classList.remove("show");

  const name = document.getElementById("profileName").value.trim();
  const phone = document.getElementById("profilePhone").value.trim();
  const submitBtn = document.getElementById("profileSubmitBtn");

  submitBtn.disabled = true;

  try {
    const updated = await apiRequest("/admin/profile", {
      method: "PUT",
      body: { name, phone },
    });

    localStorage.setItem("name", updated.name); // keep session in sync
    showError("profileSuccess", "Profile updated successfully!");
    document.getElementById("profileNameDisplay").textContent = updated.name;
  } catch (error) {
    showError("profileError", error.message);
  } finally {
    submitBtn.disabled = false;
  }
}

// ==========================================================================
// Functions below are used only on admin-settings.html
// ==========================================================================

/**
 * Loads the current system settings into the form,
 * and wires up the submit handler.
 */
async function initSettingsPage() {
  try {
    const settings = await apiRequest("/admin/settings", { method: "GET" });

    document.getElementById("collegeName").value = settings.collegeName || "";
    document.getElementById("collegeLogo").value = settings.collegeLogo || "";
    document.getElementById("notificationEmail").value = settings.notificationEmail || "";
    document.getElementById("dateFormat").value = settings.dateFormat || "DD MMM YYYY";
    document.getElementById("timeFormat").value = settings.timeFormat || "12 Hour (AM/PM)";
    document.getElementById("allowStudentRegistration").checked = !!settings.allowStudentRegistration;
    document.getElementById("maintenanceMode").checked = !!settings.maintenanceMode;
  } catch (error) {
    showError("settingsError", `Could not load settings: ${error.message}`);
  }

  document.getElementById("settingsForm").addEventListener("submit", handleSettingsSubmit);
}

/**
 * Sends the updated settings to the backend.
 */
async function handleSettingsSubmit(e) {
  e.preventDefault();
  hideError("settingsError");
  document.getElementById("settingsSuccess").classList.remove("show");

  const submitBtn = document.getElementById("settingsSubmitBtn");
  submitBtn.disabled = true;

  try {
    await apiRequest("/admin/settings", {
      method: "PUT",
      body: {
        collegeName: document.getElementById("collegeName").value.trim(),
        collegeLogo: document.getElementById("collegeLogo").value.trim(),
        notificationEmail: document.getElementById("notificationEmail").value.trim(),
        dateFormat: document.getElementById("dateFormat").value,
        timeFormat: document.getElementById("timeFormat").value,
        maintenanceMode: document.getElementById("maintenanceMode").checked,
      },
    });

    showError("settingsSuccess", "Settings saved successfully!");
  } catch (error) {
    showError("settingsError", error.message);
  } finally {
    submitBtn.disabled = false;
  }
}