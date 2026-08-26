// ========================================
// CONFIGURATION
// ========================================
const API_URL = 'https://care-it-backend.onrender.com/api';
const API_TIMEOUT = 10000; // 10 seconds

// ========================================
// STATE MANAGEMENT
// ========================================
let allAssets = [];
let editingAssetId = null;
let statusChart = null;
let locationChart = null;
let departmentChart = null;
let resetEmail = null; // For password reset flow
let selectedAssetIds = [];

function animateCount(elementId, target, duration = 900) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const start = 0;
    const startTime = performance.now();
    function step(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
        const current = Math.floor(start + (target - start) * eased);
        el.textContent = current;
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = target;
    }
    requestAnimationFrame(step);
}

// ========================================
// API CALL HELPER
// ========================================
async function apiCall(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
        method,
        headers,
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        const response = await fetch(`${API_URL}${endpoint}`, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userRole');
            switchPage('userLoginPage');
            return null;
        }

        if (response.status === 403) {
            showMessage('assetMessage', 'Access Denied: Only admins can perform this action', 'error', 0);
            return null;
        }

        if (!response.ok) {
            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const error = await response.json();
                throw new Error(error.message || 'API Error');
            } else {
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }
        }

        if (response.status === 204) {
            return null;
        }

        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            throw new Error('Invalid response format from server');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Request timeout - Server not responding');
        }
        throw error;
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function showMessage(containerId, message, type = 'error', duration = 3000) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = message;
    container.className = `alert ${type}`;
    container.style.display = 'block';

    if (type === 'success' && duration > 0) {
        setTimeout(() => {
            container.style.display = 'none';
        }, duration);
    }
}

function formatCurrency(amount) {
    if (!amount) return 'KES 0';
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0
    }).format(amount);
}

function getStatusBadgeClass(status) {
    const s = (status || '').toString();
    if (s.startsWith('Available')) return 'badge-green';
    if (s.startsWith('Assigned') || s.includes('In Use')) return 'badge-blue';
    if (s.includes('In Storage')) return 'badge-yellow';
    if (s.includes('Under Repair') || s.includes('Can be Fixed') || s.includes('Faulty') || s.includes('Damaged')) return 'badge-red';
    if (s === 'Lost') return 'badge-red';
    if (s === 'Aproved for disposal' || s === 'Disposed') return 'badge-red';
    return 'badge-blue';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
}

function formatTime(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString();
}

function isAuthenticated() {
    return !!localStorage.getItem('token');
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function getUserRole() {
    return localStorage.getItem('userRole');
}

function isAdmin() {
    return getUserRole() === 'admin';
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    switchPage('userLoginPage');
}

function downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// ========================================
// PAGE NAVIGATION
// ========================================
function switchPage(pageId, options = {}) {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });

    const page = document.getElementById(pageId);
    if (page) {
        page.style.display = 'block';
    }

    if (!options.skipSave && pageId !== 'userLoginPage' && pageId !== 'userRegisterPage') {
        try { localStorage.setItem('careit_active_page', pageId); } catch (e) {}
    }

    if (pageId === 'dashboardPage') {
        renderHeader('header');
        loadDashboardData();
    } else if (pageId === 'assetsPage') {
        renderHeader('headerAssets');
        renderHeaderActions();
        loadAssets();
    } else if (pageId === 'usersPage') {
        renderHeader('headerUsers');
        loadUsers();
    } else if (pageId === 'reportsPage') {
        renderHeader('headerReports');
        loadReports();
    }
}

function initializeApp() {
    if (isAuthenticated()) {
        let savedPage = null;
        try { savedPage = localStorage.getItem('careit_active_page'); } catch (e) {}
        const validPages = ['dashboardPage', 'assetsPage', 'usersPage', 'reportsPage'];
        if (savedPage && validPages.includes(savedPage) && document.getElementById(savedPage)) {
            switchPage(savedPage);
        } else {
            switchPage('dashboardPage');
        }
    } else {
        switchPage('userLoginPage', { skipSave: true });
    }
}

// ========================================
// HEADER COMPONENT
// ========================================
function renderHeader(headerId = 'header') {
    const header = document.getElementById(headerId);
    if (!header) return;

    const user = getUser();
    const userRole = getUserRole();
    const roleDisplay = userRole === 'admin' ? 'ADMIN' : 'USER';

    let adminLinkHTML = '';
    if (userRole === 'admin') {
        adminLinkHTML = '<a href="#" onclick="switchPage(\'assetsPage\'); return false;">Admin Panel</a>';
    }

    let headerHTML = '<div class="header-container">';
    headerHTML += '<div class="header-logo">';
    headerHTML += '<h1>CARE IT Assets</h1>';
    headerHTML += '<span class="role-badge">' + roleDisplay + '</span>';
    headerHTML += '</div>';
    headerHTML += '<nav class="header-nav">';
    headerHTML += '<a href="#" onclick="switchPage(\'dashboardPage\'); return false;">Dashboard</a>';
    headerHTML += '<a href="#" onclick="switchPage(\'assetsPage\'); return false;">Assets</a>';
    headerHTML += adminLinkHTML;
    headerHTML += '</nav>';
    headerHTML += '<div class="header-right">';
    headerHTML += '<div class="user-info">';
    headerHTML += '<span>' + (user?.email || '') + '</span>';
    headerHTML += '<span class="role-label">' + (userRole === 'admin' ? 'Admin' : 'User') + '</span>';
    headerHTML += '</div>';
    headerHTML += '<button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>';
    headerHTML += '</div>';
    headerHTML += '<button class="mobile-menu-btn" onclick="toggleMobileMenu()">Menu</button>';
    headerHTML += '</div>';

    header.innerHTML = headerHTML;
}

