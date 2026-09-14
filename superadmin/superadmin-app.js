/**
 * GHAZIOS Superadmin Panel - Full Featured
 * System-wide management for all restaurants
 */

const API = '/api';
let token = null;
let tenants = [];
let allOrders = [];
let allInventory = [];
let allProducts = [];
let allUsers = [];
let allAnnouncements = [];
let editingProduct = null;
let editingUser = null;
let revenueChart = null;
let hoursChart = null;
let paymentChart = null;

const $ = s => document.getElementById(s);
function esc(s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }

async function api(url, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API}${url}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

// ============================================
// LOGIN
// ============================================
$('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    $('loginError').textContent = '';
    try {
        const data = await api('/auth/login', 'POST', {
            username: $('username').value,
            password: $('password').value
        });
        if (data.user.role !== 'superadmin') throw new Error('Access denied. Superadmin only.');
        token = data.token;
        $('loginScreen').style.display = 'none';
        $('adminContainer').style.display = 'grid';
        $('userName').textContent = data.user.fullName;
        loadAllData();
        updateClock();
        setInterval(updateClock, 1000);
    } catch (err) {
        $('loginError').textContent = err.message;
    }
});

$('logoutBtn').addEventListener('click', () => {
    token = null;
    $('loginScreen').style.display = 'flex';
    $('adminContainer').style.display = 'none';
});

// ============================================
// LOAD ALL DATA
// ============================================
async function loadAllData() {
    try {
        try { tenants = await api('/admin/tenants'); renderTenants(); } catch (e) { tenants = []; renderTenants(); }
        try { allOrders = await api('/admin/orders'); renderOrders(); } catch (e) { allOrders = []; renderOrders(); }
        try { allInventory = await api('/admin/inventory'); renderInventory(); } catch (e) { allInventory = []; renderInventory(); }
        try { allUsers = await api('/admin/users'); renderUsers(); } catch (e) { allUsers = []; renderUsers(); }
        try { allAnnouncements = await api('/admin/announcements'); renderAnnouncements(); } catch (e) { allAnnouncements = []; renderAnnouncements(); }

        try {
            const stats = await api('/admin/stats');
            $('totalTenants').textContent = stats.totalTenants || 0;
            $('todayOrders').textContent = stats.todayOrders || 0;
            $('pendingOrders').textContent = stats.pendingOrders || 0;
            $('lowStockCount').textContent = stats.lowStockItems || 0;
            $('ordersByTenant').innerHTML = (stats.ordersByTenant || []).map(t => `
                <div class="tenant-revenue">
                    <span class="tenant-revenue-name">${t.tenant_name}</span>
                    <span class="tenant-revenue-amount">${t.order_count} orders</span>
                </div>
            `).join('') || '<p style="color:var(--gray-500);text-align:center">No orders today</p>';
        } catch (e) {}

        $('recentActivity').innerHTML = allOrders.slice(0, 5).map(o => `
            <div class="tenant-revenue">
                <div>
                    <strong>${esc(o.invoice_number)}</strong>
                    <br><small>${esc(o.tenant_name) || 'Unknown'} • ${esc(o.customer_name) || 'Walk-in'}</small>
                </div>
                <span class="status-badge ${esc(o.status)}">${esc(o.status.toUpperCase())}</span>
            </div>
        `).join('') || '<p style="color:var(--gray-500);text-align:center">No recent orders</p>';

        const tenantOptions = '<option value="">All Restaurants</option>' +
            tenants.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
        $('tenantFilter').innerHTML = tenantOptions;
        $('productTenantFilter').innerHTML = tenantOptions;
        $('userTenantFilter').innerHTML = tenantOptions;
        $('reportTenantFilter').innerHTML = tenantOptions;
        $('announcementTenant').innerHTML = tenants.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');

        const userTenantOptions = tenants.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        $('userTenantSelect').innerHTML = userTenantOptions;

        if (tenants.length > 0) loadProducts(tenants[0].id);

        showToast('Data loaded successfully', 'success');
    } catch (e) {
        showToast('Some data failed to load', 'error');
    }
}

