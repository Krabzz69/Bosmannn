-- ============================================
-- ADD GRILL & GO RESTAURANT
-- ============================================
-- Run this to add a second restaurant to GHAZIOS

-- Create GRILL & GO tenant
INSERT INTO tenants (slug, name, primary_color, secondary_color, phone, email, address, subscription_plan)
VALUES ('grillandgo', 'GRILL & GO', '#FF6B00', '#1A1A1A', '+23059876543', 'info@grillandgo.mu', 'Port Louis, Mauritius', 'premium');

-- Get the tenant ID
DO $$
DECLARE
    tenant_id UUID;
BEGIN
    SELECT id INTO tenant_id FROM tenants WHERE slug = 'grillandgo';
    
    -- ============================================
    -- USERS
    -- ============================================
    INSERT INTO users (tenant_id, username, password_hash, full_name, role) VALUES
    (tenant_id, 'admin', '$2b$10$vskDtXc9fKXaGgzGSRZomeq5u.QjECCRfNWyH2pkkhW/9Be1xQ57y', 'GRILL & GO Admin', 'superadmin'),
    (tenant_id, 'cashier', '$2b$10$vskDtXc9fKXaGgzGSRZomeq5u.QjECCRfNWyH2pkkhW/9Be1xQ57y', 'Cashier One', 'cashier');
    
    -- ============================================
    -- PRODUCTS (Grill-focused menu)
    -- ============================================
    INSERT INTO products (tenant_id, sku, name, description, category, base_price, meal_upcharge_price, is_customizable, sort_order) VALUES
    
    -- GRILLS
    (tenant_id, 'GR-01', 'Classic Beef Burger', 'Grilled beef patty with lettuce, tomato, and special sauce', 'Grills', 9.00, 4.00, TRUE, 1),
    (tenant_id, 'GR-02', 'Double Smash Burger', 'Two smashed beef patties with cheese and pickles', 'Grills', 12.00, 4.00, TRUE, 2),
    (tenant_id, 'GR-03', 'BBQ Ribs', 'Slow-cooked pork ribs with smoky BBQ glaze', 'Grills', 18.00, 5.00, FALSE, 3),
    (tenant_id, 'GR-04', 'Grilled Chicken Breast', 'Seasoned grilled chicken with herbs', 'Grills', 10.00, 4.00, TRUE, 4),
    (tenant_id, 'GR-05', 'Lamb Chops', 'Grilled lamb chops with rosemary', 'Grills', 22.00, 6.00, FALSE, 5),
    (tenant_id, 'GR-06', 'Mixed Grill Platter', 'Beef, chicken, and lamb with sides', 'Grills', 28.00, 7.00, FALSE, 6),
    
    -- SIDES
    (tenant_id, 'SD-01', 'Grilled Corn', 'Corn on the cob with butter and herbs', 'Sides', 3.50, 0.00, FALSE, 1),
    (tenant_id, 'SD-02', 'Coleslaw', 'Creamy homemade coleslaw', 'Sides', 2.50, 0.00, FALSE, 2),
    (tenant_id, 'SD-03', 'Garlic Bread', 'Toasted bread with garlic butter', 'Sides', 3.00, 0.00, FALSE, 3),
    (tenant_id, 'SD-04', 'Baked Potato', 'Loaded baked potato with toppings', 'Sides', 4.50, 0.00, TRUE, 4),
    
    -- DRINKS
    (tenant_id, 'DRK-01', 'Fresh Lemonade', 'Homemade lemonade', 'Drinks', 2.50, 0.00, FALSE, 1),
    (tenant_id, 'DRK-02', 'Iced Tea', 'Classic iced tea', 'Drinks', 2.00, 0.00, FALSE, 2),
    (tenant_id, 'DRK-03', 'Cola 500ml', 'Ice-cold cola', 'Drinks', 2.00, 0.00, FALSE, 3),
    (tenant_id, 'DRK-04', 'Craft Beer', 'Local craft beer', 'Drinks', 5.00, 0.00, FALSE, 4);
    
    -- ============================================
    -- CUSTOMIZATIONS
    -- ============================================
    INSERT INTO product_customizations (tenant_id, name, category, price_adjustment) VALUES
    (tenant_id, 'Extra Cheese', 'cheese', 1.00),
    (tenant_id, 'No Cheese', 'cheese', 0.00),
    (tenant_id, 'Extra Bacon', 'topping', 1.50),
    (tenant_id, 'No Bacon', 'topping', 0.00),
    (tenant_id, 'Extra Sauce', 'sauce', 0.50),
    (tenant_id, 'No Sauce', 'sauce', 0.00),
    (tenant_id, 'Medium Rare', 'cooking', 0.00),
    (tenant_id, 'Well Done', 'cooking', 0.00);
    
    -- ============================================
    -- INVENTORY (Grill-specific ingredients)
    -- ============================================
    INSERT INTO inventory (tenant_id, item_name, current_stock, unit, reorder_level, max_capacity, cost_per_unit) VALUES
    (tenant_id, 'Beef Patties', 150, 'pieces', 40, 400, 3.00),
    (tenant_id, 'Burger Buns', 120, 'pieces', 30, 300, 0.60),
    (tenant_id, 'Chicken Breast', 100, 'pieces', 25, 250, 2.80),
    (tenant_id, 'Lamb Chops', 50, 'pieces', 15, 100, 8.00),
    (tenant_id, 'Pork Ribs', 40, 'kg', 10, 100, 12.00),
    (tenant_id, 'Lettuce', 30, 'kg', 8, 60, 3.00),
    (tenant_id, 'Tomato', 25, 'kg', 8, 50, 2.50),
    (tenant_id, 'Cheese Slices', 150, 'pieces', 40, 400, 0.35),
    (tenant_id, 'Bacon', 50, 'kg', 15, 100, 8.00),
    (tenant_id, 'BBQ Sauce', 15, 'liters', 5, 40, 6.00),
    (tenant_id, 'Corn', 80, 'pieces', 20, 200, 0.50),
    (tenant_id, 'Potatoes', 60, 'kg', 15, 150, 1.50),
    (tenant_id, 'Craft Beer', 100, 'bottles', 30, 300, 2.50);
    
END $$;

SELECT 'GRILL & GO restaurant added successfully!' as status;
