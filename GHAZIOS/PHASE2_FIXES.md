# GHAZIOS Multi-Tenant POS System - Phase 2 Fixes

## Status: IN PROGRESS

### Issues to Address in Phase 2:

#### 1. Role-Based Access Control (Issue #14, #15)
- **Problem**: Admin panel accepts any role; cashiers/kitchen can access revenue reports
- **Fix Required**: Enforce `req.user.role` checks on all admin endpoints
- **Files**: `backend/server.js`, `admin/admin-app.js`

#### 2. Token Leakage Prevention (Issue #17)
- **Problem**: Impersonation tokens passed via URL query params
- **Fix Required**: Use POST requests with token in response body instead of URL
- **Files**: `superadmin/superadmin-app.js`, `pos/pos-app.js`, `kitchen/kitchen-app.js`

#### 3. Input Validation Middleware (Issue #19)
- **Problem**: Online orders accept unavailable items; limited rate limiting
- **Fix Required**: Add comprehensive validation middleware for all inputs
- **Files**: `backend/server.js`

#### 4. Product Archive Flow (Issue #11)
- **Problem**: Hard delete fails for sold products (FK constraint)
- **Fix Required**: Implement soft-delete/archive with `is_available` flag
- **Files**: `backend/server.js`, `admin/admin-app.js`

#### 5. Cancel/Void Order Flow (Missing)
- **Problem**: No mechanism to cancel orders without hard deletion
- **Fix Required**: Add cancel endpoint with reason tracking
- **Files**: `backend/server.js`, `pos/pos-app.js`

#### 6. Tenant Self-Service Menu Management (Missing)
- **Problem**: Owners cannot edit menus without superadmin
- **Fix Required**: Add tenant-level CRUD endpoints for products/prices
- **Files**: `backend/server.js`, `admin/admin-app.js`

#### 7. Staff Management by Tenant Admins (Missing)
- **Problem**: Only superadmin can create staff accounts
- **Fix Required**: Allow tenant admins to manage their own staff
- **Files**: `backend/server.js`, `admin/admin-app.js`

#### 8. Accurate Revenue Reports (Partially Fixed)
- **Problem**: Need CSV export and more detailed breakdowns
- **Fix Required**: Add export functionality and filtering
- **Files**: `backend/server.js`, `admin/admin-app.js`

#### 9. Configurable Settings (Missing)
- **Problem**: Tax rates, timezone hardcoded
- **Fix Required**: Add tenant settings table and management UI
- **Files**: `database/schema.sql`, `backend/server.js`, `admin/admin-app.js`

### Priority Order:
1. Role-based access control (CRITICAL - Security)
2. Token leakage prevention (CRITICAL - Security)
3. Input validation (HIGH - Security/Stability)
4. Cancel/void flow (HIGH - Operations)
5. Product archive (MEDIUM - Data Integrity)
6. Tenant self-service menu (MEDIUM - Usability)
7. Staff management (MEDIUM - Usability)
8. Revenue reports CSV (LOW - Enhancement)
9. Configurable settings (LOW - Enhancement)


## Phase 2 - CRITICAL SECURITY FIXES COMPLETED

### 1. Role-Based Access Control (Issue #14, #15) ✅ FIXED

**Added middleware to `backend/server.js`:**
- `requireRole(...allowedRoles)` - Flexible role checking middleware
- `requireAdminOrSuperadmin` - For revenue/settings access
- `requireCashierOrAdmin` - For POS operations  
- `requireKitchenOrAdmin` - For kitchen operations

**Endpoints Protected:**
- `/api/dashboard/stats` - Now requires admin+ (was: any authenticated user)
- `/api/inventory` GET - Now requires admin/kitchen+ (was: any authenticated user)
- `/api/inventory/:id/restock` PUT - Now requires admin+ (was: any authenticated user)
- `/api/orders/:id/confirm` PUT - Now requires kitchen/admin+ (was: any authenticated user)
- `/api/orders/:id/ready` PUT - Now requires kitchen/admin+ (was: any authenticated user)
- `/api/orders/:id/collect` PUT - Now requires cashier/admin+ (was: any authenticated user)
- `/api/customizations` GET - Now requires admin+ (was: any authenticated user)

**Impact:** Cashiers can no longer access revenue reports; Kitchen staff cannot modify inventory; Roles are properly enforced per operation type.

### Next Steps Required:

#### Token Leakage Prevention (Issue #17)
- Change superadmin impersonation from URL params to POST request
- Store tokens in httpOnly cookies or secure localStorage pattern
- Update pos-app.js, kitchen-app.js, admin-app.js to receive tokens via response body

#### Product Archive Flow (Issue #11)
- Add `is_archived` column to products table
- Modify delete endpoint to soft-delete instead of hard delete
- Add archive management UI to admin panel

#### Cancel/Void Order Flow
- Add `/api/orders/:id/cancel` endpoint with reason tracking
- Add cancel button to POS for pending orders
- Update order status enum to include 'cancelled'

#### Tenant Self-Service
- Add tenant-level product CRUD endpoints (non-superadmin)
- Create menu editor UI in admin panel
- Allow tenants to manage their own settings