function renderHeaderActions() {
    const headerActions = document.getElementById('headerActions');
    if (!headerActions) return;

    const userRole = getUserRole();
    let actionsHTML = '';

    if (userRole === 'admin') {
        actionsHTML = '<button class="btn btn-primary" onclick="openAssetModal()">Add Asset</button>';
        actionsHTML += '<button class="btn btn-secondary" onclick="openImportModal()">Import Excel</button>';
        actionsHTML += '<button class="btn btn-secondary" onclick="exportToExcel()">Export Excel</button>';
        actionsHTML += '<button class="btn btn-secondary" onclick="exportToPdf()">Export PDF</button>';
    } else {
        actionsHTML = '<button class="btn btn-secondary" onclick="exportToExcel()">Export Excel</button>';
        actionsHTML += '<button class="btn btn-secondary" onclick="exportToPdf()">Export PDF</button>';
    }

    headerActions.innerHTML = actionsHTML;
}

function toggleMobileMenu() {
    const nav = document.querySelector('.header-nav');
    if (nav) {
        nav.classList.toggle('active');
    }
}

// ========================================
// AUTHENTICATION HANDLERS
// ========================================
async function handleUserLogin(event) {
    event.preventDefault();

    const email = document.getElementById('userLoginEmail').value;
    const password = document.getElementById('userLoginPassword').value;
    const loginBtn = document.getElementById('userLoginBtn');

    try {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Signing in...';

        const response = await apiCall('/auth/login', 'POST', { email, password });

        if (!response || !response.token) {
            throw new Error('Invalid response from server');
        }

        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('userRole', response.user.role);

        showMessage('userLoginMessage', 'Login successful! Redirecting...', 'success', 1500);

        setTimeout(() => {
            initializeApp();
        }, 1500);
    } catch (error) {
        showMessage('userLoginMessage', error.message || 'Login failed', 'error', 0);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();

    const email = document.getElementById('forgotPasswordEmail').value;
    const btn = document.getElementById('forgotPasswordBtn');

    try {
        btn.disabled = true;
        btn.textContent = 'Sending...';

        const response = await apiCall('/auth/forgot-password', 'POST', { email });

        resetEmail = email;
        showMessage('forgotPasswordMessage', 'Check your email for a verification code!', 'success', 0);
        
        setTimeout(() => {
            switchPage('verifyCodePage');
        }, 1500);

    } catch (error) {
        showMessage('forgotPasswordMessage', error.message || 'Error sending code', 'error', 0);
        btn.disabled = false;
        btn.textContent = 'Send Verification Code';
    }
}

async function handleVerifyCode(event) {
    event.preventDefault();

    const code = document.getElementById('verificationCode').value;
    const btn = document.getElementById('verifyCodeBtn');

    try {
        btn.disabled = true;
        btn.textContent = 'Verifying...';

        const response = await apiCall('/auth/verify-code', 'POST', {
            email: resetEmail,
            code: code
        });

        showMessage('verifyCodeMessage', 'Code verified! Now reset your password.', 'success', 0);
        
        setTimeout(() => {
            switchPage('resetPasswordPage');
        }, 1500);

    } catch (error) {
        showMessage('verifyCodeMessage', error.message || 'Invalid code', 'error', 0);
        btn.disabled = false;
        btn.textContent = 'Verify Code';
    }
}

async function handleResetPassword(event) {
    event.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const btn = document.getElementById('resetPasswordBtn');

    if (newPassword !== confirmPassword) {
        showMessage('resetPasswordMessage', 'Passwords do not match', 'error', 0);
        return;
    }

    if (newPassword.length < 6) {
        showMessage('resetPasswordMessage', 'Password must be at least 6 characters', 'error', 0);
        return;
    }

    try {
        btn.disabled = true;
        btn.textContent = 'Resetting...';

        await apiCall('/auth/reset-password', 'POST', {
            email: resetEmail,
            newPassword: newPassword
        });

        showMessage('resetPasswordMessage', 'Password reset successful! Redirecting to login...', 'success');

        setTimeout(() => {
            resetEmail = null;
            document.getElementById('resetPasswordForm').reset();
            switchPage('userLoginPage');
        }, 2000);

    } catch (error) {
        showMessage('resetPasswordMessage', error.message || 'Error resetting password', 'error', 0);
        btn.disabled = false;
        btn.textContent = 'Reset Password';
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const registerBtn = document.getElementById('registerBtn');

    try {
        registerBtn.disabled = true;
        registerBtn.textContent = 'Creating account...';

        await apiCall('/auth/register', 'POST', { name, email, password });

        showMessage('registerMessage', 'Account created! Redirecting to login...', 'success', 2000);

        setTimeout(() => {
            switchPage('userLoginPage');
        }, 2000);
    } catch (error) {
        showMessage('registerMessage', error.message || 'Registration failed', 'error', 0);
        registerBtn.disabled = false;
        registerBtn.textContent = 'Create Account';
    }
}

// ========================================
// DASHBOARD FUNCTIONS
// ========================================
const ISSUABLE_STATUSES = ["Available", "In Storage"];

function setAvailabilityPill(pillId, available, total) {
    const pill = document.getElementById(pillId);
    if (!pill) return;
    const av = Number(available || 0);
    const tot = Number(total || 0);
    const pct = tot > 0 ? Math.round((av / tot) * 100) : 0;
    pill.textContent = av + ' issuable of ' + tot + ' (' + pct + '%)';
    pill.classList.toggle('zero', av === 0);
}

async function loadDashboardData() {
    try {
        // Set dashboard date
        const dateEl = document.querySelector('#dashboardDate span');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        const [statusData, locationData, departmentData, assetsData, categoryData, categoryFaulty, categoryGood, categoryLost,
            availTotals, availByCat, availByDept, availByLoc, availByStatus, availByCondition
        ] = await Promise.all([
            apiCall('/dashboard/status', 'GET'),
            apiCall('/dashboard/location', 'GET'),
            apiCall('/dashboard/department', 'GET'),
            apiCall('/assets', 'GET'),
            apiCall('/dashboard/category', 'GET'),
            apiCall('/dashboard/category/faulty', 'GET'),
            apiCall('/dashboard/category/good', 'GET'),
            apiCall('/dashboard/category/lost', 'GET'),
            apiCall('/dashboard/available/total', 'GET'),
            apiCall('/dashboard/available/category', 'GET'),
            apiCall('/dashboard/available/department', 'GET'),
            apiCall('/dashboard/available/location', 'GET'),
            apiCall('/dashboard/available/status', 'GET'),
            apiCall('/dashboard/available/condition', 'GET')
        ]);

        window.__dashboardAllAssets = assetsData;

        function statCounts(arr) {
            const c = { total: arr.length, available: 0, assigned: 0, inStorage: 0, underRepair: 0, lost: 0, issuable: 0 };
            arr.forEach(a => {
                const s = (a.status || '').toString().trim().toLowerCase();
                if (s === 'available') { c.available++; c.issuable++; }
                else if (s === 'assigned') c.assigned++;
                else if (s === 'in storage') { c.inStorage++; c.issuable++; }
                else if (s === 'under repair') c.underRepair++;
                else if (s === 'lost') c.lost++;
            });
            return c;
        }
        const counts = statCounts(assetsData);
        const totalCount = counts.total;
        const availableCount = counts.available;
        const assignedCount = counts.assigned;
        const storageCount = counts.inStorage;
        const repairCount = counts.underRepair;
        const lostCount = counts.lost;
        const issuableCount = counts.issuable;

        const setStat = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setStat('totalAssets', totalCount);
        setStat('availableAssets', availableCount);
        setStat('assignedAssets', assignedCount);
        setStat('storageAssets', storageCount);
        setStat('repairAssets', repairCount);
        setStat('lostAssets', lostCount);
        animateCount('totalAssets', totalCount);
        animateCount('availableAssets', availableCount);
        animateCount('assignedAssets', assignedCount);
        animateCount('storageAssets', storageCount);
        animateCount('repairAssets', repairCount);
        animateCount('lostAssets', lostCount);

        const normStatus = s => (s || '').toString().trim().toLowerCase();
        const isIssuable = a => { const s = normStatus(a.status); return s === 'available' || s === 'in storage'; };
        const normCond = c => (c || '').toString().trim().toLowerCase();
        const isGood = a => { const c = normCond(a.condition); return c === 'good' || c === 'new'; };
        const isFaulty = a => { const c = normCond(a.condition); return c === 'faulty' || c === 'damaged'; };
        const isLost = a => normStatus(a.status) === 'lost';

        function groupByField(arr, field, extraFilter) {
            const map = {};
            arr.forEach(a => {
                if (extraFilter && !extraFilter(a)) return;
                const key = a[field] || (field === 'department' ? 'Unassigned' : 'Unknown');
                map[key] = (map[key] || 0) + 1;
            });
            return Object.entries(map).map(([k, v]) => ({ _id: k, count: v })).sort((x, y) => y.count - x.count);
        }
        function groupIssuable(arr, field) {
            const map = {};
            arr.forEach(a => {
                if (!isIssuable(a)) return;
                const key = a[field] || (field === 'department' ? 'Unassigned' : 'Unknown');
                map[key] = (map[key] || 0) + 1;
            });
            return map;
        }

        const locAvailMap = groupIssuable(assetsData, 'location');
        const deptAvailMap = groupIssuable(assetsData, 'department');
        const catAvailMap = groupIssuable(assetsData, 'category');

        setAvailabilityPill('avail-category', issuableCount, totalCount);
        setAvailabilityPill('avail-status', issuableCount, totalCount);
        setAvailabilityPill('avail-department', issuableCount, totalCount);
        setAvailabilityPill('avail-location', issuableCount, totalCount);
        setAvailabilityPill('avail-categorygood', assetsData.filter(isGood).filter(isIssuable).length, issuableCount);
        setAvailabilityPill('avail-categoryfaulty', assetsData.filter(isFaulty).filter(isIssuable).length, issuableCount);
        setAvailabilityPill('avail-categorylost', 0, issuableCount);
        setAvailabilityPill('avail-statustable', issuableCount, totalCount);
        setAvailabilityPill('avail-healthtable', issuableCount, totalCount);
        setAvailabilityPill('avail-locationstable', issuableCount, totalCount);
        setAvailabilityPill('avail-departmentstable', issuableCount, totalCount);
        setAvailabilityPill('avail-categorytable', issuableCount, totalCount);

        const statusCounts = { available: 0, 'in storage': 0, assigned: 0, 'under repair': 0, faulty: 0, lost: 0 };
        assetsData.forEach(a => {
            const s = normStatus(a.status);
            if (statusCounts[s] !== undefined) statusCounts[s]++;
            if (isFaulty(a) && s !== 'under repair') statusCounts.faulty++;
        });
        statusCounts.faultyUnderRepair = (statusCounts['under repair'] || 0) + (statusCounts.faulty || 0);
        const statusRows = [
            { label: 'Available (Ready for Issuing)', key: 'available', badgeLabel: 'Available' },
            { label: 'In Storage (Can be Issued to Staff)', key: 'in storage', badgeLabel: 'In Storage' },
            { label: 'Assigned (Assigned to Staff - In Use)', key: 'assigned', badgeLabel: 'Assigned' },
            { label: 'Faulty / Under Repair (Can be Fixed)', key: 'faultyUnderRepair', badgeLabel: 'Under Repair' },
            { label: 'Lost', key: 'lost', badgeLabel: 'Lost' }
        ];
        const statusTableBody = document.getElementById('statusTableBody');
        statusTableBody.innerHTML = statusRows.map(r => {
            const cnt = statusCounts[r.key] || 0;
            const av = (r.key === 'available' || r.key === 'in storage') ? cnt : 0;
            return '<tr>' +
                '<td><span class="badge ' + getStatusBadgeClass(r.badgeLabel) + '">' + r.label + '</span></td>' +
                '<td><strong>' + cnt + '</strong></td>' +
                '<td>' + (av > 0 ? '<strong style="color:#10b981">✓ ' + av + '</strong>' : '<span style="color:#94a3b8">—</span>') + '</td>' +
                '</tr>';
        }).join('');

        const localLocationData = groupByField(assetsData, 'location');
        const localDepartmentData = groupByField(assetsData, 'department');
        const localCategoryData = groupByField(assetsData, 'category');
        const localCatGood = groupByField(assetsData, 'category', isGood);
        const localCatFaulty = groupByField(assetsData, 'category', isFaulty);
        const localCatLost = groupByField(assetsData, 'category', isLost);

        const locationTableBody = document.getElementById('locationTableBody');
        locationTableBody.innerHTML = localLocationData.slice(0, 8).map(item => {
            const av = locAvailMap[item._id] || 0;
            return '<tr>' +
                '<td>' + item._id + '</td>' +
                '<td><strong>' + item.count + '</strong></td>' +
                '<td>' + (av > 0 ? '<strong style="color:#10b981">✓ ' + av + '</strong>' : '<span style="color:#94a3b8">—</span>') + '</td>' +
                '</tr>';
        }).join('');

        const departmentTableBody = document.getElementById('departmentTableBody');
        if (departmentTableBody) {
            departmentTableBody.innerHTML = localDepartmentData.slice(0, 8).map(item => {
                const av = deptAvailMap[item._id] || 0;
                return '<tr>' +
                    '<td>' + item._id + '</td>' +
                    '<td><strong>' + item.count + '</strong></td>' +
                    '<td>' + (av > 0 ? '<strong style="color:#10b981">✓ ' + av + '</strong>' : '<span style="color:#94a3b8">—</span>') + '</td>' +
                    '</tr>';
            }).join('');
        }

        const categoryAllTableBody = document.getElementById('categoryAllTableBody');
        if (categoryAllTableBody) {
            categoryAllTableBody.innerHTML = localCategoryData.map(item => {
                const av = catAvailMap[item._id] || 0;
                return '<tr>' +
                    '<td>' + item._id + '</td>' +
                    '<td><strong>' + item.count + '</strong></td>' +
                    '<td>' + (av > 0 ? '<strong style="color:#10b981">✓ ' + av + '</strong>' : '<span style="color:#94a3b8">—</span>') + '</td>' +
                    '</tr>';
            }).join('');
        }

        const healthMap = {};
        const allCats = new Set();
        localCatGood.forEach(d => { allCats.add(d._id); healthMap[d._id] = healthMap[d._id] || { good: 0, faulty: 0, lost: 0 }; healthMap[d._id].good = d.count; });
        localCatFaulty.forEach(d => { allCats.add(d._id); healthMap[d._id] = healthMap[d._id] || { good: 0, faulty: 0, lost: 0 }; healthMap[d._id].faulty = d.count; });
        localCatLost.forEach(d => { allCats.add(d._id); healthMap[d._id] = healthMap[d._id] || { good: 0, faulty: 0, lost: 0 }; healthMap[d._id].lost = d.count; });
        localCategoryData.forEach(d => allCats.add(d._id));

        const healthTableBody = document.getElementById('categoryHealthTableBody');
        if (healthTableBody) {
            const rows = [...allCats].sort().map(cat => {
                const h = healthMap[cat] || { good: 0, faulty: 0, lost: 0 };
                const av = catAvailMap[cat] || 0;
                return '<tr>' +
                    '<td>' + cat + '</td>' +
                    '<td><strong style="color:#10b981">' + h.good + '</strong></td>' +
                    '<td><strong style="color:#f59e0b">' + h.faulty + '</strong></td>' +
                    '<td><strong style="color:#ef4444">' + h.lost + '</strong></td>' +
                    '<td>' + (av > 0 ? '<strong style="color:#10b981">✓ ' + av + '</strong>' : '<span style="color:#94a3b8">—</span>') + '</td>' +
                    '</tr>';
            });
            healthTableBody.innerHTML = rows.join('') || '<tr><td colspan="5" class="text-center no-data">No category data</td></tr>';
        }

        const chartStatusInput = statusRows.map(r => ({ _id: r.badgeLabel, count: statusCounts[r.key] || 0 }));
        createStatusChart(chartStatusInput);
        createLocationChart(localLocationData);
        createDepartmentChart(localDepartmentData);
        createCategoryAllChart(localCategoryData);
        createCategoryGoodChart(localCatGood);
        createCategoryFaultyChart(localCatFaulty);
        createCategoryLostChart(localCatLost);

        // Apply filters preview if any set
        applyDashboardFilters();
    } catch (error) {
        showMessage('dashboardMessage', 'Error loading dashboard: ' + error.message, 'error', 0);
    }
}

function applyDashboardFilters() {
    const all = window.__dashboardAllAssets || [];
    const search = (document.getElementById('dashboardSearchInput')?.value || '').toString().toLowerCase().trim();
    const statusF = document.getElementById('dashboardStatusFilter')?.value || '';
    const categoryF = document.getElementById('dashboardCategoryFilter')?.value || '';
    const preview = document.getElementById('dashboardFilterPreview');
    const matchesBody = document.getElementById('dashboardMatchesBody');
    const matchCount = document.getElementById('dashboardMatchCount');

    const matches = all.filter(a => {
        if (statusF && (a.status || '').toString().trim().toLowerCase() !== statusF.toLowerCase()) return false;
        if (categoryF && (a.category || '').toString().trim().toLowerCase() !== categoryF.toLowerCase()) return false;
        if (search) {
            const hay = [a.assetTag, a.serialNumber, a.brand, a.model, a.assignedTo, a.location, a.department, a.condition]
                .filter(Boolean).join(' ').toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    const hasAny = !!(search || statusF || categoryF);
    if (preview) preview.style.display = hasAny ? 'block' : 'none';
    if (!hasAny) return;

    if (matchCount) matchCount.textContent = matches.length;
    const issuable = matches.filter(m => {
        const s = (m.status || '').toString().trim().toLowerCase();
        return s === 'available' || s === 'in storage';
    }).length;
    setAvailabilityPill('avail-dashboard-match', issuable, matches.length);

    if (matchesBody) {
        if (!matches.length) {
            matchesBody.innerHTML = '<tr><td colspan="8" class="text-center no-data">No matching assets</td></tr>';
        } else {
            matchesBody.innerHTML = matches.slice(0, 50).map(a => {
                return '<tr>' +
                    '<td><strong>' + (a.assetTag || '-') + '</strong></td>' +
                    '<td>' + (a.category || '-') + '</td>' +
                    '<td>' + [a.brand, a.model].filter(Boolean).join(' / ') + '</td>' +
                    '<td><span class="badge ' + getStatusBadgeClass(a.status) + '">' + (a.status || '-') + '</span></td>' +
                    '<td>' + (a.location || '-') + '</td>' +
                    '<td>' + (a.department || '-') + '</td>' +
                    '<td>' + (a.assignedTo || '-') + '</td>' +
                    '<td>' + (a.condition || '-') + '</td>' +
                    '</tr>';
            }).join('') + (matches.length > 50 ? '<tr><td colspan="8" class="text-center" style="color:#475569">...and ' + (matches.length - 50) + ' more — switch to the Assets tab to see all results</td></tr>' : '');
        }
    }
}

function clearDashboardFilters() {
    ['dashboardSearchInput', 'dashboardStatusFilter', 'dashboardCategoryFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
    });
    applyDashboardFilters();
}

function createStatusChart(data) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    function colorFor(label) {
        const s = (label || '').toString();
        if (s.startsWith('Available')) return '#10b981';
        if (s.includes('In Storage')) return '#f59e0b';
        if (s.startsWith('Assigned') || s.includes('In Use')) return '#3b82f6';
        if (s.includes('Under Repair') || s.includes('Can be Fixed')) return '#8b5cf6';
        if (s.includes('Faulty') || s.includes('Damaged')) return '#ef4444';
        if (s === 'Lost') return '#991b1b';
        return '#6b7280';
    }

    if (statusChart) {
        statusChart.destroy();
    }

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d._id || 'Unknown'),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: data.map(d => colorFor(d._id)),
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                }
            }
        }
    });
}

