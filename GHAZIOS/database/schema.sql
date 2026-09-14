-- ============================================
-- GHAZIOS MULTI-TENANT DATABASE SCHEMA
-- Version 1.0 - Production Ready
-- ============================================

-- Drop existing tables (CAREFUL: This deletes all data!)
DROP TABLE IF EXISTS order_customizations CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS product_inventory_map CASCADE;
DROP TABLE IF EXISTS product_customizations CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Drop types
DROP TYPE IF EXISTS order_status_enum CASCADE;
DROP TYPE IF EXISTS order_source_enum CASCADE;
DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS transaction_type_enum CASCADE;
DROP TYPE IF EXISTS subscription_plan_enum CASCADE;

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE order_status_enum AS ENUM (
    'pending', 'confirmed', 'ready', 'collected', 'cancelled', 'editing'
);

CREATE TYPE order_source_enum AS ENUM (
    'walkin', 'reservation', 'online'
);

CREATE TYPE user_role_enum AS ENUM (
    'cashier', 'kitchen', 'admin', 'superadmin'
);

CREATE TYPE transaction_type_enum AS ENUM (
    'restock', 'adjustment', 'waste'
);

CREATE TYPE subscription_plan_enum AS ENUM (
    'basic', 'premium', 'enterprise'
);

-- ============================================
-- TABLE 1: TENANTS (Businesses/Restaurants)
-- ============================================
-- Each tenant is a separate business using the platform

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Business identification
    slug VARCHAR(50) UNIQUE NOT NULL,           -- URL-friendly name
    name VARCHAR(100) NOT NULL,                 -- Display name
    
    -- Branding
    logo_url TEXT,                              -- Logo image URL
    primary_color VARCHAR(7) DEFAULT '#D32F2F', -- Brand color
    secondary_color VARCHAR(7) DEFAULT '#1565C0',
    
    -- Contact
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    
    -- Subscription
    subscription_plan subscription_plan_enum DEFAULT 'basic',
    subscription_expires_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE 2: USERS (Staff accounts)
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant relationship
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Credentials
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile
    full_name VARCHAR(100) NOT NULL,
    role user_role_enum NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMPTZ,
    
    -- Unique username per tenant
    UNIQUE(tenant_id, username)
);

-- ============================================
-- TABLE 3: CUSTOMERS
-- ============================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant relationship
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Customer info
    name VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_order_at TIMESTAMPTZ,
    
    -- Unique phone per tenant
    UNIQUE(tenant_id, phone)
);

-- ============================================
-- TABLE 4: PRODUCTS (Menu items)
-- ============================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant relationship
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Product info
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    
    -- Pricing
    base_price NUMERIC(10, 2) NOT NULL,
    meal_upcharge_price NUMERIC(10, 2) DEFAULT 3.50,
    
    -- Display
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    
    -- Status
    is_available BOOLEAN DEFAULT TRUE,
    is_customizable BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique SKU per tenant
    UNIQUE(tenant_id, sku)
);

-- ============================================
-- TABLE 5: PRODUCT CUSTOMIZATIONS
-- ============================================

CREATE TABLE product_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant relationship
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Customization info
    name VARCHAR(50) NOT NULL,
    category VARCHAR(30) NOT NULL,
    price_adjustment NUMERIC(10, 2) DEFAULT 0.00,
    is_available BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE 6: INVENTORY
-- ============================================

CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant relationship
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Item info
    item_name VARCHAR(100) NOT NULL,
    current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    reorder_level NUMERIC(10, 2) NOT NULL DEFAULT 10,
    max_capacity NUMERIC(10, 2) NOT NULL DEFAULT 100,
    cost_per_unit NUMERIC(10, 2),
    
    -- Timestamps
    last_restocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique item per tenant
    UNIQUE(tenant_id, item_name)
);

-- ============================================
-- TABLE 7: PRODUCT INVENTORY MAP
-- ============================================

CREATE TABLE product_inventory_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    customization_id UUID REFERENCES product_customizations(id) ON DELETE SET NULL,
    
    -- Usage
    quantity_used NUMERIC(10, 2) NOT NULL DEFAULT 1,
    is_base_ingredient BOOLEAN DEFAULT TRUE,
    
    UNIQUE(product_id, inventory_id, customization_id)
);

-- ============================================
-- TABLE 8: ORDERS
-- ============================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant relationship
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Order info
    invoice_number VARCHAR(100) NOT NULL,
    source order_source_enum NOT NULL DEFAULT 'walkin',
    status order_status_enum DEFAULT 'pending',
    
    -- Customer
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Financial
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    
    -- Payment
    payment_method VARCHAR(50) DEFAULT 'cash',
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    amount_paid NUMERIC(10, 2) DEFAULT 0,
    change_given NUMERIC(10, 2) DEFAULT 0,
    
    -- Edit tracking
    edited_from UUID REFERENCES orders(id) ON DELETE SET NULL,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES users(id),
    ready_at TIMESTAMPTZ,
    collected_at TIMESTAMPTZ,
    collected_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    cancel_reason TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique invoice per tenant
    UNIQUE(tenant_id, invoice_number)
);