// ============================================
// RENDER TENANTS
// ============================================
function renderTenants() {
    $('tenantsBody').innerHTML = tenants.map(t => `
        <tr>
            <td><strong>${esc(t.name)}</strong></td>
            <td>${esc(t.slug)}</td>
            <td>${esc(t.phone) || '-'}</td>
            <td>${esc(t.email) || '-'}</td>
            <td><span class="plan-badge ${esc(t.subscription_plan || 'basic')}">${esc((t.subscription_plan || 'basic').toUpperCase())}</span></td>
            <td><span class="status-badge ${t.is_active ? 'active' : 'inactive'}">${t.is_active ? 'Active' : 'Inactive'}</span></td>
            <td class="actions-cell">
                <div class="impersonate-group">
                    <span class="impersonate-label">View as:</span>
                    <button class="impersonate-btn pos" onclick="impersonate('${t.id}', 'cashier')">POS</button>
                    <button class="impersonate-btn kitchen" onclick="impersonate('${t.id}', 'kitchen')">Kitchen</button>
                    <button class="impersonate-btn admin" onclick="impersonate('${t.id}', 'admin')">Admin</button>
                    <button class="impersonate-btn ordering" onclick="impersonate('${t.id}', 'ordering')">Website</button>
                </div>
                <button class="table-btn" onclick="toggleTenantStatus('${t.id}', ${!t.is_active})">${t.is_active ? 'Deactivate' : 'Activate'}</button>
                <button class="table-btn" onclick="editSubscription('${t.id}', '${esc(t.subscription_plan || 'basic')}')">Plan</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center">No restaurants found</td></tr>';
}

async function toggleTenantStatus(id, newStatus) {
    try {
        await api(`/admin/tenants/${id}/status`, 'PUT', { is_active: newStatus });
        showToast(`Restaurant ${newStatus ? 'activated' : 'deactivated'}`);
        loadAllData();
    } catch (e) { showToast(e.message, 'error'); }
}

// ============================================
// IMPERSONATE
// ============================================
const PANEL_PORTS = {
    pos: 8001,
    kitchen: 8002,
    admin: 8003,
    ordering: 8000
};

async function impersonate(tenantId, role) {
    try {
        const data = await api('/admin/impersonate', 'POST', { tenant_id: tenantId, role });
        const host = window.location.hostname;

        if (role === 'ordering') {
            window.open(`http://${host}:${PANEL_PORTS.ordering}/`, '_blank');
            return;
        }

        const port = PANEL_PORTS[role];
        window.open(`http://${host}:${port}/?token=${data.token}`, '_blank');
        showToast(`Impersonating ${role} at ${data.tenant.name}`);
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function editSubscription(id, currentPlan) {
    const plan = prompt(`Current plan: ${currentPlan}\nEnter new plan (basic, premium, enterprise):`, currentPlan);
    if (!plan || !['basic', 'premium', 'enterprise'].includes(plan)) return;
    api(`/admin/tenants/${id}/subscription`, 'PUT', { subscription_plan: plan })
        .then(() => { showToast('Subscription updated'); loadAllData(); })
        .catch(e => showToast(e.message, 'error'));
}

// ============================================
// ADD RESTAURANT
// ============================================
$('addRestaurantBtn').addEventListener('click', () => {
    $('newTenantName').value = '';
    $('newTenantSlug').value = '';
    $('newTenantPhone').value = '';
    $('newTenantEmail').value = '';
    $('newTenantAddress').value = '';
    $('newTenantColor1').value = '#D32F2F';
    $('newTenantColor1Text').value = '#D32F2F';
    $('newTenantColor2').value = '#1565C0';
    $('newTenantColor2Text').value = '#1565C0';
    $('newTenantPlan').value = 'basic';
    $('newTenantPassword').value = '';
    $('addRestaurantModal').classList.add('active');
});

$('newTenantName').addEventListener('input', (e) => {
    if (!$('newTenantSlug').dataset.manual) {
        $('newTenantSlug').value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
});

$('newTenantSlug').addEventListener('input', () => { $('newTenantSlug').dataset.manual = 'true'; });

$('newTenantColor1').addEventListener('input', (e) => { $('newTenantColor1Text').value = e.target.value; });
$('newTenantColor1Text').addEventListener('input', (e) => { $('newTenantColor1').value = e.target.value; });
$('newTenantColor2').addEventListener('input', (e) => { $('newTenantColor2Text').value = e.target.value; });
$('newTenantColor2Text').addEventListener('input', (e) => { $('newTenantColor2').value = e.target.value; });

$('confirmAddRestaurant').addEventListener('click', async () => {
    const name = $('newTenantName').value.trim();
    const slug = $('newTenantSlug').value.trim();
    const password = $('newTenantPassword').value;
    if (!name || !slug) return showToast('Name and slug required', 'error');
    if (!password || password.length < 6) return showToast('Password must be at least 6 characters', 'error');

    try {
        await api('/admin/tenants', 'POST', {
            name, slug,
            phone: $('newTenantPhone').value.trim(),
            email: $('newTenantEmail').value.trim(),
            address: $('newTenantAddress').value.trim(),
            primary_color: $('newTenantColor1').value,
            secondary_color: $('newTenantColor2').value,
            subscription_plan: $('newTenantPlan').value,
            admin_password: password
        });
        showToast('Restaurant created successfully!');
        $('addRestaurantModal').classList.remove('active');
        loadAllData();
    } catch (e) { showToast(e.message, 'error'); }
});

$('closeAddRestaurant').addEventListener('click', () => $('addRestaurantModal').classList.remove('active'));
$('cancelAddRestaurant').addEventListener('click', () => $('addRestaurantModal').classList.remove('active'));
$('addRestaurantModal').addEventListener('click', (e) => { if (e.target === $('addRestaurantModal')) $('addRestaurantModal').classList.remove('active'); });

// ============================================
// RENDER USERS
// ============================================
function renderUsers() {
    const tenantFilter = $('userTenantFilter')?.value || '';
    const roleFilter = $('userRoleFilter')?.value || '';
    let filtered = allUsers;
    if (tenantFilter) filtered = filtered.filter(u => u.tenant_id === tenantFilter);
    if (roleFilter) filtered = filtered.filter(u => u.role === roleFilter);

    $('usersBody').innerHTML = filtered.map(u => `
        <tr>
            <td>${esc(u.tenant_name) || 'N/A'}</td>
            <td><strong>${esc(u.full_name)}</strong></td>
            <td>${esc(u.username)}</td>
            <td><span class="role-badge ${esc(u.role)}">${esc(u.role.toUpperCase())}</span></td>
            <td><span class="status-badge ${u.is_active ? 'active' : 'inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
            <td>${u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
            <td class="actions-cell">
                <button class="table-btn" onclick="editUser('${u.id}')">Edit</button>
                <button class="table-btn" onclick="toggleUserStatus('${u.id}', ${!u.is_active})">${u.is_active ? 'Disable' : 'Enable'}</button>
                ${u.role !== 'superadmin' ? `<button class="table-btn danger" onclick="deleteUser('${u.id}')">Delete</button>` : ''}
            </td>
        </tr>
    `).join('') || '<tr><td colspan="7" style="text-align:center">No users found</td></tr>';
}

$('addUserBtn').addEventListener('click', () => {
    editingUser = null;
    $('userModalTitle').textContent = 'Add New User';
    $('userFullName').value = '';
    $('userUsername').value = '';
    $('userUsername').disabled = false;
    $('userRole').value = 'cashier';
    $('userPassword').value = '';
    $('userPasswordLabel').textContent = 'Password *';
    $('userPasswordHint').style.display = 'none';
    $('userModal').classList.add('active');
});

function editUser(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) return;
    editingUser = user;
    $('userModalTitle').textContent = 'Edit User';
    $('userTenantSelect').value = user.tenant_id;
    $('userFullName').value = user.full_name;
    $('userUsername').value = user.username;
    $('userUsername').disabled = true;
    $('userRole').value = user.role;
    $('userPassword').value = '';
    $('userPasswordLabel').textContent = 'New Password';
    $('userPasswordHint').style.display = 'block';
    $('userModal').classList.add('active');
}

$('saveUserBtn').addEventListener('click', async () => {
    const fullName = $('userFullName').value.trim();
    const username = $('userUsername').value.trim();
    const role = $('userRole').value;
    const password = $('userPassword').value;

    if (!fullName || !username) return showToast('Name and username required', 'error');

    try {
        if (editingUser) {
            const body = { full_name: fullName, role };
            if (password) {
                if (password.length < 6) return showToast('Password must be at least 6 characters', 'error');
                body.password = password;
            }
            await api(`/admin/users/${editingUser.id}`, 'PUT', body);
            showToast('User updated');
        } else {
            if (!password || password.length < 6) return showToast('Password must be at least 6 characters', 'error');
            await api('/admin/users', 'POST', {
                tenant_id: $('userTenantSelect').value,
                username, password, full_name: fullName, role
            });
            showToast('User created');
        }
        $('userModal').classList.remove('active');
        loadAllData();
    } catch (e) { showToast(e.message, 'error'); }
});

async function toggleUserStatus(id, newStatus) {
    try {
        await api(`/admin/users/${id}/status`, 'PUT', { is_active: newStatus });
        showToast(`User ${newStatus ? 'enabled' : 'disabled'}`);
        loadAllData();
    } catch (e) { showToast(e.message, 'error'); }
}

async function deleteUser(id) {
    if (!confirm('Delete this user permanently?')) return;
    try {
        await api(`/admin/users/${id}`, 'DELETE');
        showToast('User deleted');
        loadAllData();
    } catch (e) { showToast(e.message, 'error'); }
}

$('closeUserModal').addEventListener('click', () => $('userModal').classList.remove('active'));
$('cancelUserModal').addEventListener('click', () => $('userModal').classList.remove('active'));
$('userModal').addEventListener('click', (e) => { if (e.target === $('userModal')) $('userModal').classList.remove('active'); });
$('userTenantFilter')?.addEventListener('change', renderUsers);
$('userRoleFilter')?.addEventListener('change', renderUsers);

// ============================================
// RENDER ORDERS
// ============================================
function renderOrders() {
    const statusFilter = $('orderStatusFilter')?.value || '';
    const payFilter = $('orderPayFilter')?.value || '';
    let filtered = allOrders;
    if (statusFilter) filtered = filtered.filter(o => o.status === statusFilter);
    if (payFilter) filtered = filtered.filter(o => (o.payment_method || 'cash') === payFilter);

    $('ordersBody').innerHTML = filtered.map(o => `
        <tr>
            <td><strong>${esc(o.tenant_name) || 'Unknown'}</strong></td>
            <td>${esc(o.invoice_number)}</td>
            <td>${esc(o.customer_name) || 'Walk-in'}</td>
            <td><span class="payment-badge ${esc(o.payment_method || 'cash')}">${esc((o.payment_method || 'cash').toUpperCase())}</span></td>
            <td><span class="status-badge ${esc(o.status)}">${esc(o.status.toUpperCase())}</span></td>
            <td>Rs ${parseFloat(o.total_amount).toFixed(2)}</td>
            <td>${new Date(o.created_at).toLocaleString()}</td>
            <td>
                <button class="table-btn danger" onclick="deleteOrder('${o.id}')">Delete</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="8" style="text-align:center">No orders found</td></tr>';
}

async function deleteOrder(orderId) {
    if (!confirm('Permanently delete this order? This cannot be undone.')) return;
    try {
        await api(`/admin/orders/${orderId}`, 'DELETE');
        showToast('Order deleted');
        loadAllData();
    } catch (e) { showToast(e.message, 'error'); }
}

// ============================================
// RENDER INVENTORY
// ============================================
function renderInventory() {
    const tenantFilter = $('tenantFilter')?.value || '';
    let filtered = allInventory;
    if (tenantFilter) filtered = filtered.filter(i => i.tenant_id === tenantFilter);

    $('inventoryBody').innerHTML = filtered.map(i => `
        <tr>
            <td><strong>${esc(i.tenant_name) || 'Unknown'}</strong></td>
            <td>${esc(i.item_name)}</td>
            <td>${i.current_stock}</td>
            <td>${esc(i.unit)}</td>
            <td>${i.reorder_level}</td>
            <td><span class="status-badge ${esc(i.stock_status.toLowerCase().replace('_', '-'))}">${esc(i.stock_status.replace('_', ' '))}</span></td>
        </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center">No inventory items</td></tr>';
}

async function resetInventory() {
    const tenantId = $('tenantFilter').value;
    if (!tenantId) return showToast('Please select a restaurant first', 'error');
    const tenant = tenants.find(t => t.id === tenantId);
    if (!confirm(`Reset ALL inventory for ${tenant.name} to full capacity?`)) return;
    try {
        await api(`/admin/inventory/reset/${tenantId}`, 'POST');
        showToast('Inventory reset to full capacity');
        loadAllData();
    } catch (e) { showToast(e.message, 'error'); }
}

// ============================================
// LOAD PRODUCTS FOR TENANT
// ============================================
async function loadProducts(tenantId) {
    try {
        allProducts = await api(`/admin/products/${tenantId}`);
        renderProducts();
    } catch (e) { allProducts = []; renderProducts(); }
}

function renderProducts() {
    $('productsBody').innerHTML = allProducts.map(p => `
        <tr>
            <td><strong>${esc(tenants.find(t => t.id === p.tenant_id)?.name) || 'Unknown'}</strong></td>
            <td>${esc(p.sku)}</td>
            <td>${esc(p.name)}</td>
            <td>${esc(p.category)}</td>
            <td>Rs ${parseFloat(p.base_price).toFixed(2)}</td>
            <td>Rs ${parseFloat(p.meal_upcharge_price).toFixed(2)}</td>
            <td><span class="status-badge ${p.is_available ? 'active' : 'inactive'}">${p.is_available ? 'Yes' : 'No'}</span></td>
            <td>
                <button class="table-btn" onclick="editProduct('${p.id}')">Edit</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="8" style="text-align:center">No products found</td></tr>';
}

function editProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    editingProduct = product;
    $('editProductName').value = product.name;
    $('editProductDescription').value = product.description || '';
    $('editProductCategory').value = product.category;
    $('editProductPrice').value = product.base_price;
    $('editProductMealPrice').value = product.meal_upcharge_price;
    $('editProductAvailable').checked = product.is_available;
    $('editProductCustomizable').checked = product.is_customizable;
    $('editProductModal').classList.add('active');
}

async function saveProduct() {
    if (!editingProduct) return;
    try {
        await api(`/admin/products/${editingProduct.id}`, 'PUT', {
            name: $('editProductName').value,
            description: $('editProductDescription').value,
            category: $('editProductCategory').value,
            base_price: parseFloat($('editProductPrice').value),
            meal_upcharge_price: parseFloat($('editProductMealPrice').value),
            is_available: $('editProductAvailable').checked,
            is_customizable: $('editProductCustomizable').checked
        });
        showToast('Product updated');
        $('editProductModal').classList.remove('active');
        loadProducts(editingProduct.tenant_id);
    } catch (e) { showToast(e.message, 'error'); }
}

async function deleteProduct() {
    if (!editingProduct) return;
    if (!confirm('Delete this product?')) return;
    try {
        await api(`/admin/products/${editingProduct.id}`, 'DELETE');
        showToast('Product deleted');
        $('editProductModal').classList.remove('active');
        loadProducts(editingProduct.tenant_id);
    } catch (e) { showToast(e.message, 'error'); }
}

// ============================================
// REPORTS
// ============================================
async function loadReports() {
    const days = $('reportPeriod').value;
    const tenantId = $('reportTenantFilter').value;

    try {
        const params = `?days=${days}${tenantId ? `&tenant_id=${tenantId}` : ''}`;
        const [sales, topProducts, hours] = await Promise.all([
            api(`/admin/reports/sales${params}`),
            api(`/admin/reports/top-products?days=${days}`),
            api(`/admin/reports/hours?days=${days}`)
        ]);

        $('reportTotalOrders').textContent = sales.totals.total_orders || 0;
        $('reportTotalRevenue').textContent = `Rs ${parseFloat(sales.totals.total_revenue || 0).toFixed(0)}`;
        $('reportAvgOrder').textContent = `Rs ${parseFloat(sales.totals.avg_order_value || 0).toFixed(0)}`;

        renderRevenueChart(sales.daily);
        renderPaymentChart(sales.byPayment);
        renderHoursChart(hours);
        renderTopProducts(topProducts);
    } catch (e) {
        showToast('Failed to load reports', 'error');
    }
}

function renderRevenueChart(daily) {
    const ctx = $('revenueChart').getContext('2d');
    if (revenueChart) revenueChart.destroy();

    const labels = daily.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Revenue (Rs)',
                data: daily.map(d => parseFloat(d.revenue)),
                backgroundColor: 'rgba(21, 101, 192, 0.7)',
                borderColor: '#1565C0',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => 'Rs ' + v } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderPaymentChart(byPayment) {
    const ctx = $('paymentChart').getContext('2d');
    if (paymentChart) paymentChart.destroy();

    const colors = { cash: '#4CAF50', card: '#1565C0', mobile: '#9C27B0' };

    paymentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: byPayment.map(p => (p.payment_method || 'cash').toUpperCase()),
            datasets: [{
                data: byPayment.map(p => parseFloat(p.revenue)),
                backgroundColor: byPayment.map(p => colors[p.payment_method] || '#9E9E9E'),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: ctx => `Rs ${ctx.raw.toFixed(0)}` } }
            }
        }
    });
}

function renderHoursChart(hours) {
    const ctx = $('hoursChart').getContext('2d');
    if (hoursChart) hoursChart.destroy();

    const allHours = Array.from({ length: 24 }, (_, i) => i);
    const hourMap = {};
    hours.forEach(h => { hourMap[parseInt(h.hour)] = parseInt(h.order_count); });

    hoursChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allHours.map(h => `${h}:00`),
            datasets: [{
                label: 'Orders',
                data: allHours.map(h => hourMap[h] || 0),
                borderColor: '#FF9800',
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#FF9800'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderTopProducts(products) {
    $('topProductsList').innerHTML = products.map((p, i) => `
        <div class="top-product">
            <span class="top-product-rank">${i + 1}</span>
            <div class="top-product-info">
                <strong>${esc(p.name)}</strong>
                <small>${esc(p.tenant_name)} • ${esc(p.category)}</small>
            </div>
            <div class="top-product-stats">
                <span>${p.total_quantity} sold</span>
                <strong>Rs ${parseFloat(p.total_revenue).toFixed(0)}</strong>
            </div>
        </div>
    `).join('') || '<p style="color:var(--gray-500);text-align:center;padding:20px">No data</p>';
}

$('reportPeriod')?.addEventListener('change', loadReports);
$('reportTenantFilter')?.addEventListener('change', loadReports);

// ============================================
// ANNOUNCEMENTS
// ============================================
function renderAnnouncements() {
    $('announcementsBody').innerHTML = allAnnouncements.map(a => `
        <tr>
            <td><strong>${esc(a.title)}</strong></td>
            <td class="msg-cell">${esc(a.message.length > 80 ? a.message.substring(0, 80) + '...' : a.message)}</td>
            <td><span class="priority-badge ${esc(a.priority)}">${esc(a.priority.toUpperCase())}</span></td>
            <td>${a.target === 'all' ? 'All Restaurants' : esc(a.tenant_name) || 'Unknown'}</td>
            <td>${new Date(a.created_at).toLocaleString()}</td>
            <td>
                <button class="table-btn danger" onclick="deleteAnnouncement('${a.id}')">Delete</button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="6" style="text-align:center">No announcements</td></tr>';
}

$('addAnnouncementBtn').addEventListener('click', () => {
    $('announcementTitle').value = '';
    $('announcementMessage').value = '';
    $('announcementPriority').value = 'normal';
    $('announcementTarget').value = 'all';
    $('announcementTenantGroup').style.display = 'none';
    $('announcementModal').classList.add('active');
});

$('announcementTarget').addEventListener('change', (e) => {
    $('announcementTenantGroup').style.display = e.target.value === 'specific' ? 'block' : 'none';
});

$('sendAnnouncement').addEventListener('click', async () => {
    const title = $('announcementTitle').value.trim();
    const message = $('announcementMessage').value.trim();
    if (!title || !message) return showToast('Title and message required', 'error');

    try {
        await api('/admin/announcements', 'POST', {
            title, message,
            priority: $('announcementPriority').value,
            target: $('announcementTarget').value,
            tenant_id: $('announcementTarget').value === 'specific' ? $('announcementTenant').value : null
        });
        showToast('Announcement sent!');
        $('announcementModal').classList.remove('active');
        loadAllData();
    } catch (e) { showToast(e.message, 'error'); }
});

async function deleteAnnouncement(id) {
    if (!confirm('Delete this announcement?')) return;
    try {
        await api(`/admin/announcements/${id}`, 'DELETE');
        showToast('Announcement deleted');
        loadAllData();
    } catch (e) { showToast(e.message, 'error'); }
}

$('closeAnnouncementModal').addEventListener('click', () => $('announcementModal').classList.remove('active'));
$('cancelAnnouncement').addEventListener('click', () => $('announcementModal').classList.remove('active'));
$('announcementModal').addEventListener('click', (e) => { if (e.target === $('announcementModal')) $('announcementModal').classList.remove('active'); });

// ============================================
// NAVIGATION
// ============================================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        $(`${item.dataset.section}Section`).classList.add('active');

        const titles = {
            dashboard: ['Dashboard', 'System overview'],
            restaurants: ['Restaurants', 'All registered restaurants'],
            users: ['Users', 'Manage staff across all restaurants'],
            orders: ['Orders', 'All orders across restaurants'],
            inventory: ['Inventory', 'Stock levels for all restaurants'],
            products: ['Products', 'Menu items for all restaurants'],
            reports: ['Reports', 'Sales analytics and insights'],
            announcements: ['Announcements', 'System-wide messaging']
        };
        $('sectionTitle').textContent = titles[item.dataset.section]?.[0] || '';
        $('sectionSubtitle').textContent = titles[item.dataset.section]?.[1] || '';

        if (item.dataset.section === 'products' && tenants.length > 0) loadProducts(tenants[0].id);
        if (item.dataset.section === 'reports') loadReports();
    });
});