function createLocationChart(data) {
    const ctx = document.getElementById('locationChart');
    if (!ctx) return;

    const topData = data.slice(0, 6);

    if (locationChart) {
        locationChart.destroy();
    }

    locationChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topData.map(d => d._id || 'Unknown'),
            datasets: [{
                label: 'Number of Assets',
                data: topData.map(d => d.count),
                backgroundColor: '#3b82f6',
                borderColor: '#2563eb',
                borderWidth: 1,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: '#f3f4f6'
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false,
                }
            }
        }
    });
}

function createDepartmentChart(data) {
    const ctx = document.getElementById('departmentChart');
    if (!ctx) return;

    const topData = data.slice(0, 8);
    const colors = ['#FF5C00', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#6366f1'];

    if (departmentChart) {
        departmentChart.destroy();
    }

    departmentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topData.map(d => d._id || 'Unassigned'),
            datasets: [{
                label: 'Assets',
                data: topData.map(d => d.count),
                backgroundColor: colors.slice(0, topData.length),
                borderColor: '#fff',
                borderWidth: 1,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: '#f3f4f6'
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false,
                }
            }
        }
    });
}

let categoryAllChart = null;
function createCategoryAllChart(data) {
    const ctx = document.getElementById('categoryAllChart');
    if (!ctx) return;
    const colors = ['#6366f1', '#FF5C00', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#84cc16'];
    if (categoryAllChart) categoryAllChart.destroy();
    categoryAllChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(d => d._id || 'Unknown'),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: colors.slice(0, data.length),
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        font: { size: 12, weight: '500', family: 'Times New Roman' }
                    }
                }
            }
        }
    });
}

