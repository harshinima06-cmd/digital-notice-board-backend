// ==========================================================================
// student.js - Handles Student Login page logic
// (This file is only loaded on student-login.html)
// Note: Students CANNOT sign up themselves - only Admin creates accounts,
// so this file only has login logic (no signup form).
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // ---------- If we are on the Student Dashboard page, load data ----------
  if (document.getElementById("latestNoticesBody")) {
    requireAuth("student");
    loadStudentHeader();
    loadStudentDashboard();
  }

  // ---------- If we are on the All Notices page, load full list ----------
  if (document.getElementById("noticesTableBody") && document.getElementById("categoryFilter")) {
    requireAuth("student");
    initAllNoticesPage();
  }

  // ---------- If we are on the Department Notices page ----------
  if (document.getElementById("deptNoticesBody")) {
    requireAuth("student");
    initDepartmentNoticesPage();
  }

  // ---------- If we are on the Search Notices page ----------
  if (document.getElementById("searchForm")) {
    requireAuth("student");
    initSearchPage();
  }

  // ---------- If we are on the Student Profile page ----------
  if (document.getElementById("pFullName")) {
    requireAuth("student");
    initStudentProfilePage();
  }

  // ---------- If we are on the Notice Detail page ----------
  if (document.getElementById("noticeDetailCard")) {
    requireAuth("student");
    initNoticeDetailPage();
  }

  // ---------- If we are on the My Bookmarks page ----------
  if (document.getElementById("bookmarksTableBody")) {
    requireAuth("student");
    initBookmarksPage();
  }

  // ---------- Logout button (works on any student page that has it) ----------
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }

  const loginForm = document.getElementById("studentLoginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideError("loginError");

      const loginId = document.getElementById("loginId").value.trim();
      const password = document.getElementById("loginPassword").value;
      const loginBtn = document.getElementById("loginBtn");

      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";

      try {
        // loginId can be either email or register number - backend checks both
        const data = await apiRequest("/student/login", {
          method: "POST",
          body: { loginId, password },
        });

        saveSession(data, "student");
        // Also store department name for quick display on dashboard
        localStorage.setItem("department", data.department?.departmentName || "");

        window.location.href = "student-dashboard.html";
      } catch (error) {
        showError("loginError", error.message);
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Login <i class="fa-solid fa-arrow-right"></i>';
      }
    });
  }
});

// ==========================================================================
// BOOKMARK HELPERS - used across dashboard, notices, department, search
// and bookmarks pages to show/toggle the star icon on each notice
// ==========================================================================

let bookmarkedIds = new Set(); // holds the notice IDs this student has bookmarked

/**
 * Fetches the student's bookmarked notice IDs from the backend and
 * stores them in bookmarkedIds so render functions can check membership.
 */
async function loadBookmarkIds() {
  try {
    const ids = await apiRequest("/student/bookmark-ids", { method: "GET" });
    bookmarkedIds = new Set(ids);
  } catch (error) {
    console.error("Could not load bookmarks:", error.message);
  }
}

/**
 * Returns the HTML for a bookmark star button for a given notice,
 * filled if already bookmarked, outline if not.
 */
function renderBookmarkButton(noticeId) {
  const isBookmarked = bookmarkedIds.has(noticeId);
  return `
    <button
      class="btn-view"
      style="margin-right:6px; color:${isBookmarked ? "#c07a11" : "var(--color-text-secondary)"}; border-color:${isBookmarked ? "#c07a11" : "var(--color-border)"};"
      onclick="handleToggleBookmark('${noticeId}', this)"
      title="${isBookmarked ? "Remove bookmark" : "Save bookmark"}"
    >
      <i class="fa-${isBookmarked ? "solid" : "regular"} fa-bookmark"></i>
    </button>`;
}

/**
 * Calls the backend to add/remove a bookmark, then updates the
 * clicked button's icon in place (no full page reload needed).
 */
async function handleToggleBookmark(noticeId, buttonEl) {
  try {
    const result = await apiRequest(`/student/bookmark/${noticeId}`, { method: "PUT" });

    if (result.bookmarked) {
      bookmarkedIds.add(noticeId);
      buttonEl.innerHTML = '<i class="fa-solid fa-bookmark"></i>';
      buttonEl.style.color = "#c07a11";
      buttonEl.style.borderColor = "#c07a11";
      buttonEl.title = "Remove bookmark";
    } else {
      bookmarkedIds.delete(noticeId);
      buttonEl.innerHTML = '<i class="fa-regular fa-bookmark"></i>';
      buttonEl.style.color = "var(--color-text-secondary)";
      buttonEl.style.borderColor = "var(--color-border)";
      buttonEl.title = "Save bookmark";

      // If we're on the Bookmarks page itself, remove the row immediately
      if (document.getElementById("bookmarksTableBody")) {
        buttonEl.closest("tr")?.remove();
      }
    }
  } catch (error) {
    alert(`Could not update bookmark: ${error.message}`);
  }
}