// ============================================
// FILTERS
// ============================================
$('orderStatusFilter')?.addEventListener('change', renderOrders);
$('orderPayFilter')?.addEventListener('change', renderOrders);
$('tenantFilter')?.addEventListener('change', renderInventory);
$('productTenantFilter')?.addEventListener('change', (e) => { if (e.target.value) loadProducts(e.target.value); });

// ============================================
// BUTTONS
// ============================================
$('refreshBtn').addEventListener('click', () => { loadAllData(); showToast('Data refreshed', 'info'); });
$('resetInventoryBtn').addEventListener('click', resetInventory);

$('addProductBtn').addEventListener('click', () => showToast('Add product feature coming soon', 'info'));

// Edit Product Modal
$('closeEditProduct').addEventListener('click', () => $('editProductModal').classList.remove('active'));
$('cancelEditProduct').addEventListener('click', () => $('editProductModal').classList.remove('active'));
$('saveProduct').addEventListener('click', saveProduct);
$('deleteProduct').addEventListener('click', deleteProduct);
$('editProductModal').addEventListener('click', (e) => { if (e.target === $('editProductModal')) $('editProductModal').classList.remove('active'); });

// ============================================
// CLOCK
// ============================================
function updateClock() {
    $('currentTime').textContent = new Date().toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ============================================
// TOAST
// ============================================
function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    $('toastContainer').appendChild(t);
    setTimeout(() => t.remove(), 3000);
}
