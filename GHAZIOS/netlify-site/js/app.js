/**
 * GHAZIOS - Customer Ordering Website
 * Multi-tenant with Binary Rain Animation
 */

const API = '/api';
let tenants = [];
let selectedTenant = null;
let products = [];
let cart = [];
let binaryAnimationId = null;

const $ = s => document.getElementById(s);
function esc(s) { if (s == null) return ''; const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }

// ============================================
// BINARY RAIN ANIMATION
// ============================================
function initBinaryRain() {
    const canvas = $('binaryCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Binary digits
    const digits = ['0', '1'];
    
    // Columns - 7 columns with alternating speeds
    const columns = [];
    const columnCount = 7;
    const columnWidth = canvas.width / columnCount;
    
    for (let i = 0; i < columnCount; i++) {
        columns.push({
            x: i * columnWidth + columnWidth / 2,
            digits: [],
            speed: (i % 2 === 0 ? 1 : -1) * (0.5 + Math.random() * 1.5), // Alternating directions
            offset: Math.random() * canvas.height
        });
        
        // Fill column with random digits
        const digitCount = Math.floor(canvas.height / 25) + 5;
        for (let j = 0; j < digitCount; j++) {
            columns[i].digits.push({
                char: digits[Math.floor(Math.random() * 2)],
                y: (j * 25) + columns[i].offset,
                opacity: 0.1 + Math.random() * 0.4
            });
        }
    }
    
    function draw() {
        // Clear canvas with semi-transparent black for trail effect
        ctx.fillStyle = 'rgba(10, 10, 10, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw each column
        columns.forEach(col => {
            col.digits.forEach(digit => {
                // Update position
                digit.y += col.speed;
                
                // Wrap around
                if (col.speed > 0 && digit.y > canvas.height + 20) {
                    digit.y = -20;
                    digit.char = digits[Math.floor(Math.random() * 2)];
                    digit.opacity = 0.1 + Math.random() * 0.4;
                } else if (col.speed < 0 && digit.y < -20) {
                    digit.y = canvas.height + 20;
                    digit.char = digits[Math.floor(Math.random() * 2)];
                    digit.opacity = 0.1 + Math.random() * 0.4;
                }
                
                // Draw digit
                ctx.font = '18px "Fira Code", monospace';
                ctx.fillStyle = `rgba(100, 100, 100, ${digit.opacity})`;
                ctx.textAlign = 'center';
                ctx.fillText(digit.char, col.x, digit.y);
            });
        });
        
        binaryAnimationId = requestAnimationFrame(draw);
    }
    
    draw();
    
    // Handle resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

function stopBinaryRain() {
    if (binaryAnimationId) {
        cancelAnimationFrame(binaryAnimationId);
        binaryAnimationId = null;
    }
}

// ============================================
// LOAD RESTAURANTS
// ============================================
async function loadRestaurants() {
    try {
        const res = await fetch(`${API}/tenants`);
        tenants = await res.json();
        renderRestaurants();
    } catch (e) {
        $('restaurantsGrid').innerHTML = '<div class="loading">Failed to load restaurants</div>';
    }
}

function renderRestaurants() {
    $('restaurantsGrid').innerHTML = tenants.map(t => `
        <div class="restaurant-card" data-slug="${esc(t.slug)}" data-id="${t.id}" data-name="${esc(t.name)}" data-color="${esc(t.primary_color || '#D32F2F')}">
            <div class="restaurant-card-logo" style="background: linear-gradient(135deg, ${esc(t.primary_color || '#D32F2F')}, ${esc(t.secondary_color || '#1565C0')})">
                ${esc(t.name.charAt(0))}
            </div>
            <div class="restaurant-card-body">
                <div class="restaurant-card-name">${esc(t.name)}</div>
                <div class="restaurant-card-address">${esc(t.address)}</div>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.restaurant-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            const slug = card.dataset.slug;
            const name = card.dataset.name;
            const color = card.dataset.color;
            selectRestaurant(id, slug, name, color);
        });
    });
}

// ============================================
// SELECT RESTAURANT WITH ANIMATION
// ============================================
function selectRestaurant(tenantId, slug, name, color) {
    selectedTenant = { id: tenantId, slug: slug };
    
    // Show choice animation
    const overlay = $('choiceOverlay');
    const text = $('choiceText');
    
    text.textContent = name;
    text.style.color = color;
    
    overlay.classList.add('active');
    
    // After animation, show menu
    setTimeout(() => {
        overlay.classList.remove('active');
        $('landingPage').style.display = 'none';
        $('menuPage').style.display = 'block';
        $('restaurantName').textContent = name;
        
        // Update header color
        document.querySelector('.menu-header').style.borderBottom = `3px solid ${color}`;
        
        stopBinaryRain();
        loadProducts(tenantId);
    }, 1500);
}

// ============================================
// LOAD PRODUCTS
// ============================================
async function loadProducts(tenantId) {
    try {
        const res = await fetch(`${API}/products?tenant_id=${tenantId}`);
        products = await res.json();
        renderCategories();
        renderMenu();
    } catch (e) {
        $('menuGrid').innerHTML = '<div class="loading">Failed to load menu</div>';
    }
}

function renderCategories() {
    const categories = [...new Set(products.map(p => p.category))];
    $('categoryScroll').innerHTML = `
        <button class="cat-btn active" data-cat="all">All</button>
        ${categories.map(c => `<button class="cat-btn" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
    `;
    
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMenu(btn.dataset.cat);
        });
    });
}

function renderMenu(cat = 'all') {
    const filtered = cat === 'all' ? products : products.filter(p => p.category === cat);
    
    $('menuGrid').innerHTML = filtered.map(p => {
        const safeName = esc(p.name);
        const imgSrc = p.image_url || `https://placehold.co/400x300/f0f0f0/999?text=${encodeURIComponent(p.name)}`;
        return `
            <div class="menu-card ${!p.is_available ? 'out-of-stock' : ''}" data-id="${p.id}">
                <img class="menu-card-image" src="${esc(imgSrc)}" alt="${safeName}" 
                     onerror="this.src='https://placehold.co/400x300/f0f0f0/999?text=${encodeURIComponent(p.name)}'">
                <div class="menu-card-body">
                    <div class="menu-card-category">${esc(p.category)}</div>
                    <h3 class="menu-card-title">${safeName}</h3>
                    <p class="menu-card-desc">${esc(p.description)}</p>
                    <div class="menu-card-footer">
                        <div>
                            <div class="menu-card-price">Rs ${parseFloat(p.base_price).toFixed(2)}</div>
                            ${parseFloat(p.meal_upcharge_price) > 0 ? `<div class="menu-card-meal">Meal: Rs ${(parseFloat(p.base_price) + parseFloat(p.meal_upcharge_price)).toFixed(2)}</div>` : ''}
                        </div>
                        <button class="menu-card-add" onclick="event.stopPropagation(); addToCart('${p.id}')">+</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.menu-card').forEach(card => {
        card.addEventListener('click', () => addToCart(card.dataset.id));
    });
}

// ============================================
// CART OPERATIONS
// ============================================
function addToCart(id) {
    const p = products.find(x => x.id === id);
    if (!p || !p.is_available) return;
    
    const existing = cart.find(x => x.product.id === id);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ product: p, quantity: 1, isMeal: true });
    }
    updateCart();
    showToast(`${p.name} added`);
}

function toggleMeal(i) {
    cart[i].isMeal = !cart[i].isMeal;
    updateCart();
}

function updateQty(i, d) {
    cart[i].quantity += d;
    if (cart[i].quantity <= 0) cart.splice(i, 1);
    updateCart();
}

function updateCart() {
    const count = cart.reduce((s, x) => s + x.quantity, 0);
    $('cartCount').textContent = count;
    $('cartCount').classList.toggle('visible', count > 0);
    
    if (!cart.length) {
        $('cartItems').innerHTML = '<div class="cart-empty"><p>Your cart is empty</p></div>';
        $('cartSummary').style.display = 'none';
        $('cartCheckout').style.display = 'none';
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
                    <div class="cart-item-price">Rs ${(price * item.quantity).toFixed(2)}</div>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="updateQty(${i},-1)">−</button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQty(${i},1)">+</button>
                </div>
            </div>
        `;
    }).join('');
    
    const sub = cart.reduce((s, x) => {
        const p = x.isMeal ? parseFloat(x.product.base_price) + parseFloat(x.product.meal_upcharge_price || 0) : parseFloat(x.product.base_price);
        return s + p * x.quantity;
    }, 0);
    
    $('subtotal').textContent = `Rs ${sub.toFixed(2)}`;
    $('tax').textContent = `Rs ${(sub * 0.15).toFixed(2)}`;
    $('total').textContent = `Rs ${(sub * 1.15).toFixed(2)}`;
    
    $('cartSummary').style.display = 'block';
    $('cartCheckout').style.display = 'block';
    
    $('checkoutBtn').disabled = !$('customerName').value.trim() || !$('customerPhone').value.trim();
}

// ============================================
// CHECKOUT
// ============================================
async function checkout() {
    const name = $('customerName').value.trim();
    const phone = $('customerPhone').value.replace(/\s/g, '');
    
    if (!name || !phone) {
        showToast('Name and phone required', 'error');
        return;
    }
    
    $('checkoutBtn').disabled = true;
    $('checkoutBtn').textContent = 'Processing...';
    
    try {
        const data = await fetch(`${API}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tenant_id: selectedTenant.id,
                source: 'online',
                items: cart.map(x => ({
                    productId: x.product.id,
                    isMeal: x.isMeal,
                    quantity: x.quantity,
                    specialNotes: ''
                })),
                customer: { name, phone: `+230${phone}` },
                paymentMethod: 'cash'
            })
        }).then(r => r.json());
        
        if (data.success) {
            $('successInvoice').textContent = `Invoice: ${data.order.invoice_number}`;
            $('successModal').classList.add('visible');
            closeCart();
            cart = [];
            updateCart();
            $('customerName').value = '';
            $('customerPhone').value = '';
        } else {
            throw new Error(data.error);
        }
    } catch (e) {
        showToast(e.message || 'Failed to place order', 'error');
    }
    
    $('checkoutBtn').disabled = false;
    $('checkoutBtn').textContent = 'Place Order';
}

// ============================================
// CART DRAWER
// ============================================
function openCart() {
    $('cartDrawer').classList.add('open');
    $('cartOverlay').classList.add('open');
}

function closeCart() {
    $('cartDrawer').classList.remove('open');
    $('cartOverlay').classList.remove('open');
}

// ============================================
// PHONE FORMATTING
// ============================================
function formatPhone(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 4) v = v.slice(0, 4) + ' ' + v.slice(4);
    input.value = v;
}

// ============================================
// TOAST
// ============================================
function showToast(msg, type = 'success') {
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
    // Start binary rain animation
    initBinaryRain();
    
    // Load restaurants
    loadRestaurants();
    
    // Back button
    $('backBtn').addEventListener('click', () => {
        $('menuPage').style.display = 'none';
        $('landingPage').style.display = 'block';
        selectedTenant = null;
        cart = [];
        updateCart();
        initBinaryRain();
    });
    
    // Cart
    $('cartBtn').addEventListener('click', openCart);
    $('cartClose').addEventListener('click', closeCart);
    $('cartOverlay').addEventListener('click', closeCart);
    $('checkoutBtn').addEventListener('click', checkout);
    
    // Success
    $('successBtn').addEventListener('click', () => {
        $('successModal').classList.remove('visible');
    });
    
    // Phone formatting
    $('customerPhone').addEventListener('input', function() {
        formatPhone(this);
        $('checkoutBtn').disabled = !$('customerName').value.trim() || !this.value.trim();
    });
    
    $('customerName').addEventListener('input', () => {
        $('checkoutBtn').disabled = !$('customerName').value.trim() || !$('customerPhone').value.trim();
    });
});