let categoryGoodChart = null;
function createCategoryGoodChart(data) {
    const ctx = document.getElementById('categoryGoodChart');
    if (!ctx) return;
    if (categoryGoodChart) categoryGoodChart.destroy();
    categoryGoodChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d._id || 'Unknown'),
            datasets: [{
                label: 'Good / New Assets',
                data: data.map(d => d.count),
                backgroundColor: '#10b981',
                borderColor: '#059669',
                borderWidth: 1,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            scales: {
                x: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { precision: 0 } },
                y: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

let categoryFaultyChart = null;
function createCategoryFaultyChart(data) {
    const ctx = document.getElementById('categoryFaultyChart');
    if (!ctx) return;
    if (categoryFaultyChart) categoryFaultyChart.destroy();
    categoryFaultyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d._id || 'Unknown'),
            datasets: [{
                label: 'Faulty / Damaged',
                data: data.map(d => d.count),
                backgroundColor: '#f59e0b',
                borderColor: '#d97706',
                borderWidth: 1,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            scales: {
                x: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { precision: 0 } },
                y: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

let categoryLostChart = null;
function createCategoryLostChart(data) {
    const ctx = document.getElementById('categoryLostChart');
    if (!ctx) return;
    if (categoryLostChart) categoryLostChart.destroy();
    categoryLostChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d._id || 'Unknown'),
            datasets: [{
                label: 'Lost Assets',
                data: data.map(d => d.count),
                backgroundColor: '#ef4444',
                borderColor: '#dc2626',
                borderWidth: 1,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            scales: {
                x: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { precision: 0 } },
                y: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ========================================
// ASSETS FUNCTIONS
// ========================================
async function loadAssets() {
    try {
        allAssets = await apiCall('/assets', 'GET');
        renderAssetsTable(allAssets);
    } catch (error) {
        showMessage('assetMessage', 'Error loading assets: ' + error.message, 'error', 0);
    }
}

function renderAssetsTable(assets) {
    const tbody = document.getElementById('assetsTableBody');
    const userRole = getUserRole();
    
    if (assets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center no-data">No assets found</td></tr>';
        updateBulkActionsBar();
        return;
    }

    tbody.innerHTML = assets.map(asset => {
        const isChecked = selectedAssetIds.includes(asset._id) ? 'checked' : '';
        let actionButtons = '<button class="btn btn-small btn-secondary" onclick="viewAssetDetails(\'' + asset._id + '\')" title="View">View</button>';

        if (userRole === 'admin') {
            actionButtons += '<button class="btn btn-small btn-secondary" onclick="editAsset(\'' + asset._id + '\')" title="Edit">Edit</button>';
            actionButtons += '<button class="btn btn-small btn-danger" onclick="deleteAsset(\'' + asset._id + '\')" title="Delete">Delete</button>';
        }

        return '<tr><td><input type="checkbox" class="asset-checkbox" data-id="' + asset._id + '" ' + isChecked + ' onchange="toggleRowSelection(\'' + asset._id + '\', this)"></td><td><strong>' + asset.assetTag + '</strong></td><td>' + asset.category + '</td><td>' + (asset.serialNumber || '-') + '</td><td><span class="badge ' + getStatusBadgeClass(asset.status) + '">' + asset.status + '</span></td><td>' + (asset.assignedTo || '-') + '</td><td>' + (asset.location || '-') + '</td><td>' + (asset.department || '-') + '</td><td>' + (asset.condition || 'Good') + '</td><td><div class="action-buttons">' + actionButtons + '</div></td></tr>';
    }).join('');
    updateBulkActionsBar();
}

function toggleSelectAll(checkbox) {
    const visibleAssetIds = Array.from(document.querySelectorAll('.asset-checkbox')).map(cb => cb.dataset.id);
    if (checkbox.checked) {
        selectedAssetIds = [...new Set([...selectedAssetIds, ...visibleAssetIds])];
    } else {
        selectedAssetIds = selectedAssetIds.filter(id => !visibleAssetIds.includes(id));
    }
    document.querySelectorAll('.asset-checkbox').forEach(cb => {
        cb.checked = checkbox.checked;
    });
    updateBulkActionsBar();
}

function toggleRowSelection(assetId, checkbox) {
    if (checkbox.checked) {
        if (!selectedAssetIds.includes(assetId)) {
            selectedAssetIds.push(assetId);
        }
    } else {
        selectedAssetIds = selectedAssetIds.filter(id => id !== assetId);
    }
    // Update select all checkbox state
    const allCheckboxes = document.querySelectorAll('.asset-checkbox');
    const allChecked = allCheckboxes.length > 0 && Array.from(allCheckboxes).every(cb => cb.checked);
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = allChecked;
    }
    updateBulkActionsBar();
}

function updateBulkActionsBar() {
    const bar = document.getElementById('bulkActionsBar');
    const countEl = document.getElementById('selectedCount');
    const isAdminValue = isAdmin();
    
    if (selectedAssetIds.length > 0) {
        bar.style.display = 'flex';
        countEl.textContent = selectedAssetIds.length;
        document.getElementById('bulkEditBtn').style.display = isAdminValue ? 'inline-flex' : 'none';
        document.getElementById('bulkDeleteBtn').style.display = isAdminValue ? 'inline-flex' : 'none';
    } else {
        bar.style.display = 'none';
    }
}

function clearSelection() {
    selectedAssetIds = [];
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
    }
    document.querySelectorAll('.asset-checkbox').forEach(cb => {
        cb.checked = false;
    });
    updateBulkActionsBar();
}

async function bulkDeleteSelected() {
    if (!isAdmin()) {
        showMessage('assetMessage', 'Only admins can delete assets', 'error');
        return;
    }
    if (selectedAssetIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to DELETE ${selectedAssetIds.length} selected asset(s)?`)) return;
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const assetId of selectedAssetIds) {
        try {
            await apiCall('/assets/' + assetId, 'DELETE');
            successCount++;
        } catch (err) {
            errorCount++;
        }
    }
    
    let msg = `Bulk delete completed: ${successCount} deleted`;
    if (errorCount > 0) msg += `, ${errorCount} failed`;
    showMessage('assetMessage', msg, errorCount > 0 ? 'error' : 'success');
    
    clearSelection();
    loadAssets();
}

function bulkEditSelected() {
    if (!isAdmin()) {
        showMessage('assetMessage', 'Only admins can edit assets', 'error');
        return;
    }
    if (selectedAssetIds.length === 0) return;
    
    if (selectedAssetIds.length === 1) {
        editAsset(selectedAssetIds[0]);
        return;
    }
    
    showMessage('assetMessage', 'Bulk edit (multiple assets): Currently edit is available for one asset at a time. Delete works for multiple.', 'info');
}

function filterAssets() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const statusFilter = document.getElementById('statusFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;

    let filtered = allAssets;

    if (searchTerm) {
        filtered = filtered.filter(asset => {
            const hay = [
                asset.assetTag, asset.serialNumber, asset.brand, asset.model,
                asset.assignedTo, asset.location, asset.department, asset.condition
            ].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(searchTerm);
        });
    }

    if (statusFilter) {
        filtered = filtered.filter(asset =>
            (asset.status || '').toString().trim().toLowerCase() === statusFilter.toLowerCase()
        );
    }

    if (categoryFilter) {
        filtered = filtered.filter(asset =>
            (asset.category || '').toString().trim().toLowerCase() === categoryFilter.toLowerCase()
        );
    }

    renderAssetsTable(filtered);
}

function clearAssetFilters() {
    ['searchInput', 'statusFilter', 'categoryFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = '';
    });
    filterAssets();
}

function openAssetModal() {
    if (!isAdmin()) {
        showMessage('assetMessage', 'Only admins can add assets', 'error');
        return;
    }

    editingAssetId = null;
    document.getElementById('assetForm').reset();
    document.getElementById('assetModalTitle').textContent = 'Add New Asset';
    document.getElementById('assetTag').disabled = false;
    document.getElementById('assetModal').style.display = 'flex';
}

function closeAssetModal() {
    document.getElementById('assetModal').style.display = 'none';
    editingAssetId = null;
}

async function submitAssetForm(event) {
    event.preventDefault();

    if (!isAdmin()) {
        showMessage('assetMessage', 'Only admins can manage assets', 'error');
        return;
    }

    const formData = {
        assetTag: document.getElementById('assetTag').value,
        category: document.getElementById('category').value,
        brand: document.getElementById('brand').value,
        model: document.getElementById('model').value,
        serialNumber: document.getElementById('serialNumber').value,
        purchaseDate: document.getElementById('purchaseDate').value,
        purchasePrice: document.getElementById('purchasePrice').value,
        status: document.getElementById('status').value,
        condition: document.getElementById('condition').value,
        assignedTo: document.getElementById('assignedTo').value,
        department: document.getElementById('department').value,
        location: document.getElementById('location').value,
    };

    try {
        if (editingAssetId) {
            await apiCall('/assets/' + editingAssetId, 'PUT', formData);
            showMessage('assetMessage', 'Asset updated successfully', 'success');
        } else {
            await apiCall('/assets', 'POST', formData);
            showMessage('assetMessage', 'Asset created successfully', 'success');
        }

        closeAssetModal();
        loadAssets();
    } catch (error) {
        showMessage('assetMessage', 'Error: ' + error.message, 'error', 0);
    }
}

async function editAsset(assetId) {
    if (!isAdmin()) {
        showMessage('assetMessage', 'Only admins can edit assets', 'error');
        return;
    }

    const asset = allAssets.find(a => a._id === assetId);
    if (!asset) return;

    editingAssetId = assetId;
    document.getElementById('assetModalTitle').textContent = 'Edit Asset';
    document.getElementById('assetTag').disabled = false;

    document.getElementById('assetTag').value = asset.assetTag;
    document.getElementById('category').value = asset.category;
    document.getElementById('brand').value = asset.brand || '';
    document.getElementById('model').value = asset.model || '';
    document.getElementById('serialNumber').value = asset.serialNumber || '';
    document.getElementById('purchaseDate').value = asset.purchaseDate?.split('T')[0] || '';
    document.getElementById('purchasePrice').value = asset.purchasePrice || '';
    document.getElementById('status').value = asset.status;
    document.getElementById('condition').value = asset.condition;
    document.getElementById('assignedTo').value = asset.assignedTo || '';
    document.getElementById('department').value = asset.department || '';
    document.getElementById('location').value = asset.location || '';

    document.getElementById('assetModal').style.display = 'flex';
}

async function deleteAsset(assetId) {
    if (!isAdmin()) {
        showMessage('assetMessage', 'Only admins can delete assets', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
        await apiCall('/assets/' + assetId, 'DELETE');
        showMessage('assetMessage', 'Asset deleted successfully', 'success');
        loadAssets();
    } catch (error) {
        showMessage('assetMessage', 'Error: ' + error.message, 'error', 0);
    }
}

async function viewAssetDetails(assetId) {
    const asset = allAssets.find(a => a._id === assetId);
    if (!asset) return;

    const modal = document.getElementById('detailsModal');
    const content = document.getElementById('assetDetailsContent');
    const userRole = getUserRole();

    let historyHTML = '';
    if (asset.history && asset.history.length > 0) {
        historyHTML = '<div class="history-section"><h3>Asset History</h3><div class="history-list">';
        asset.history.forEach(entry => {
            historyHTML += '<div class="history-item"><div class="history-action">' + entry.action + '</div><div class="history-details">';
            if (entry.assignedTo) historyHTML += '<p>Assigned to: ' + entry.assignedTo + '</p>';
            if (entry.department) historyHTML += '<p>Department: ' + entry.department + '</p>';
            historyHTML += '<p class="history-date">' + formatDate(entry.date) + ' ' + formatTime(entry.date) + '</p>';
            historyHTML += '</div></div>';
        });
        historyHTML += '</div></div>';
    }

    let actionButtons = '';
    if (userRole === 'admin') {
        actionButtons = '<button class="btn btn-primary" onclick="editAsset(\'' + asset._id + '\')">Edit Asset</button>';
    }

    if (asset.status === 'Available') {
        actionButtons += '<button class="btn btn-success" onclick="showAssignForm(\'' + asset._id + '\')">Assign Asset</button>';
    }

    if (asset.status === 'Assigned') {
        actionButtons += '<button class="btn btn-success" onclick="showReturnForm(\'' + asset._id + '\')">Return Asset</button>';
    }

    let detailsHTML = '<div class="asset-details-content"><div class="details-grid">';
    detailsHTML += '<div class="detail-item"><span class="detail-label">Asset Tag</span><span class="detail-value">' + asset.assetTag + '</span></div>';
    detailsHTML += '<div class="detail-item"><span class="detail-label">Category</span><span class="detail-value">' + asset.category + '</span></div>';
    detailsHTML += '<div class="detail-item"><span class="detail-label">Serial Number</span><span class="detail-value">' + (asset.serialNumber || '-') + '</span></div>';
    detailsHTML += '<div class="detail-item"><span class="detail-label">Model</span><span class="detail-value">' + (asset.model || '-') + '</span></div>';
    detailsHTML += '<div class="detail-item"><span class="detail-label">Brand</span><span class="detail-value">' + (asset.brand || '-') + '</span></div>';
    detailsHTML += '<div class="detail-item"><span class="detail-label">Status</span><span class="detail-value"><span class="badge ' + getStatusBadgeClass(asset.status) + '">' + asset.status + '</span></span></div>';
    detailsHTML += '<div class="detail-item"><span class="detail-label">Condition</span><span class="detail-value">' + (asset.condition || 'Good') + '</span></div>';
    detailsHTML += '<div class="detail-item"><span class="detail-label">Assigned To</span><span class="detail-value">' + (asset.assignedTo || '-') + '</span></div>';
    detailsHTML += '<div class="detail-item"><span class="detail-label">Department</span><span class="detail-value">' + (asset.department || '-') + '</span></div>';
    detailsHTML += '<div class="detail-item"><span class="detail-label">Location</span><span class="detail-value">' + (asset.location || '-') + '</span></div>';
    detailsHTML += '<div class="detail-item"><span class="detail-label">Purchase Date</span><span class="detail-value">' + formatDate(asset.purchaseDate) + '</span></div>';
    detailsHTML += '<div class="detail-item"><span class="detail-label">Purchase Price</span><span class="detail-value">$' + (asset.purchasePrice || '-') + '</span></div>';
    detailsHTML += '</div>' + historyHTML + '<div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">' + actionButtons + '<button class="btn btn-secondary" onclick="closeDetailsModal()">Close</button></div></div>';

    content.innerHTML = detailsHTML;
    modal.style.display = 'flex';
}

function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

function showAssignForm(assetId) {
    const content = document.getElementById('assetDetailsContent');
    let formHTML = '<form onsubmit="submitAssignForm(event, \'' + assetId + '\')" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">';
    formHTML += '<h3>Assign Asset</h3>';
    formHTML += '<div class="form-group"><label for="assignToEmployee">Assigned To *</label><input id="assignToEmployee" type="text" required placeholder="Employee name"></div>';
    formHTML += '<div class="form-group"><label for="assignToDepartment">Department</label><select id="assignToDepartment"><option value="">Select Department</option><option value="Operations">Operations</option><option value="Finance">Finance</option><option value="Administration & Logistics">Administration & Logistics</option><option value="Procurement">Procurement</option><option value="IT">IT</option><option value="Communications">Communications</option><option value="Programs">Programs</option><option value="CASCADE">CASCADE</option><option value="Women Voices and Leadership (WVL)">Women Voices and Leadership (WVL)</option><option value="KRAPID+">KRAPID+</option><option value="MOFA">MOFA</option><option value="C2C">C2C</option><option value="Sowing Change">Sowing Change</option><option value="SHE SOARS">SHE SOARS</option><option value="CSDW">CSDW</option><option value="EXECUTIVE">EXECUTIVE</option><option value="Security">Security</option><option value="PQLA / MEAL– Program Quality Learning & Accountability">PQLA / MEAL– Program Quality Learning & Accountability</option><option value="Programs & Fund raising">Programs & Fund raising</option><option value="Risk and Compliance">Risk and Compliance</option><option value="ESA">ESA</option></select></div>';
    formHTML += '<div style="display: flex; gap: 10px;"><button type="submit" class="btn btn-success" style="flex: 1;">Confirm Assignment</button><button type="button" class="btn btn-secondary" onclick="viewAssetDetails(\'' + assetId + '\')" style="flex: 1;">Cancel</button></div></form>';
    content.innerHTML += formHTML;
}

function showReturnForm(assetId) {
    const content = document.getElementById('assetDetailsContent');
    let formHTML = '<form onsubmit="submitReturnForm(event, \'' + assetId + '\')" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">';
    formHTML += '<h3>Return Asset</h3>';
    formHTML += '<div class="form-group"><label for="returnedBy">Returned By *</label><input id="returnedBy" type="text" required placeholder="Employee name"></div>';
    formHTML += '<div class="form-group"><label for="returnCondition">Condition *</label><select id="returnCondition" required><option value="">Select Condition</option><option value="New">New</option><option value="Good">Good</option><option value="Faulty">Faulty</option><option value="BER">BER</option><option value="Damaged">Damaged</option></select></div>';
    formHTML += '<div style="display: flex; gap: 10px;"><button type="submit" class="btn btn-success" style="flex: 1;">Confirm Return</button><button type="button" class="btn btn-secondary" onclick="viewAssetDetails(\'' + assetId + '\')" style="flex: 1;">Cancel</button></div></form>';
    content.innerHTML += formHTML;
}

async function submitAssignForm(event, assetId) {
    event.preventDefault();

    const data = {
        assignedTo: document.getElementById('assignToEmployee').value,
        department: document.getElementById('assignToDepartment').value,
    };

    try {
        await apiCall('/assets/' + assetId + '/assign', 'PUT', data);
        showMessage('assetMessage', 'Asset assigned successfully', 'success');
        closeDetailsModal();
        loadAssets();
    } catch (error) {
        showMessage('assetMessage', 'Error: ' + error.message, 'error', 0);
    }
}

async function submitReturnForm(event, assetId) {
    event.preventDefault();

    const data = {
        returnedBy: document.getElementById('returnedBy').value,
        condition: document.getElementById('returnCondition').value,
    };

    try {
        await apiCall('/assets/' + assetId + '/return', 'PUT', data);
        showMessage('assetMessage', 'Asset returned successfully', 'success');
        closeDetailsModal();
        loadAssets();
    } catch (error) {
        showMessage('assetMessage', 'Error: ' + error.message, 'error', 0);
    }
}

// ========================================
// IMPORT EXCEL FUNCTIONS
// ========================================
function openImportModal() {
    if (!isAdmin()) {
        showMessage('assetMessage', 'Only admins can import assets', 'error');
        return;
    }

    document.getElementById('importForm').reset();
    document.getElementById('importModal').style.display = 'flex';
}

function closeImportModal() {
    document.getElementById('importModal').style.display = 'none';
}

async function submitImportForm(event) {
    event.preventDefault();

    if (!isAdmin()) {
        showMessage('assetMessage', 'Only admins can import assets', 'error');
        return;
    }

    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];

    if (!file) {
        showMessage('assetMessage', 'Please select a file', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(API_URL + '/import/excel', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            body: formData
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const error = await response.json();
                throw new Error(error.message || 'Import failed');
            } else {
                throw new Error('Server error: ' + response.statusText);
            }
        }

        const result = await response.json();
        let message = 'Import successful! ' + result.importedCount + ' assets imported';
        if (result.errorCount > 0) {
            message += '. ' + result.errorCount + ' errors occurred.';
        }

        showMessage('assetMessage', message, 'success');
        closeImportModal();
        
        switchPage('assetsPage');
        
    } catch (error) {
        showMessage('assetMessage', 'Error: ' + error.message, 'error', 0);
    }
}

// ========================================
// EXPORT FUNCTIONS
// ========================================
async function exportToExcel() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(API_URL + '/export/excel', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        downloadFile(blob, 'assets.xlsx');
        showMessage('assetMessage', 'Excel file downloaded', 'success');
    } catch (error) {
        showMessage('assetMessage', 'Error: ' + error.message, 'error', 0);
    }
}

async function exportToPdf() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(API_URL + '/export/pdf', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        downloadFile(blob, 'assets.pdf');
        showMessage('assetMessage', 'PDF file downloaded', 'success');
    } catch (error) {
        showMessage('assetMessage', 'Error: ' + error.message, 'error', 0);
    }
}

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});
