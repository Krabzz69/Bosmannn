/**
 * GHAZIOS Admin Panel - Multi-Tenant
 */

const API = '/api';
let inventory = [];
let orders = [];
let token = null;
let tenantId = null;
let restockItem = null;
let socket = null;

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

// Load tenants
async function loadTenants() {
    try {
        const tenants = await fetch(`${API}/tenants`).then(r => r.json());
        $('tenantSelect').innerHTML = '<option value="">Select Restaurant</option>' +
            tenants.map(t => `<option value="${esc(t.slug)}">${esc(t.name)}</option>`).join('');
    } catch (e) {}
}

// Login
$('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    $('loginError').textContent = '';
    try {
        const data = await api('/auth/login', 'POST', {
            username: $('username').value,
            password: $('password').value,
            tenantSlug: $('tenantSelect').value
        });
        token = data.token;
        tenantId = data.user.tenantId;
        $('loginScreen').style.display = 'none';
        $('adminContainer').style.display = 'grid';
        $('userName').textContent = data.user.fullName;
        $('restaurantName').textContent = data.user.tenantName;
        loadData();
        initSocket();
        updateClock();
        setInterval(updateClock, 1000);
    } catch (err) {
        $('loginError').textContent = err.message;
    }
});

$('logoutBtn').addEventListener('click', () => {
    token = null;
    tenantId = null;
    $('loginScreen').style.display = 'flex';
    $('adminContainer').style.display = 'none';
});

// Socket.IO
function initSocket() {
    try {
        // Connect directly to backend on port 4000
        socket = io(window.location.origin, { auth: { token } });
        socket.on('connect', () => socket.emit('join-room', `${tenantId}-admin`));
        socket.on('new-order', () => loadData());
        socket.on('order-confirmed', () => loadData());
        socket.on('order-ready', () => loadData());
        socket.on('order-collected', () => loadData());
        socket.on('inventory-updated', () => loadData());
    } catch (e) {}
}

// Load all data
async function loadData() {
    try {
        const [stats, inv, ords] = await Promise.all([
            api('/dashboard/stats'),
            api('/inventory'),
            api('/orders')
        ]);
        
        $('todayOrders').textContent = stats.today?.total_orders || 0;
        $('todayRevenue').textContent = `Rs ${parseFloat(stats.today?.total_revenue || 0).toFixed(0)}`;
        $('pendingOrders').textContent = stats.today?.pending_orders || 0;
        $('lowStockCount').textContent = stats.lowStockItems || 0;
        
        inventory = inv;
        orders = ords;
        
        renderDashboard();
        renderInventory();
        renderOrders();
    } catch (e) {
        console.error('Failed to load data:', e);
    }
}

// Render dashboard
function renderDashboard() {
    $('recentOrders').innerHTML = orders.slice(0, 5).map(o => `
        <div class="recent-item">
            <div>
                <strong>${esc(o.invoice_number)}</strong>
                <br><small>${esc(o.customer_name) || 'Walk-in'} • ${new Date(o.created_at).toLocaleTimeString()}</small>
            </div>
            <span class="status-badge ${esc(o.status)}">${esc(o.status.toUpperCase())}</span>
        </div>
    `).join('') || '<p style="color:#999;text-align:center">No orders today</p>';
    
    const lowStock = inventory.filter(i => i.stock_status !== 'IN_STOCK');
    $('lowStockList').innerHTML = lowStock.slice(0, 5).map(i => `
        <div class="low-stock-item">
            <span>${i.item_name}</span>
            <span style="color:#F44336;font-weight:600">${i.current_stock} ${i.unit}</span>
        </div>
    `).join('') || '<p style="color:#999;text-align:center">All items in stock</p>';
}

// Render inventory
function renderInventory(search = '') {
    const filtered = search 
        ? inventory.filter(i => i.item_name.toLowerCase().includes(search.toLowerCase()))
        : inventory;
    
    $('inventoryBody').innerHTML = filtered.map(item => `
        <tr>
            <td><strong>${esc(item.item_name)}</strong></td>
            <td>${item.current_stock}</td>
            <td>${esc(item.unit)}</td>
            <td>${item.reorder_level}</td>
            <td><span class="status-badge ${esc(item.stock_status.toLowerCase().replace('_', '-'))}">${esc(item.stock_status.replace('_', ' '))}</span></td>
            <td>
                <button class="table-btn restock-btn" data-id="${item.id}" 
                        data-name="${esc(item.item_name)}" 
                        data-stock="${item.current_stock}" 
                        data-unit="${esc(item.unit)}">
                    Restock
                </button>
            </td>
        </tr>
    `).join('');
    
    document.querySelectorAll('.restock-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openRestockModal(btn.dataset.id, btn.dataset.name, btn.dataset.stock, btn.dataset.unit);
        });
    });
}

