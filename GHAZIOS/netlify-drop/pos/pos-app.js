/**
 * GHAZIOS POS - Multi-Tenant Point of Sale
 */

const API = '/api';
let products = [];
let cart = [];
let token = null;
let user = null;
let tenantId = null;
let tenantSlug = null;
let socket = null;
let currentPayment = 'cash';
let readyOrders = [];

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

function formatPhone(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 4) v = v.slice(0, 4) + ' ' + v.slice(4);
    input.value = v;
}

// ============================================
// LOAD TENANTS FOR LOGIN
// ============================================
async function loadTenants() {
    try {
        const tenants = await fetch(`${API}/tenants`).then(r => r.json());
        $('tenantSelect').innerHTML = '<option value="">Select Restaurant</option>' +
            tenants.map(t => `<option value="${esc(t.slug)}">${esc(t.name)}</option>`).join('');
    } catch (e) {
        console.error('Failed to load tenants');
    }
}

// ============================================
// LOGIN
// ============================================
$('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    $('loginError').textContent = '';
    $('loginBtn').disabled = true;
    
    try {
        const data = await api('/auth/login', 'POST', {
            username: $('username').value,
            password: $('password').value,
            tenantSlug: $('tenantSelect').value
        });
        
        token = data.token;
        user = data.user;
        tenantId = data.user.tenantId;
        tenantSlug = data.user.tenantSlug;
        
        $('loginScreen').style.display = 'none';
        $('posApp').style.display = 'block';
        $('userName').textContent = user.fullName;
        $('userAvatar').textContent = user.fullName.charAt(0).toUpperCase();
        $('restaurantName').textContent = data.user.tenantName;
        
        loadProducts();
        loadReadyOrders();
        updatePendingBadge();
        initSocket();
        startClock();
    } catch (err) {
        $('loginError').textContent = err.message;
    }
    
    $('loginBtn').disabled = false;
});

$('logoutBtn').addEventListener('click', () => {
    token = null;
    user = null;
    tenantId = null;
    $('posApp').style.display = 'none';
    $('loginScreen').style.display = 'flex';
});

// ============================================
// SOCKET.IO
// ============================================
function initSocket() {
    try {
        // Connect directly to backend on port 4000
        socket = io(window.location.origin, { auth: { token } });
        socket.on('connect', () => socket.emit('join-room', `${tenantId}-pos`));
        socket.on('new-order', () => { toast('New order!', 'info'); updatePendingBadge(); });
        socket.on('order-ready', (data) => {
            toast(`${data.customer_name || 'Customer'}'s order is ready!`, 'info');
            addReadyOrder(data);
        });
        socket.on('order-collected', (data) => {
            removeReadyOrder(data.id);
            updatePendingBadge();
        });
    } catch (e) {}
}

// ============================================
// PRODUCTS
// ============================================
async function loadProducts() {
    try {
        products = await api(`/products?tenant_id=${tenantId}`);
        renderCategories();
        renderMenu();
    } catch (e) {
        $('menuGrid').innerHTML = '<div class="menu-loading">Failed to load</div>';
    }
}

function renderCategories() {
    const cats = [...new Set(products.map(p => p.category))];
    $('menuCats').innerHTML = `
        <button class="cat active" data-cat="all">All</button>
        ${cats.map(c => `<button class="cat" data-cat="${c}">${c}</button>`).join('')}
    `;
    
    document.querySelectorAll('.cat').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMenu(btn.dataset.cat);
        });
    });
}

