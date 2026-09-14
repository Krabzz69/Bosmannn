/**
 * GHAZIOS Kitchen Display - Multi-Tenant
 */

const API = '/api';
let orders = [];
let token = null;
let tenantId = null;
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

// Load tenants for login
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
        $('kitchenContainer').style.display = 'block';
        $('restaurantName').textContent = data.user.tenantName;
        loadOrders();
        initSocket();
        updateClock();
        setInterval(updateClock, 1000);
        setInterval(loadOrders, 15000);
    } catch (err) {
        $('loginError').textContent = err.message;
    }
});

$('logoutBtn').addEventListener('click', () => {
    token = null;
    tenantId = null;
    $('loginScreen').style.display = 'flex';
    $('kitchenContainer').style.display = 'none';
});

// Socket.IO
function initSocket() {
    try {
        // Connect directly to backend on port 4000
        socket = io(window.location.origin, { auth: { token } });
        socket.on('connect', () => socket.emit('join-room', `${tenantId}-kitchen`));
        socket.on('new-order', () => { toast('New order!', 'info'); beep(); loadOrders(); });
        socket.on('order-confirmed', () => loadOrders());
    } catch (e) {}
}

function beep() {
    try {
        const c = new AudioContext();
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g);
        g.connect(c.destination);
        o.frequency.value = 800;
        g.gain.value = 0.3;
        o.start();
        setTimeout(() => o.stop(), 200);
    } catch (e) {}
}

// Load orders
async function loadOrders() {
    try {
        const all = await api('/orders');
        orders = all.filter(o => ['pending', 'confirmed'].includes(o.status));
        orders.sort((a, b) => {
            if (a.source === 'walkin' && b.source !== 'walkin') return -1;
            if (a.source !== 'walkin' && b.source === 'walkin') return 1;
            return new Date(a.created_at) - new Date(b.created_at);
        });
        renderOrders();
        updateStats();
    } catch (e) {}
}

function updateStats() {
    $('pendingCount').textContent = orders.filter(o => o.status === 'pending').length;
    $('confirmedCount').textContent = orders.filter(o => o.status === 'confirmed').length;
}

function renderOrders() {
    if (!orders.length) {
        $('ordersGrid').innerHTML = '<div class="empty-state">No orders</div>';
        return;
    }
    
    const walkinOrders = orders.filter(o => o.source === 'walkin');
    const priorityIds = new Set(walkinOrders.slice(0, 3).map(o => o.id));
    
    $('ordersGrid').innerHTML = orders.map(order => {
        const time = new Date(order.created_at);
        const mins = Math.floor((new Date() - time) / 60000);
        const clockStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const timeStr = mins < 1 ? 'Just now' : `${mins} min ago`;
        const isPriority = priorityIds.has(order.id);
        const isOnline = order.source === 'online' || order.source === 'reservation';
        
        return `
            <div class="order-card ${isPriority ? 'priority' : ''} ${isOnline ? 'online' : ''}">
                <div class="order-card-header">
                    <span class="order-customer-name">${esc(order.customer_name) || 'Walk-in Customer'}</span>
                    <span class="order-source ${esc(order.source)}">${esc(order.source)}</span>
                </div>
                <div class="order-card-body">
                    <div class="order-time">🕐 ${clockStr} (${timeStr})</div>
                    ${order.notes ? `<div class="order-notes">📝 ${esc(order.notes)}</div>` : ''}
                </div>
                <div class="order-card-footer">
                    <span class="status-badge ${esc(order.status)}">${order.status === 'pending' ? 'PENDING' : 'PREPARING'}</span>
                    ${order.status === 'pending' 
                        ? `<button class="prepare-btn" onclick="startPreparing('${order.id}')">Start Preparing</button>` 
                        : `<button class="ready-btn" onclick="markReady('${order.id}')">Mark Ready</button>`}
                </div>
            </div>
        `;
    }).join('');
}

async function startPreparing(orderId) {
    try {
        await api(`/orders/${orderId}/confirm`, 'PUT');
        toast('Order confirmed - preparing');
        loadOrders();
    } catch (e) { toast(e.message, 'error'); }
}

async function markReady(orderId) {
    try {
        await api(`/orders/${orderId}/ready`, 'PUT');
        toast('Order ready!');
        loadOrders();
    } catch (e) { toast(e.message, 'error'); }
}

function updateClock() {
    $('currentTime').textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    $('toastContainer').appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    if (urlToken) {
        token = urlToken;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            tenantId = payload.tenantId;
            $('loginScreen').style.display = 'none';
            $('kitchenContainer').style.display = 'block';
            $('restaurantName').textContent = payload.tenantName || '';
            window.history.replaceState({}, document.title, window.location.pathname);
            loadOrders(); initSocket(); updateClock(); setInterval(updateClock, 1000); setInterval(loadOrders, 15000);
        } catch (e) { token = null; loadTenants(); }
        return;
    }
    loadTenants();
    $('refreshBtn').addEventListener('click', () => { loadOrders(); toast('Refreshed', 'info'); });
});