// Render orders
function renderOrders() {
    const statusFilter = $('orderStatusFilter')?.value || '';
    const sourceFilter = $('orderSourceFilter')?.value || '';
    const payFilter = $('orderPayFilter')?.value || '';
    let filtered = orders;
    if (statusFilter) filtered = filtered.filter(o => o.status === statusFilter);
    if (sourceFilter) filtered = filtered.filter(o => o.source === sourceFilter);
    if (payFilter) filtered = filtered.filter(o => (o.payment_method || 'cash') === payFilter);
    
    $('ordersBody').innerHTML = filtered.map(o => `
        <tr>
            <td><strong>${esc(o.invoice_number)}</strong></td>
            <td>${esc(o.customer_name) || 'Walk-in'}</td>
            <td>${esc(o.source)}</td>
            <td><span class="payment-badge ${esc(o.payment_method || 'cash')}">${esc((o.payment_method || 'cash').toUpperCase())}</span></td>
            <td><span class="status-badge ${esc(o.status)}">${esc(o.status.toUpperCase())}</span></td>
            <td>Rs ${parseFloat(o.total_amount).toFixed(2)}</td>
            <td>${new Date(o.created_at).toLocaleString()}</td>
        </tr>
    `).join('');
}

// Restock
function openRestockModal(id, name, stock, unit) {
    restockItem = { id };
    $('restockItemName').textContent = name;
    $('restockCurrent').textContent = `Current Stock: ${stock} ${unit}`;
    $('restockQuantity').value = 1;
    const qtys = unit === 'pieces' ? [10, 25, 50, 100, 200] : [5, 10, 20, 50];
    $('quickQuantityBtns').innerHTML = qtys.map(q => `<button class="quick-btn" data-qty="${q}">${q} ${unit}</button>`).join('');
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => { $('restockQuantity').value = btn.dataset.qty; });
    });
    $('restockModal').classList.add('active');
}

async function confirmRestock() {
    if (!restockItem) return;
    const qty = parseFloat($('restockQuantity').value);
    if (!qty || qty <= 0) return;
    try {
        await api(`/inventory/${restockItem.id}/restock`, 'PUT', { quantity: qty });
        showToast('Restocked successfully');
        $('restockModal').classList.remove('active');
        loadData();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        $(`${item.dataset.section}Section`).classList.add('active');
        const titles = { dashboard: 'Dashboard', inventory: 'Inventory', orders: 'Orders' };
        $('sectionTitle').textContent = titles[item.dataset.section] || '';
    });
});

// Search
$('inventorySearch')?.addEventListener('input', (e) => renderInventory(e.target.value));

// Filters
$('orderStatusFilter')?.addEventListener('change', renderOrders);
$('orderSourceFilter')?.addEventListener('change', renderOrders);
$('orderPayFilter')?.addEventListener('change', renderOrders);

// Refresh
$('refreshBtn')?.addEventListener('click', () => { loadData(); showToast('Refreshed'); });

// Restock modal
$('closeRestockModal').addEventListener('click', () => $('restockModal').classList.remove('active'));
$('cancelRestock').addEventListener('click', () => $('restockModal').classList.remove('active'));
$('confirmRestock').addEventListener('click', confirmRestock);
$('restockModal').addEventListener('click', (e) => { if (e.target === $('restockModal')) $('restockModal').classList.remove('active'); });

// Clock
function updateClock() {
    $('currentTime').textContent = new Date().toLocaleString('en-US', { 
        weekday: 'short', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
}

// Toast
function showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    $('toastContainer').appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    if (urlToken) {
        token = urlToken;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            tenantId = payload.tenantId;
            $('loginScreen').style.display = 'none';
            $('adminContainer').style.display = 'grid';
            $('userName').textContent = payload.fullName + (payload.impersonatedBy ? ` (via ${payload.impersonatedBy})` : '');
            $('restaurantName').textContent = payload.tenantName;
            window.history.replaceState({}, document.title, window.location.pathname);
            loadData(); initSocket(); updateClock(); setInterval(updateClock, 1000);
        } catch (e) { token = null; loadTenants(); }
        return;
    }
    loadTenants();
});