function renderMenu(cat = 'all') {
    const filtered = cat === 'all' ? products : products.filter(p => p.category === cat);
    
    $('menuGrid').innerHTML = filtered.map(p => {
        const safeName = esc(p.name);
        const imgSrc = p.image_url || `https://placehold.co/240x160/f0f0f0/999?text=${encodeURIComponent(p.name)}`;
        return `
            <div class="menu-item ${!p.is_available ? 'out' : ''}" data-id="${p.id}">
                <img class="menu-item-img" src="${esc(imgSrc)}" alt="${safeName}"
                     onerror="this.src='https://placehold.co/240x160/f0f0f0/999?text=${encodeURIComponent(p.name)}'">
                <div class="menu-item-body">
                    <div class="menu-item-name">${safeName}</div>
                    <div class="menu-item-price">Rs ${parseFloat(p.base_price).toFixed(2)}</div>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.menu-item').forEach(el => {
        el.addEventListener('click', () => addToCart(el.dataset.id));
    });
}

// ============================================
// CART
// ============================================
function addToCart(id) {
    const p = products.find(x => x.id === id);
    if (!p || !p.is_available) return;
    
    const existing = cart.find(x => x.product.id === id);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ product: p, qty: 1, isMeal: true });
    }
    updateCart();
    toast(`${p.name} added`);
}

function changeQty(i, d) { cart[i].qty += d; if (cart[i].qty <= 0) cart.splice(i, 1); updateCart(); }
function toggleMeal(i) { cart[i].isMeal = !cart[i].isMeal; updateCart(); }
function clearCart() { cart = []; updateCart(); }

function updateCart() {
    const count = cart.reduce((s, x) => s + x.qty, 0);
    $('cartCount').textContent = count;
    
    if (!cart.length) {
        $('cartItems').innerHTML = '<div class="cart-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg><p>Tap items to add</p></div>';
        $('orderBtn').disabled = true;
        updateTotals();
        return;
    }
    
    $('cartItems').innerHTML = cart.map((item, i) => {
        const price = item.isMeal ? parseFloat(item.product.base_price) + parseFloat(item.product.meal_upcharge_price || 0) : parseFloat(item.product.base_price);
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${esc(item.product.name)}</div>
                    <div class="cart-item-tag ${item.isMeal ? 'meal' : 'individual'}" onclick="toggleMeal(${i})">
                        ${item.isMeal ? '🍔 Meal' : '📦 Individual'}
                    </div>
                    <div class="cart-item-price">Rs ${(price * item.qty).toFixed(2)}</div>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="changeQty(${i},-1)">−</button>
                    <span class="qty-val">${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty(${i},1)">+</button>
                </div>
            </div>
        `;
    }).join('');
    
    updateTotals();
    $('orderBtn').disabled = !$('custName').value.trim();
}

function updateTotals() {
    const sub = cart.reduce((s, x) => {
        const p = x.isMeal ? parseFloat(x.product.base_price) + parseFloat(x.product.meal_upcharge_price || 0) : parseFloat(x.product.base_price);
        return s + p * x.qty;
    }, 0);
    $('paySub').textContent = `Rs ${sub.toFixed(2)}`;
    $('payTax').textContent = `Rs ${(sub * 0.15).toFixed(2)}`;
    $('payTotal').textContent = `Rs ${(sub * 1.15).toFixed(2)}`;
}

// ============================================
// SUBMIT ORDER
// ============================================
async function submitOrder() {
    const name = $('custName').value.trim();
    if (!name) { toast('Customer name required', 'error'); return; }
    
    const phone = $('custPhone').value.replace(/\s/g, '');
    $('orderBtn').disabled = true;
    $('orderBtn').textContent = 'Processing...';
    
    try {
        const data = await api('/orders', 'POST', {
            tenant_id: tenantId,
            source: 'walkin',
            items: cart.map(x => ({
                productId: x.product.id,
                isMeal: x.isMeal,
                quantity: x.qty,
                specialNotes: $('custNotes').value
            })),
            customer: { name, phone: phone ? `+230${phone}` : null },
            paymentMethod: currentPayment,
            notes: $('custNotes').value
        });
        
        if (data.success) {
            showReceipt(data.order);
            updatePendingBadge();
        }
    } catch (e) {
        toast(e.message, 'error');
    }
    
    $('orderBtn').disabled = false;
    $('orderBtn').textContent = 'Place Order';
}

