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
        
        // FIXED: Session Fragility - Store token in localStorage for persistence (Issue #7)
        localStorage.setItem('ghazios_pos_token', token);
        localStorage.setItem('ghazios_pos_user', JSON.stringify(user));
        
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
    // Clear stored session on logout
    localStorage.removeItem('ghazios_pos_token');
    localStorage.removeItem('ghazios_pos_user');
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
            await showReceipt(data.order);
            updatePendingBadge();
        }
    } catch (e) {
        toast(e.message, 'error');
    }
    
    $('orderBtn').disabled = false;
    $('orderBtn').textContent = 'Place Order';
}

// ============================================
// RECEIPT - FIXED: Generate from server order data (Issue #6)
// ============================================
async function showReceipt(order) {
    $('receiptInv').textContent = `Invoice: ${order.invoice_number}`;
    
    // FIXED: Fetch complete order data from server including items
    // Don't use client-side cart which can be manipulated
    let orderData = order;
    if (!orderData.items) {
        try {
            const fullOrder = await api(`/orders/${order.id}`);
            orderData = fullOrder.order;
            orderData.items = fullOrder.items;
        } catch (e) {
            console.error('Failed to fetch order details:', e);
        }
    }
    
    const now = new Date(orderData.created_at);
    
    // FIXED: Use restaurant name instead of GHAZIOS branding (Issue #29)
    const restaurantName = user.tenantName || 'GHAZIOS';
    let r = `<h4>${esc(restaurantName)}</h4>`;
    r += `<div class="sep">================================</div>`;
    r += `<div>Invoice: ${esc(orderData.invoice_number)}</div>`;
    r += `<div>Date: ${now.toLocaleDateString('en-GB')}</div>`;
    r += `<div>Time: ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>`;
    r += `<div>Cashier: ${esc(user.fullName)}</div>`;
    if (orderData.customer_name) r += `<div>Customer: ${esc(orderData.customer_name)}</div>`;
    r += `<div class="sep">--------------------------------</div>`;
    
    // FIXED: Render items from server data, not client cart
    let subtotal = 0;
    if (orderData.items && orderData.items.length > 0) {
        orderData.items.forEach(item => {
            const lineTotal = parseFloat(item.line_total);
            subtotal += lineTotal;
            const mealTag = item.is_meal ? '[MEAL]' : '[IND]';
            r += `<div>${esc(item.product_name)}</div>`;
            r += `<div>${mealTag} x${item.quantity} ........ Rs ${lineTotal.toFixed(2)}</div>`;
            if (item.special_notes) {
                r += `<div style="font-size:0.8em;color:#666">Note: ${esc(item.special_notes)}</div>`;
            }
        });
    }
    
    const tax = parseFloat(orderData.tax_amount) || (subtotal * 0.15);
    const total = parseFloat(orderData.total_amount) || (subtotal + tax);
    
    r += `<div class="sep">--------------------------------</div>`;
    r += `<div>Subtotal: Rs ${subtotal.toFixed(2)}</div>`;
    r += `<div>Tax (15%): Rs ${tax.toFixed(2)}</div>`;
    r += `<div style="font-weight:bold;font-size:1.1em">TOTAL: Rs ${total.toFixed(2)}</div>`;
    r += `<div>Payment: ${esc((orderData.payment_method || 'cash').toUpperCase())}</div>`;
    if (orderData.payment_status) {
        r += `<div>Status: ${esc(orderData.payment_status.toUpperCase())}</div>`;
    }
    r += `<div class="sep">================================</div>`;
    r += `<div style="text-align:center">Thank you for your business!</div>`;
    r += `<div style="text-align:center;font-size:0.8em;color:#666;margin-top:8px">${esc(restaurantName)}</div>`;
    
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

async function loadOrders(source = 'all') {
    try {
        // FIXED: POS Filter Failure - Pass valid source param instead of invalid status (Issue #5)
        const url = source === 'all' ? '/orders' : `/orders?source=${source}`;
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
// INIT - FIXED: Properly initialize impersonated sessions (Issue #4)
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Check for token in URL (impersonation) or localStorage (persistent session)
    const urlToken = new URLSearchParams(window.location.search).get('token');
    let initialized = false;
    
    if (urlToken) {
        token = urlToken;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            user = { 
                id: payload.id, 
                username: payload.username, 
                role: payload.role, 
                fullName: payload.fullName,
                tenantId: payload.tenantId,
                tenantSlug: payload.tenantSlug,
                tenantName: payload.tenantName
            };
            tenantId = payload.tenantId;
            tenantSlug = payload.tenantSlug;
            $('loginScreen').style.display = 'none';
            $('posApp').style.display = 'block';
            $('userName').textContent = payload.fullName + (payload.impersonatedBy ? ` (via ${payload.impersonatedBy})` : '');
            $('userAvatar').textContent = payload.fullName.charAt(0).toUpperCase();
            $('restaurantName').textContent = payload.tenantName;
            window.history.replaceState({}, document.title, window.location.pathname);
            // FIXED: Initialize all components for impersonated sessions
            loadProducts(); 
            loadReadyOrders(); 
            updatePendingBadge(); 
            initSocket(); 
            startClock();
            initialized = true;
        } catch (e) { 
            console.error('Invalid token:', e);
            token = null; 
            loadTenants(); 
        }
        return;
    }
    
    // Check for persistent session in localStorage
    const storedToken = localStorage.getItem('ghazios_pos_token');
    const storedUser = localStorage.getItem('ghazios_pos_user');
    if (storedToken && storedUser) {
        try {
            token = storedToken;
            user = JSON.parse(storedUser);
            tenantId = user.tenantId;
            tenantSlug = user.tenantSlug;
            // Verify token is still valid by checking expiry
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
                throw new Error('Token expired');
            }
            $('loginScreen').style.display = 'none';
            $('posApp').style.display = 'block';
            $('userName').textContent = user.fullName;
            $('userAvatar').textContent = user.fullName.charAt(0).toUpperCase();
            $('restaurantName').textContent = user.tenantName;
            loadProducts(); 
            loadReadyOrders(); 
            updatePendingBadge(); 
            initSocket(); 
            startClock();
            initialized = true;
        } catch (e) {
            console.log('Session expired, requiring login');
            localStorage.removeItem('ghazios_pos_token');
            localStorage.removeItem('ghazios_pos_user');
            loadTenants();
        }
    }
    
    if (!initialized && !urlToken) {
        loadTenants();
    }
    
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