// ==========================================================================
// Functions below are used only on student-dashboard.html
// ==========================================================================

let allStudentNoticesCache = []; // holds this student's visible notices for pill filtering

/**
 * Fills the header greeting, avatar initial, and department name
 * from the details saved in localStorage during login.
 */
function loadStudentHeader() {
  const name = localStorage.getItem("name") || "Student";
  const department = localStorage.getItem("department") || "-";

  const nameEl = document.getElementById("studentName");
  const avatarEl = document.getElementById("avatarInitial");
  const deptEl = document.getElementById("statMyDepartment");
  const dateEl = document.getElementById("statTodayDate");

  if (nameEl) nameEl.textContent = name;
  if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
  if (deptEl) deptEl.textContent = department;
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
}

/**
 * Fetches this student's visible notices (their department + "All Departments")
 * from the backend, fills the stat card, and renders the latest notices table.
 * Also wires up the category pill filters.
 */
async function loadStudentDashboard() {
  const tableBody = document.getElementById("latestNoticesBody");

  try {
    await loadBookmarkIds();
    allStudentNoticesCache = await apiRequest("/notice/student", { method: "GET" });

    document.getElementById("statTotalNotices").textContent = allStudentNoticesCache.length;

    renderStudentNoticesTable(allStudentNoticesCache.slice(0, 6)); // show latest 6 on dashboard

    // ---------- Category pill click handling ----------
    document.querySelectorAll(".pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        document.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");

        const category = pill.getAttribute("data-category");
        const filtered = category
          ? allStudentNoticesCache.filter((n) => n.category === category)
          : allStudentNoticesCache;

        renderStudentNoticesTable(filtered.slice(0, 6));
      });
    });
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">Could not load notices: ${error.message}</td></tr>`;
  }
}

/**
 * Renders a list of notices into the dashboard table
 * (used for both the default view and category-filtered views)
 */