// ============================================
// RECEIPT
// ============================================
function showReceipt(order) {
    $('receiptInv').textContent = `Invoice: ${order.invoice_number}`;
    
    const sub = cart.reduce((s, x) => {
        const p = x.isMeal ? parseFloat(x.product.base_price) + parseFloat(x.product.meal_upcharge_price || 0) : parseFloat(x.product.base_price);
        return s + p * x.qty;
    }, 0);
    
    const now = new Date();
    let r = `<h4>GHAZIOS</h4>`;
    r += `<div class="sep">================================</div>`;
    r += `<div>Invoice: ${order.invoice_number}</div>`;
    r += `<div>Date: ${now.toLocaleDateString('en-GB')}</div>`;
    r += `<div>Time: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>`;
    r += `<div>Cashier: ${esc(user.fullName)}</div>`;
    if (order.customer_name) r += `<div>Customer: ${esc(order.customer_name)}</div>`;
    r += `<div class="sep">--------------------------------</div>`;
    
    cart.forEach(x => {
        const p = x.isMeal ? parseFloat(x.product.base_price) + parseFloat(x.product.meal_upcharge_price || 0) : parseFloat(x.product.base_price);
        r += `<div>${esc(x.product.name)}</div>`;
        r += `<div>${x.isMeal ? '[MEAL]' : '[IND]'} x${x.qty} ........ Rs ${(p * x.qty).toFixed(2)}</div>`;
    });
    
    r += `<div class="sep">--------------------------------</div>`;
    r += `<div>Subtotal: Rs ${sub.toFixed(2)}</div>`;
    r += `<div>Tax: Rs ${(sub * 0.15).toFixed(2)}</div>`;
    r += `<div style="font-weight:bold">TOTAL: Rs ${(sub * 1.15).toFixed(2)}</div>`;
    r += `<div>Payment: ${currentPayment.toUpperCase()}</div>`;
    r += `<div class="sep">================================</div>`;
    r += `<div style="text-align:center">Thank you!</div>`;
    
    $('receiptPaper').innerHTML = r;
    $('receiptOverlay').classList.add('active');
    
    cart = [];
    updateCart();
    $('custName').value = '';
    $('custPhone').value = '';
    $('custNotes').value = '';
}

$('printBtn').addEventListener('click', () => {
    const w = window.open('', '_blank', 'width=400');
    w.document.write(`<html><head><title>Receipt</title><style>body{font-family:'Courier New',monospace;padding:20px;max-width:300px;margin:0 auto}h4{text-align:center;font-weight:900}.sep{text-align:center;color:#999}</style></head><body>${$('receiptPaper').innerHTML}</body></html>`);
    w.document.close();
    w.print();
});

$('newOrderBtn').addEventListener('click', () => $('receiptOverlay').classList.remove('active'));
$('closeReceipt').addEventListener('click', () => $('receiptOverlay').classList.remove('active'));

// ============================================
// READY ORDERS
// ============================================
function addReadyOrder(order) {
    if (!readyOrders.find(o => o.id === order.id)) {
        readyOrders.push(order);
    }
    renderReadyPanel();
}

function removeReadyOrder(orderId) {
    readyOrders = readyOrders.filter(o => o.id !== orderId);
    renderReadyPanel();
}

async function loadReadyOrders() {
    try {
        const orders = await api(`/orders?status=ready`);
        readyOrders = orders;
        renderReadyPanel();
    } catch (e) {}
}