-- ============================================
-- TABLE 9: ORDER ITEMS
-- ============================================

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Item details
    is_meal BOOLEAN DEFAULT TRUE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    
    -- Pricing
    unit_price NUMERIC(10, 2) NOT NULL,
    meal_addon_price NUMERIC(10, 2) DEFAULT 0,
    customization_total NUMERIC(10, 2) DEFAULT 0,
    line_total NUMERIC(10, 2) NOT NULL,
    
    -- Notes
    special_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE 10: ORDER CUSTOMIZATIONS
-- ============================================

CREATE TABLE order_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    customization_id UUID NOT NULL REFERENCES product_customizations(id),
    
    quantity INTEGER DEFAULT 1,
    price_adjustment NUMERIC(10, 2) DEFAULT 0.00,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE 11: RECEIPTS
-- ============================================

CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant relationship
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Receipt info
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) NOT NULL,
    receipt_type VARCHAR(20) NOT NULL,
    
    -- Delivery
    whatsapp_sent BOOLEAN DEFAULT FALSE,
    whatsapp_sent_at TIMESTAMPTZ,
    pdf_generated BOOLEAN DEFAULT FALSE,
    pdf_path TEXT,
    
    -- Status
    is_cancelled BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique receipt per tenant
    UNIQUE(tenant_id, receipt_number)
);

-- ============================================
-- TABLE 12: INVENTORY TRANSACTIONS
-- ============================================

CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    performed_by UUID REFERENCES users(id),
    
    -- Transaction
    transaction_type transaction_type_enum NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    previous_stock NUMERIC(10, 2) NOT NULL,
    new_stock NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

-- Tenant indexes (critical for multi-tenancy)
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_inventory_tenant ON inventory(tenant_id);
CREATE INDEX idx_receipts_tenant ON receipts(tenant_id);

