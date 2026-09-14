-- ============================================
-- ADD SYSTEM SUPERADMIN
-- ============================================

-- First, make tenant_id nullable for system admins
ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL;

-- Create superadmin user
-- Note: Run this hash generation first:
-- docker exec ghazios-backend node -e "const bcrypt = require('bcrypt'); bcrypt.hash('superadmin123', 10).then(h => console.log('HASH:', h));"
-- Then replace the hash below

INSERT INTO users (tenant_id, username, password_hash, full_name, role, is_active)
VALUES (NULL, 'superadmin', 'PLACEHOLDER_HASH', 'System Administrator', 'superadmin', TRUE);

-- Create index for superadmin lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

SELECT 'Superadmin user created! Update password hash next.' as status;