function renderReadyPanel() {
    $('readyCount').textContent = readyOrders.length;
    
    if (!readyOrders.length) {
        $('readyList').innerHTML = '<div class="ready-empty">No orders ready</div>';
        return;
    }
    
    $('readyList').innerHTML = readyOrders.map(o => `
        <div class="ready-card">
            <div class="ready-card-name">${esc(o.customer_name) || 'Customer'}</div>
            <div class="ready-card-invoice">${esc(o.invoice_number)}</div>
            <button class="ready-card-btn" data-id="${o.id}">Collected ✓</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.ready-card-btn').forEach(btn => {
        btn.addEventListener('click', () => collectOrder(btn.dataset.id));
    });
}

async function collectOrder(id) {
    try {
        await api(`/orders/${id}/collect`, 'PUT');
        removeReadyOrder(id);
        toast('Order collected!');
        updatePendingBadge();
    } catch (e) {
        toast(e.message, 'error');
    }
}

// ============================================
// ORDERS
// ============================================
async function updatePendingBadge() {
    try {
        const orders = await api('/orders?status=pending');
        $('pendingBadge').textContent = orders.length;
        $('pendingBadge').style.display = orders.length > 0 ? 'flex' : 'none';
    } catch (e) {}
}

async function loadOrders(status = 'all') {
    try {
        const url = status === 'all' ? '/orders' : `/orders?status=${status}`;
        const orders = await api(url);
        renderOrders(orders);
    } catch (e) {
        $('ordList').innerHTML = '<div style="text-align:center;padding:24px;color:#999">Failed to load</div>';
    }
}

function renderOrders(orders) {
    if (!orders.length) {
        $('ordList').innerHTML = '<div style="text-align:center;padding:32px;color:#999">No orders</div>';
        return;
    }
    
    $('ordList').innerHTML = orders.map(o => `
        <div class="ord-card">
            <div class="ord-card-top">
                <span class="ord-card-name">${esc(o.customer_name) || 'Walk-in'}</span>
                <span class="status-dot ${esc(o.status)}">${esc(o.status.toUpperCase())}</span>
            </div>
            <div class="ord-card-info">${esc(o.invoice_number)} • ${new Date(o.created_at).toLocaleTimeString()}</div>
            <div class="ord-card-pay">${esc((o.payment_method || 'cash').toUpperCase())}</div>
        </div>
    `).join('');
}

// ============================================
// UTILITY
// ============================================
function startClock() {
    const u = () => { $('clock').textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); };
    u();
    setInterval(u, 1000);
}

function toast(msg, type = 'ok') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    if (urlToken) {
        token = urlToken;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            user = { id: payload.id, username: payload.username, role: payload.role, fullName: payload.fullName };
            tenantId = payload.tenantId;
            tenantSlug = payload.tenantSlug;
            $('loginScreen').style.display = 'none';
            $('posApp').style.display = 'block';
            $('userName').textContent = payload.fullName + (payload.impersonatedBy ? ` (via ${payload.impersonatedBy})` : '');
            $('userAvatar').textContent = payload.fullName.charAt(0).toUpperCase();
            $('restaurantName').textContent = payload.tenantName;
            window.history.replaceState({}, document.title, window.location.pathname);
            loadProducts(); loadReadyOrders(); updatePendingBadge(); initSocket(); startClock();
        } catch (e) { token = null; loadTenants(); }
        return;
    }
    loadTenants();
    
    document.querySelectorAll('.pay-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pay-opt').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPayment = btn.dataset.method;
        });
    });
    
    $('clearBtn').addEventListener('click', clearCart);
    $('orderBtn').addEventListener('click', submitOrder);
    $('custName').addEventListener('input', () => { $('orderBtn').disabled = !$('custName').value.trim() || !cart.length; });
    $('custPhone').addEventListener('input', function() { formatPhone(this); });
    $('refreshBtn').addEventListener('click', () => { loadProducts(); updatePendingBadge(); loadReadyOrders(); toast('Refreshed', 'info'); });
    
    $('ordersBtn').addEventListener('click', () => { loadOrders(); $('ordersOverlay').classList.add('active'); });
    $('closeOrders').addEventListener('click', () => $('ordersOverlay').classList.remove('active'));
    $('ordersOverlay').addEventListener('click', e => { if (e.target === $('ordersOverlay')) $('ordersOverlay').classList.remove('active'); });
    
    document.querySelectorAll('.ord-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.ord-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadOrders(tab.dataset.st === 'walkin' ? 'walkin' : 'online');
        });
    });
    
    document.querySelectorAll('.sf').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sf').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadOrders(btn.dataset.filter === 'all' ? 'all' : btn.dataset.filter);
        });
    });
});