function renderStudentNoticesTable(notices) {
  const tableBody = document.getElementById("latestNoticesBody");

  if (!notices || notices.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No notices found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = notices
    .map(
      (notice) => `
      <tr>
        <td>${notice.title}</td>
        <td><span class="badge-tag ${getCategoryBadgeClass(notice.category)}">${notice.category}</span></td>
        <td>${notice.department}</td>
        <td>${formatDate(notice.createdAt)}</td>
        <td>${renderBookmarkButton(notice._id)}<a href="student-notice-detail.html?id=${notice._id}" class="btn-view">View</a></td>
      </tr>`
    )
    .join("");
}

// ==========================================================================
// Functions below are used only on student-notices.html (All Notices page)
// ==========================================================================

let allNoticesForStudentCache = []; // full visible notices list for search/filter

/**
 * Sets up the All Notices page: fetches this student's visible notices
 * and wires up the search box + category filter.
 */
async function initAllNoticesPage() {
  const tableBody = document.getElementById("noticesTableBody");

  try {
    await loadBookmarkIds();
    allNoticesForStudentCache = await apiRequest("/notice/student", { method: "GET" });
    renderAllNoticesTable();
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">Could not load notices: ${error.message}</td></tr>`;
  }

  document.getElementById("searchInput").addEventListener("input", renderAllNoticesTable);
  document.getElementById("categoryFilter").addEventListener("change", renderAllNoticesTable);
}

/**
 * Applies the search text + category filter to allNoticesForStudentCache
 * and redraws the notices table.
 */
function renderAllNoticesTable() {
  const tableBody = document.getElementById("noticesTableBody");
  const countLabel = document.getElementById("noticesCountLabel");

  const keyword = document.getElementById("searchInput").value.trim().toLowerCase();
  const category = document.getElementById("categoryFilter").value;

  const filtered = allNoticesForStudentCache.filter((notice) => {
    const matchesKeyword = !keyword || notice.title.toLowerCase().includes(keyword);
    const matchesCategory = !category || notice.category === category;
    return matchesKeyword && matchesCategory;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No notices found.</td></tr>`;
    countLabel.textContent = "";
    return;
  }

  tableBody.innerHTML = filtered
    .map(
      (notice) => `
      <tr>
        <td>${notice.title}</td>
        <td><span class="badge-tag ${getCategoryBadgeClass(notice.category)}">${notice.category}</span></td>
        <td>${notice.department}</td>
        <td>${formatDate(notice.createdAt)}</td>
        <td>${renderBookmarkButton(notice._id)}<a href="student-notice-detail.html?id=${notice._id}" class="btn-view">View</a></td>
      </tr>`
    )
    .join("");

  countLabel.textContent = `Showing ${filtered.length} of ${allNoticesForStudentCache.length} notices`;
}

// ==========================================================================
// Functions below are used only on student-department-notices.html
// ==========================================================================

/**
 * Loads notices for this student and filters to show ONLY their
 * own department's notices (department name comes from localStorage,
 * which was set during login using the value the SERVER returned -
 * the actual access-control check still happens server-side in
 * getStudentNotices, so this filter is just for display purposes).
 */
async function initDepartmentNoticesPage() {
  const tableBody = document.getElementById("deptNoticesBody");
  const department = localStorage.getItem("department") || "";

  document.getElementById("deptTitleName").textContent = department;

  try {
    await loadBookmarkIds();
    const notices = await apiRequest("/notice/student", { method: "GET" });
    const deptOnlyNotices = notices.filter((n) => n.department === department);

    if (deptOnlyNotices.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">No notices for ${department} yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = deptOnlyNotices
      .map(
        (notice) => `
        <tr>
          <td>${notice.title}</td>
          <td><span class="badge-tag ${getCategoryBadgeClass(notice.category)}">${notice.category}</span></td>
          <td>${formatDate(notice.createdAt)}</td>
          <td>${renderBookmarkButton(notice._id)}<a href="student-notice-detail.html?id=${notice._id}" class="btn-view">View</a></td>
        </tr>`
      )
      .join("");
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">Could not load notices: ${error.message}</td></tr>`;
  }
}

// ==========================================================================
// Functions below are used only on student-search.html
// ==========================================================================

/**
 * Wires up the search form. On submit, calls the backend /notice/search
 * endpoint with keyword + category, then applies the date range filter
 * on the client side (backend does not filter by date).
 */
function initSearchPage() {
  document.getElementById("searchForm").addEventListener("submit", handleSearchSubmit);
}

async function handleSearchSubmit(e) {
  e.preventDefault();

  const tableBody = document.getElementById("searchResultsBody");
  const countLabel = document.getElementById("searchResultsCount");

  const keyword = document.getElementById("searchKeyword").value.trim();
  const category = document.getElementById("searchCategory").value;
  const fromDate = document.getElementById("fromDate").value;
  const toDate = document.getElementById("toDate").value;

  tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">Searching...</td></tr>`;

  // Build query string - only include params that have a value
  // (fromDate/toDate are now filtered on the backend, not client-side)
  const params = new URLSearchParams();
  if (keyword) params.append("keyword", keyword);
  if (category) params.append("category", category);
  if (fromDate) params.append("fromDate", fromDate);
  if (toDate) params.append("toDate", toDate);

  try {
    await loadBookmarkIds();
    const results = await apiRequest(`/notice/search?${params.toString()}`, { method: "GET" });

    if (results.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No notices matched your search.</td></tr>`;
      countLabel.textContent = "";
      return;
    }

    tableBody.innerHTML = results
      .map(
        (notice) => `
        <tr>
          <td>${notice.title}</td>
          <td><span class="badge-tag ${getCategoryBadgeClass(notice.category)}">${notice.category}</span></td>
          <td>${notice.department}</td>
          <td>${formatDate(notice.createdAt)}</td>
          <td>${renderBookmarkButton(notice._id)}<a href="student-notice-detail.html?id=${notice._id}" class="btn-view">View</a></td>
        </tr>`
      )
      .join("");

    countLabel.textContent = `Showing 1 to ${results.length} of ${results.length} results`;
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">Search failed: ${error.message}</td></tr>`;
  }
}

// ==========================================================================
// Functions below are used only on student-profile.html
// ==========================================================================

/**
 * Fetches the logged-in student's profile details from the backend
 * and fills the read-only profile fields.
 */
async function initStudentProfilePage() {
  try {
    const student = await apiRequest("/student/profile", { method: "GET" });

    document.getElementById("profileNameBig").textContent = student.name;
    document.getElementById("profileRegNoBig").textContent = student.registerNumber;
    document.getElementById("profileAvatarBig").textContent = student.name.charAt(0).toUpperCase();

    document.getElementById("pFullName").value = student.name;
    document.getElementById("pRegNo").value = student.registerNumber;
    document.getElementById("pDepartment").value = student.department?.departmentName || "-";
    document.getElementById("pEmail").value = student.email;
  } catch (error) {
    showError("profileLoadError", `Could not load profile: ${error.message}`);
  }
}

// ==========================================================================
// Functions below are used only on student-notice-detail.html
// ==========================================================================

/**
 * Reads the ?id=... from the URL, finds that notice among this student's
 * visible notices, and renders its full details (including the attached
 * file, if any).
 */
async function initNoticeDetailPage() {
  const card = document.getElementById("noticeDetailCard");

  const urlParams = new URLSearchParams(window.location.search);
  const noticeId = urlParams.get("id");

  if (!noticeId) {
    card.innerHTML = `<p class="empty-state">No notice specified.</p>`;
    return;
  }

  try {
    // We reuse /notice/student (the same secure, department-filtered list)
    // and find the one matching the id - this way a student can never
    // fetch a notice they aren't allowed to see.
    await loadBookmarkIds();
    const notices = await apiRequest("/notice/student", { method: "GET" });
    const notice = notices.find((n) => n._id === noticeId);

    if (!notice) {
      card.innerHTML = `<p class="empty-state">Notice not found or not accessible to you.</p>`;
      return;
    }

    const fileUrl = getFileUrl(notice.file);
    const isImage = notice.file && /\.(jpg|jpeg|png)$/i.test(notice.file);
    const isPdf = notice.file && /\.pdf$/i.test(notice.file);
    const isBookmarked = bookmarkedIds.has(notice._id);

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:16px;">
        <h2 style="font-size:20px;">${notice.title}</h2>
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="badge-tag ${getCategoryBadgeClass(notice.category)}">${notice.category}</span>
          <button
            class="btn-secondary"
            style="color:${isBookmarked ? "#c07a11" : "var(--color-text)"};"
            onclick="handleToggleBookmark('${notice._id}', this)"
            title="${isBookmarked ? "Remove bookmark" : "Save bookmark"}"
          >
            <i class="fa-${isBookmarked ? "solid" : "regular"} fa-bookmark"></i>
          </button>
        </div>
      </div>

      <div style="display:flex; gap:20px; font-size:13px; color:var(--color-text-secondary); margin-bottom:20px;">
        <span><i class="fa-solid fa-building-columns"></i> ${notice.department}</span>
        <span><i class="fa-solid fa-calendar"></i> ${formatDate(notice.createdAt)}</span>
      </div>

      <p style="line-height:1.7; margin-bottom:24px; white-space:pre-wrap;">${notice.description}</p>

      ${
        fileUrl
          ? `
        <div style="border:1px solid var(--color-border); border-radius:var(--radius-md); padding:16px;">
          ${
            isImage
              ? `<img src="${fileUrl}" alt="Notice attachment" style="max-width:100%; border-radius:8px; margin-bottom:12px;" />`
              : ""
          }
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <a href="${fileUrl}" target="_blank" class="btn-secondary">
              <i class="fa-solid fa-eye"></i> View
            </a>
            <button class="btn-primary" onclick="downloadFile('${fileUrl}', '${notice.title.replace(/'/g, "")}')">
              <i class="fa-solid fa-download"></i> Download
            </button>
          </div>
        </div>`
          : `<p style="color:var(--color-text-secondary); font-size:13px;"><i class="fa-solid fa-circle-info"></i> No file attached to this notice.</p>`
      }
    `;
  } catch (error) {
    card.innerHTML = `<p class="empty-state">Could not load notice: ${error.message}</p>`;
  }
}

// ==========================================================================
// Functions below are used only on student-bookmarks.html
// ==========================================================================

/**
 * Fetches all notices this student has bookmarked and renders them.
 * Every row's bookmark button here is always "filled" - clicking it
 * removes the bookmark and the row disappears (handled in
 * handleToggleBookmark, which checks for the bookmarksTableBody element).
 */
async function initBookmarksPage() {
  const tableBody = document.getElementById("bookmarksTableBody");

  try {
    await loadBookmarkIds();
    const notices = await apiRequest("/student/bookmarks", { method: "GET" });

    if (!notices || notices.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">You haven't bookmarked any notices yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = notices
      .map(
        (notice) => `
        <tr>
          <td>${notice.title}</td>
          <td><span class="badge-tag ${getCategoryBadgeClass(notice.category)}">${notice.category}</span></td>
          <td>${notice.department}</td>
          <td>${formatDate(notice.createdAt)}</td>
          <td>${renderBookmarkButton(notice._id)}<a href="student-notice-detail.html?id=${notice._id}" class="btn-view">View</a></td>
        </tr>`
      )
      .join("");
  } catch (error) {
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">Could not load bookmarks: ${error.message}</td></tr>`;
  }
}
