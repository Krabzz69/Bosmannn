-- ============================================
-- GHAZIOS - SEED DATA
-- Run this to add initial data
-- ============================================

-- Create Quickeez tenant
INSERT INTO tenants (slug, name, primary_color, secondary_color, phone, email, address, subscription_plan)
VALUES ('quickeez', 'Quickeez Fried Chicken', '#D32F2F', '#1565C0', '+23051234567', 'info@quickeez.mu', 'Curepipe, Mauritius', 'premium');

-- Get the tenant ID
DO $$
DECLARE
    tenant_id UUID;
BEGIN
    SELECT id INTO tenant_id FROM tenants WHERE slug = 'quickeez';
    
    -- FIXED: Create admin user with role 'admin' NOT 'superadmin' (Security Issue #1)
    INSERT INTO users (tenant_id, username, password_hash, full_name, role)
    VALUES (tenant_id, 'admin', '$2b$10$vskDtXc9fKXaGgzGSRZomeq5u.QjECCRfNWyH2pkkhW/9Be1xQ57y', 'Restaurant Admin', 'admin');
    
    -- Create cashier user (password: cashier123)
    INSERT INTO users (tenant_id, username, password_hash, full_name, role)
    VALUES (tenant_id, 'cashier', '$2b$10$vskDtXc9fKXaGgzGSRZomeq5u.QjECCRfNWyH2pkkhW/9Be1xQ57y', 'Cashier One', 'cashier');
    
    -- Create kitchen staff
    INSERT INTO users (tenant_id, username, password_hash, full_name, role)
    VALUES (tenant_id, 'kitchen', '$2b$10$vskDtXc9fKXaGgzGSRZomeq5u.QjECCRfNWyH2pkkhW/9Be1xQ57y', 'Kitchen Staff', 'kitchen');
    
    -- Create products
    INSERT INTO products (tenant_id, sku, name, description, category, base_price, meal_upcharge_price, is_customizable, sort_order) VALUES
    (tenant_id, 'BC-01', 'Classic Chicken Burger', 'Crispy chicken fillet with lettuce, tomato, and sauce', 'Burgers', 8.50, 3.50, TRUE, 1),
    (tenant_id, 'BC-02', 'Spicy Zinger Burger', 'Spicy chicken with jalapeños and chipotle', 'Burgers', 9.50, 3.50, TRUE, 2),
    (tenant_id, 'BC-03', 'BBQ Bacon Burger', 'Chicken with bacon, cheese, and BBQ sauce', 'Burgers', 10.50, 3.50, TRUE, 3),
    (tenant_id, 'BC-04', 'Double Stack Burger', 'Two chicken patties with double cheese', 'Burgers', 12.00, 3.50, TRUE, 4),
    (tenant_id, 'SD-01', 'Seasoned Fries', 'Golden crispy fries with herbs', 'Sides', 3.50, 2.00, FALSE, 1),
    (tenant_id, 'SD-02', 'Coleslaw', 'Creamy homemade coleslaw', 'Sides', 2.50, 2.00, FALSE, 2),
    (tenant_id, 'SD-03', 'Onion Rings', 'Battered onion rings', 'Sides', 4.00, 2.00, FALSE, 3),
    (tenant_id, 'SD-04', 'Loaded Wedges', 'Potato wedges with toppings', 'Sides', 5.00, 2.00, FALSE, 4),
    (tenant_id, 'PS-01', '6pc Chicken Bucket', 'Six pieces fried chicken', 'Pieces and Strips', 15.00, 4.00, FALSE, 1),
    (tenant_id, 'PS-02', 'Chicken Strips 6pc', 'Six chicken strips', 'Pieces and Strips', 8.00, 3.50, FALSE, 2),
    (tenant_id, 'PS-03', '12pc Chicken Bucket', 'Twelve pieces fried chicken', 'Pieces and Strips', 25.00, 6.00, FALSE, 3),
    (tenant_id, 'PS-04', 'Hot Wings 8pc', 'Spicy chicken wings', 'Pieces and Strips', 9.00, 3.50, FALSE, 4),
    (tenant_id, 'DRK-01', 'Fresh Lemonade', 'Homemade lemonade', 'Drinks', 2.50, 0.00, FALSE, 1),
    (tenant_id, 'DRK-02', 'Iced Tea', 'Classic iced tea', 'Drinks', 2.00, 0.00, FALSE, 2),
    (tenant_id, 'DRK-03', 'Cola 500ml', 'Ice-cold cola', 'Drinks', 2.00, 0.00, FALSE, 3),
    (tenant_id, 'DRK-04', 'Mango Smoothie', 'Tropical mango smoothie', 'Drinks', 4.00, 0.00, FALSE, 4),
    (tenant_id, 'WR-01', 'Classic Chicken Wrap', 'Chicken with veggies in tortilla', 'Wraps', 7.50, 3.50, TRUE, 1),
    (tenant_id, 'WR-02', 'Spicy Shawarma Wrap', 'Spiced chicken with garlic sauce', 'Wraps', 8.50, 3.50, TRUE, 2),
    (tenant_id, 'WR-03', 'Caesar Wrap', 'Chicken Caesar in tortilla', 'Wraps', 8.00, 3.50, TRUE, 3),
    (tenant_id, 'PN-01', 'Chicken Pesto Panini', 'Chicken with pesto and mozzarella', 'Panini', 9.00, 3.50, TRUE, 1),
    (tenant_id, 'PN-02', 'BBQ Chicken Panini', 'BBQ chicken with onions', 'Panini', 9.50, 3.50, TRUE, 2),
    (tenant_id, 'PN-03', 'Club Panini', 'Chicken, bacon, egg, cheese', 'Panini', 10.50, 3.50, TRUE, 3),
    (tenant_id, 'PN-04', 'Mediterranean Panini', 'Chicken with feta and olives', 'Panini', 9.50, 3.50, TRUE, 4);
    
    -- Create customizations
    INSERT INTO product_customizations (tenant_id, name, category, price_adjustment) VALUES
    (tenant_id, 'Extra Cheese', 'cheese', 1.00),
    (tenant_id, 'No Cheese', 'cheese', 0.00),
    (tenant_id, 'Extra Chili', 'spice', 0.50),
    (tenant_id, 'No Chili', 'spice', 0.00),
    (tenant_id, 'Mild Chili', 'spice', 0.00),
    (tenant_id, 'Extra Lettuce', 'topping', 0.50),
    (tenant_id, 'No Lettuce', 'topping', 0.00),
    (tenant_id, 'Extra Mayo', 'sauce', 0.50),
    (tenant_id, 'No Mayo', 'sauce', 0.00),
    (tenant_id, 'BBQ Sauce', 'sauce', 0.50),
    (tenant_id, 'Garlic Sauce', 'sauce', 0.50);
    
    -- Create inventory
    INSERT INTO inventory (tenant_id, item_name, current_stock, unit, reorder_level, max_capacity, cost_per_unit) VALUES
    (tenant_id, 'Chicken Fillet', 200, 'pieces', 50, 500, 2.50),
    (tenant_id, 'Burger Buns', 150, 'pieces', 40, 400, 0.50),
    (tenant_id, 'Wrap Tortilla', 100, 'pieces', 30, 300, 0.75),
    (tenant_id, 'Panini Bread', 80, 'pieces', 20, 200, 1.00),
    (tenant_id, 'Lettuce', 50, 'kg', 10, 100, 3.00),
    (tenant_id, 'Tomato', 40, 'kg', 10, 80, 2.50),
    (tenant_id, 'Cheese Slices', 200, 'pieces', 50, 500, 0.30),
    (tenant_id, 'Chili Sauce', 20, 'liters', 5, 50, 4.00),
    (tenant_id, 'Mayonnaise', 15, 'liters', 5, 40, 5.00),
    (tenant_id, 'French Fries', 100, 'kg', 25, 250, 2.00);
    
END $$;

SELECT 'Seed data inserted successfully!' as status;
