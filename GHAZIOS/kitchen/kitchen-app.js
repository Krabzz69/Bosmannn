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
        
        // FIXED: Queue Starvation - Sort by time first, then by source priority (Issue #8)
        // Online orders should not starve; prioritize by wait time with slight walk-in preference
        orders.sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            const now = Date.now();
            const waitA = now - timeA;
            const waitB = now - timeB;
            
            // If one order has been waiting significantly longer (>10 min), prioritize it regardless of source
            if (waitA - waitB > 600000) return -1;
            if (waitB - waitA > 600000) return 1;
            
            // For similar wait times, give slight priority to walk-ins (first 3 only)
            const aIsWalkin = a.source === 'walkin' ? 1 : 0;
            const bIsWalkin = b.source === 'walkin' ? 1 : 0;
            if (aIsWalkin !== bIsWalkin) return bIsWalkin - aIsWalkin;
            
            // Otherwise sort by creation time
            return timeA - timeB;
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
        
        // FIXED: Render order items so kitchen can see what to prepare (Issue #4)
        const itemsHtml = (order.items && order.items.length > 0) 
            ? order.items.map(item => `
                <div class="order-item">
                    <span class="item-qty">${item.quantity}x</span>
                    <span class="item-name">${esc(item.product_name)}</span>
                    ${item.is_meal ? '<span class="meal-badge">MEAL</span>' : ''}
                    ${item.special_notes ? `<div class="item-notes">📝 ${esc(item.special_notes)}</div>` : ''}
                </div>
            `).join('')
            : '<div class="no-items">No items listed</div>';
        
        return `
            <div class="order-card ${isPriority ? 'priority' : ''} ${isOnline ? 'online' : ''}">
                <div class="order-card-header">
                    <span class="order-customer-name">${esc(order.customer_name) || 'Walk-in Customer'}</span>
                    <span class="order-source ${esc(order.source)}">${esc(order.source)}</span>
                </div>
                <div class="order-card-body">
                    <div class="order-time">🕐 ${clockStr} (${timeStr})</div>
                    ${order.notes ? `<div class="order-notes">📝 ${esc(order.notes)}</div>` : ''}
                    <div class="order-items-list">
                        ${itemsHtml}
                    </div>
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
    let initialized = false;
    
    if (urlToken) {
        token = urlToken;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            tenantId = payload.tenantId;
            $('loginScreen').style.display = 'none';
            $('kitchenContainer').style.display = 'block';
            $('restaurantName').textContent = payload.tenantName || '';
            window.history.replaceState({}, document.title, window.location.pathname);
            // FIXED: Initialize all components for impersonated sessions
            loadOrders(); 
            initSocket(); 
            updateClock(); 
            setInterval(updateClock, 1000); 
            setInterval(loadOrders, 15000);
            initialized = true;
        } catch (e) { 
            console.error('Invalid token:', e);
            token = null; 
            loadTenants(); 
        }
        return;
    }
    
    if (!initialized) {
        loadTenants();
        $('refreshBtn').addEventListener('click', () => { loadOrders(); toast('Refreshed', 'info'); });
    }
});
