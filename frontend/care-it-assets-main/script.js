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
let resetEmail = null; // For password reset flow

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
    const map = {
        'Available': 'badge-green',
        'Assigned': 'badge-blue',
        'In Storage': 'badge-yellow',
        'Under Repair': 'badge-red',
        'Lost': 'badge-red',
        'Aproved for disposal': 'badge-red',
        'Disposed': 'badge-red',
    };
    return map[status] || 'badge-blue';
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
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });

    const page = document.getElementById(pageId);
    if (page) {
        page.style.display = 'block';

        if (pageId === 'dashboardPage') {
            renderHeader('header');
            loadDashboardData();
        } else if (pageId === 'assetsPage') {
            renderHeader('headerAssets');
            renderHeaderActions();
            loadAssets();
        }
    }
}

function initializeApp() {
    if (isAuthenticated()) {
        switchPage('dashboardPage');
    } else {
        switchPage('userLoginPage');
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
async function loadDashboardData() {
    try {
        const [statusData, locationData, assetsData] = await Promise.all([
            apiCall('/dashboard/status', 'GET'),
            apiCall('/dashboard/location', 'GET'),
            apiCall('/assets', 'GET'),
        ]);

        document.getElementById('totalAssets').textContent = assetsData.length;
        const availableCount = statusData.find(s => s._id === 'Available')?.count || 0;
        const assignedCount = statusData.find(s => s._id === 'Assigned')?.count || 0;
        
        document.getElementById('availableAssets').textContent = availableCount;
        document.getElementById('assignedAssets').textContent = assignedCount;

        const statusTableBody = document.getElementById('statusTableBody');
        statusTableBody.innerHTML = statusData.map(item => {
            return '<tr><td><span class="badge ' + getStatusBadgeClass(item._id) + '">' + item._id + '</span></td><td><strong>' + item.count + '</strong></td></tr>';
        }).join('');

        const locationTableBody = document.getElementById('locationTableBody');
        locationTableBody.innerHTML = locationData.slice(0, 8).map(item => {
            return '<tr><td>' + (item._id || 'Unknown') + '</td><td><strong>' + item.count + '</strong></td></tr>';
        }).join('');

        createStatusChart(statusData);
        createLocationChart(locationData);
    } catch (error) {
        showMessage('dashboardMessage', 'Error loading dashboard: ' + error.message, 'error', 0);
    }
}

function createStatusChart(data) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    if (statusChart) {
        statusChart.destroy();
    }

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d._id || 'Unknown'),
            datasets: [{
                data: data.map(d => d.count),
                backgroundColor: colors.slice(0, data.length),
                borderColor: '#fff',
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
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
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'x',
            scales: {
                y: {
                    beginAtZero: true,
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                }
            }
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
        tbody.innerHTML = '<tr><td colspan="9" class="text-center no-data">No assets found</td></tr>';
        return;
    }

    tbody.innerHTML = assets.map(asset => {
        let actionButtons = '<button class="btn btn-small btn-secondary" onclick="viewAssetDetails(\'' + asset._id + '\')" title="View">View</button>';

        if (userRole === 'admin') {
            actionButtons += '<button class="btn btn-small btn-secondary" onclick="editAsset(\'' + asset._id + '\')" title="Edit">Edit</button>';
            actionButtons += '<button class="btn btn-small btn-danger" onclick="deleteAsset(\'' + asset._id + '\')" title="Delete">Delete</button>';
        }

        return '<tr><td><strong>' + asset.assetTag + '</strong></td><td>' + asset.category + '</td><td>' + (asset.serialNumber || '-') + '</td><td><span class="badge ' + getStatusBadgeClass(asset.status) + '">' + asset.status + '</span></td><td>' + (asset.assignedTo || '-') + '</td><td>' + (asset.location || '-') + '</td><td>' + (asset.department || '-') + '</td><td>' + (asset.condition || 'Good') + '</td><td><div class="action-buttons">' + actionButtons + '</div></td></tr>';
    }).join('');
}

function filterAssets() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;

    let filtered = allAssets;

    if (searchTerm) {
        filtered = filtered.filter(asset =>
            (asset.assetTag?.toLowerCase().includes(searchTerm)) ||
            (asset.serialNumber?.toLowerCase().includes(searchTerm)) ||
            (asset.assignedTo?.toLowerCase().includes(searchTerm))
        );
    }

    if (statusFilter) {
        filtered = filtered.filter(asset => asset.status === statusFilter);
    }

    if (categoryFilter) {
        filtered = filtered.filter(asset => asset.category === categoryFilter);
    }

    renderAssetsTable(filtered);
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
    document.getElementById('assetTag').disabled = true;

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
    formHTML += '<div class="form-group"><label for="assignToDepartment">Department</label><select id="assignToDepartment"><option value="">Select Department</option><option value="Operations">Operations</option><option value="Finance">Finance</option><option value="Administration & Logistics">Administration & Logistics</option><option value="Procurement">Procurement</option><option value="IT">IT</option><option value="Programs">Programs</option><option value="CASCADE">CASCADE</option><option value="Women Voices and Leadership (WVL)">Women Voices and Leadership (WVL)</option><option value="KRAPID+">KRAPID+</option><option value="MOFA">MOFA</option><option value="C2C">C2C</option><option value="Sowing Change">Sowing Change</option><option value="SHE SOARS">SHE SOARS</option><option value="CSDW">CSDW</option><option value="EXECUTIVE">EXECUTIVE</option><option value="Security">Security</option><option value="PQLA / MEAL– Program Quality Learning & Accountability">PQLA / MEAL– Program Quality Learning & Accountability</option><option value="Programs & Fund raising">Programs & Fund raising</option><option value="Risk and Compliance">Risk and Compliance</option></select></div>';
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