-- Performance indexes
CREATE INDEX idx_products_tenant_category ON products(tenant_id, category);
CREATE INDEX idx_products_tenant_available ON products(tenant_id, is_available);
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at);
CREATE INDEX idx_inventory_tenant_stock ON inventory(tenant_id, current_stock);
CREATE INDEX idx_customers_tenant_phone ON customers(tenant_id, phone);
CREATE INDEX idx_users_tenant_username ON users(tenant_id, username);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Invoice number generator - FIXED: Use proper sequences to prevent collisions (Issue #2)
-- Walk-in orders: 3-digit sequence starting at 100 (SEP100, SEP101, ... SEP999)
-- Online orders: 5-digit sequence starting at 10000 (SEP10000, SEP10001, ...)
-- These ranges will never overlap

CREATE SEQUENCE IF NOT EXISTS walkin_invoice_seq START WITH 100;
CREATE SEQUENCE IF NOT EXISTS online_invoice_seq START WITH 10000;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    month_prefix VARCHAR(3);
    sequence_num INTEGER;
BEGIN
    month_prefix := UPPER(TO_CHAR(CURRENT_DATE, 'Mon'));
    
    IF NEW.source = 'walkin' THEN
        -- Get next walk-in sequence number
        sequence_num := nextval('walkin_invoice_seq');
        -- Reset if we exceed 999 (prevent overflow)
        IF sequence_num > 999 THEN
            EXECUTE 'ALTER SEQUENCE walkin_invoice_seq RESTART WITH 100';
            sequence_num := 100;
        END IF;
        NEW.invoice_number := month_prefix || LPAD(sequence_num::TEXT, 3, '0');
    ELSE
        -- Get next online sequence number
        sequence_num := nextval('online_invoice_seq');
        -- Reset if we exceed 99999 (prevent overflow)
        IF sequence_num > 99999 THEN
            EXECUTE 'ALTER SEQUENCE online_invoice_seq RESTART WITH 10000';
            sequence_num := 10000;
        END IF;
        NEW.invoice_number := month_prefix || LPAD(sequence_num::TEXT, 5, '0');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Receipt number generator
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
    month_prefix VARCHAR(3);
    sequence_num INTEGER;
BEGIN
    month_prefix := UPPER(TO_CHAR(CURRENT_DATE, 'Mon'));
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 4) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM receipts
    WHERE tenant_id = NEW.tenant_id
    AND receipt_number LIKE month_prefix || '%';
    
    IF sequence_num < 100 THEN
        sequence_num := 100;
    END IF;
    
    NEW.receipt_number := month_prefix || LPAD(sequence_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_receipt_number
    BEFORE INSERT ON receipts
    FOR EACH ROW
    WHEN (NEW.receipt_number IS NULL OR NEW.receipt_number = '')
    EXECUTE FUNCTION generate_receipt_number();

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Create Quickeez tenant
INSERT INTO tenants (slug, name, primary_color, secondary_color, phone, email, address)
VALUES ('quickeez', 'Quickeez Fried Chicken', '#D32F2F', '#1565C0', '+23051234567', 'info@quickeez.mu', 'Curepipe, Mauritius');

-- Create admin user (password: admin123)
INSERT INTO users (tenant_id, username, password_hash, full_name, role)
SELECT id, 'admin', '$2b$10$vskDtXc9fKXaGgzGSRZomeq5u.QjECCRfNWyH2pkkhW/9Be1xQ57y', 'Super Admin', 'superadmin'
FROM tenants WHERE slug = 'quickeez';

-- Create sample products
INSERT INTO products (tenant_id, sku, name, description, category, base_price, meal_upcharge_price, is_customizable, sort_order)
SELECT id, 'BC-01', 'Classic Chicken Burger', 'Crispy chicken fillet with lettuce, tomato, and sauce', 'Burgers', 8.50, 3.50, TRUE, 1 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'BC-02', 'Spicy Zinger Burger', 'Spicy chicken with jalapeños and chipotle', 'Burgers', 9.50, 3.50, TRUE, 2 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'BC-03', 'BBQ Bacon Burger', 'Chicken with bacon, cheese, and BBQ sauce', 'Burgers', 10.50, 3.50, TRUE, 3 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'BC-04', 'Double Stack Burger', 'Two chicken patties with double cheese', 'Burgers', 12.00, 3.50, TRUE, 4 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'SD-01', 'Seasoned Fries', 'Golden crispy fries', 'Sides', 3.50, 2.00, FALSE, 1 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'SD-02', 'Coleslaw', 'Creamy homemade coleslaw', 'Sides', 2.50, 2.00, FALSE, 2 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'SD-03', 'Onion Rings', 'Battered onion rings', 'Sides', 4.00, 2.00, FALSE, 3 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'DRK-01', 'Fresh Lemonade', 'Homemade lemonade', 'Drinks', 2.50, 0.00, FALSE, 1 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'DRK-02', 'Cola 500ml', 'Ice-cold cola', 'Drinks', 2.00, 0.00, FALSE, 2 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'WR-01', 'Classic Chicken Wrap', 'Chicken with veggies in tortilla', 'Wraps', 7.50, 3.50, TRUE, 1 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'PN-01', 'Chicken Pesto Panini', 'Chicken with pesto and mozzarella', 'Panini', 9.00, 3.50, TRUE, 1 FROM tenants WHERE slug = 'quickeez';

-- Create customizations
INSERT INTO product_customizations (tenant_id, name, category, price_adjustment)
SELECT id, 'Extra Cheese', 'cheese', 1.00 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'No Cheese', 'cheese', 0.00 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'Extra Chili', 'spice', 0.50 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'No Chili', 'spice', 0.00 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'Extra Lettuce', 'topping', 0.50 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'No Lettuce', 'topping', 0.00 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'Extra Mayo', 'sauce', 0.50 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'BBQ Sauce', 'sauce', 0.50 FROM tenants WHERE slug = 'quickeez';

-- Create inventory
INSERT INTO inventory (tenant_id, item_name, current_stock, unit, reorder_level, max_capacity, cost_per_unit)
SELECT id, 'Chicken Fillet', 200, 'pieces', 50, 500, 2.50 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'Burger Buns', 150, 'pieces', 40, 400, 0.50 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'Wrap Tortilla', 100, 'pieces', 30, 300, 0.75 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'Panini Bread', 80, 'pieces', 20, 200, 1.00 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'Lettuce', 50, 'kg', 10, 100, 3.00 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'Tomato', 40, 'kg', 10, 80, 2.50 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'Cheese Slices', 200, 'pieces', 50, 500, 0.30 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'Chili Sauce', 20, 'liters', 5, 50, 4.00 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'Mayonnaise', 15, 'liters', 5, 40, 5.00 FROM tenants WHERE slug = 'quickeez'
UNION ALL
SELECT id, 'French Fries', 100, 'kg', 25, 250, 2.00 FROM tenants WHERE slug = 'quickeez';

-- ============================================
-- VIEWS
-- ============================================

CREATE VIEW inventory_status AS
SELECT 
    i.*,
    CASE 
        WHEN i.current_stock <= 0 THEN 'OUT_OF_STOCK'
        WHEN i.current_stock <= i.reorder_level THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
    END AS stock_status,
    t.name as tenant_name
FROM inventory i
JOIN tenants t ON i.tenant_id = t.id;

CREATE VIEW order_summary AS
SELECT 
    o.*,
    t.name as tenant_name,
    c.name as customer_name,
    c.phone as customer_phone,
    u.full_name as created_by_name
FROM orders o
JOIN tenants t ON o.tenant_id = t.id
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN users u ON o.created_by = u.id;

-- Done!
SELECT 'GHAZIOS multi-tenant schema created successfully!' as status;
