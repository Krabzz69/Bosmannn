# GHAZIOS Multi-Tenant POS System - Complete Remaining Issues List

## Status: After Phase 2 (RBAC) Implementation
## Date: 2026-08-10

---

## 🚨 CRITICAL PRIORITY (Must Fix Before Production)

### 1. Token Leakage via URL Parameters [SECURITY-HIGH]
**Location:** `superadmin-app.js`, `pos-app.js`, `kitchen-app.js`
**Issue:** Impersonation tokens passed as `?token=xxx` in URLs, leaking to:
- Browser history
- Server access logs
- Referer headers
**Fix Required:** Move token passing to POST body or sessionStorage transfer

### 2. Cancel/Void Order Flow Missing [OPERATIONAL-CRITICAL]
**Location:** `backend/server.js`, `pos-app.js`, `admin-app.js`
**Issue:** No mechanism to cancel or refund orders without hard deletion
- Hard delete fails on sold products (FK constraint)
- No audit trail for voided orders
- No reason tracking for cancellations
**Fix Required:** Implement soft-delete with status='cancelled', reason field, user tracking

### 3. Product Archive Flow Missing [DATA-INTEGRITY]
**Location:** `schema.sql`, `server.js`, `admin-app.js`
**Issue:** Cannot "retire" products that have been sold (FK constraints block deletion)
**Fix Required:** Add `is_archived` boolean column, modify admin UI to archive instead of delete

### 4. Input Validation Incomplete [SECURITY-MEDIUM]
**Location:** `server.js` order endpoints
**Issue:** 
- No max length validation on customer names, notes, special requests
- Online orders accept unavailable/out-of-stock items
- No rate limiting specific to order submission
**Fix Required:** Add comprehensive validation middleware

### 5. Timezone Configuration [ACCOUNTING-HIGH]
**Location:** `server.js` dashboard endpoints
**Issue:** Server runs UTC, Mauritius is UTC+4
- "Today's revenue" charts shifted by 4 hours
- Peak hour analytics incorrect
**Fix Required:** Configure timezone to 'Indian/Mauritius' for all date operations

---

## 🔴 HIGH PRIORITY (Fix Within 1 Week)

### 6. Admin Panel Role Enforcement [SECURITY-HIGH]
**Location:** `admin-app.js`
**Issue:** Admin panel login accepts any role (cashier, kitchen staff)
- Cashiers can access revenue reports
- Kitchen staff can modify inventory settings
**Fix Required:** Add role checks in admin-app.js initialization

### 7. XSS Vulnerabilities [SECURITY-CRITICAL]
**Location:** All frontend JS files (`pos-app.js`, `kitchen-app.js`, `admin-app.js`, `superadmin-app.js`)
**Issue:** API data rendered via `innerHTML` without sanitization
- Customer names, product names, notes injected raw
- `<img onerror="...">` attacks possible
**Status:** Partially addressed in SECURITY_AUDIT.md fixes - needs verification

### 8. Socket.IO Room Authentication [SECURITY-CRITICAL]
**Location:** `server.js` Socket.IO handlers
**Issue:** Any client can join any room by emitting `join-room` with arbitrary string
- Complete multi-tenant isolation bypass
- Restaurant A can spy on Restaurant B's orders
**Status:** Claimed fixed in SECURITY_AUDIT.md - needs verification

### 9. Database Port Exposure [INFRASTRUCTURE-CRITICAL]
**Location:** `docker-compose.yml`
**Issue:** Port 5433:5432 mapping exposes PostgreSQL to public internet
**Status:** Claimed removed in SECURITY_AUDIT.md - needs verification

### 10. Backend Direct Access [INFRASTRUCTURE-HIGH]
**Location:** `docker-compose.yml`
**Issue:** Port 4001 exposed to host, bypassing nginx security
**Status:** Claimed removed in SECURITY_AUDIT.md - needs verification

---

## 🟡 MEDIUM PRIORITY (Fix Within 1 Month)

### 11. Login Rate Limiting [SECURITY-MEDIUM]
**Location:** `server.js` `/api/auth/login`
**Issue:** No specific rate limit on login endpoint
- Brute force possible at global limit (200 req/15min)
**Status:** Claimed added in SECURITY_AUDIT.md - needs verification

### 12. CORS Configuration [SECURITY-MEDIUM]
**Location:** `server.js`
**Issue:** `cors({ origin: '*' })` allows any website to use stolen JWT
**Status:** Claimed fixed in SECURITY_AUDIT.md - needs verification

### 13. Docker Security Hardening [INFRASTRUCTURE-MEDIUM]
**Location:** `backend/Dockerfile`, `docker-compose.yml`
**Issues:**
- Container runs as root (claimed fixed)
- No health checks (claimed added)
- No resource limits (claimed added)
**Action:** Verify all claims in SECURITY_AUDIT.md

### 14. UUID Validation [SECURITY-LOW]
**Location:** `server.js` route handlers
**Issue:** Invalid UUIDs cause unhandled PostgreSQL errors (22P02)
**Status:** Claimed fixed - needs verification

### 15. Error Logging Sanitization [SECURITY-LOW]
**Location:** `server.js` error handlers
**Issue:** Full error objects logged, potentially leaking sensitive info
**Status:** Claimed fixed - needs verification

### 16. Rate Limit Scope [SECURITY-LOW]
**Location:** `server.js` rate limiter config
**Issue:** Only `/api/` prefix rate limited, health endpoints open
**Fix Required:** Apply rate limiting to all routes

---

## 🟢 LOW PRIORITY (Enhancement Backlog)

### 17. Fake/Useless Features Cleanup
Per original audit, remove:
- Binary rain animation (`website/index.html`, `website/js/`)
- Public restaurant dropdown on staff login (`login.html`)
- Dead nginx configs (`nginx/*.conf` - redundant)
- "GHAZIOS" branding on tenant receipts (`pos-app.js`)
- Fake "WhatsApp Receipt" promises (`website/index.html`)

### 18. Missing Essential Features (Roadmap Items)
- Tenant self-service menu editing
- Thermal printing (ESC/POS integration)
- Offline mode (PWA with local queue)
- Branded ordering pages (subdomain per tenant)
- Order tracking notifications (SMS/WhatsApp)
- Payment gateway integration (MIPS/Juice)
- Audit logging system
- Backup/migration strategy
- Test coverage (unit/integration tests)

### 19. Inventory Tracking
**Location:** `server.js`, `schema.sql`
**Issue:** `product_inventory_map` never decremented on sale
**Fix Required:** Decrement inventory on order completion

### 20. Subscription Plans Logic
**Location:** `superadmin-app.js`, `server.js`
**Issue:** Basic/Premium tiers have no feature gating or billing
**Fix Required:** Implement feature flags per tier

### 21. Customizations UI
**Location:** Frontend apps
**Issue:** DB table and API exist but no UI to use them
**Fix Required:** Build customization interface or remove feature

### 22. Announcements System
**Location:** Socket.IO handlers
**Issue:** Endpoint exists but no frontend listens for events
**Fix Required:** Implement or remove feature

### 23. Last Login Update Verification
**Location:** `server.js` auth handler
**Issue:** Column exists but may not be updating
**Action:** Verify fix from Phase 0 is working

### 24. Nginx Container Consolidation
**Location:** `docker-compose.yml`, `nginx/*.conf`
**Issue:** 5 separate nginx containers for static files
**Fix Required:** Consolidate to single reverse proxy

---

## ✅ VERIFICATION REQUIRED

The following issues were marked as "fixed" in SECURITY_AUDIT.md but require code verification:

1. ✅ XSS sanitization via `escapeHtml()` in all frontend files
2. ✅ Socket.IO room authentication implemented
3. ✅ Database port exposure removed from docker-compose.yml
4. ✅ Backend port 4001 exposure removed
5. ✅ Non-root user in Dockerfile
6. ✅ Helmet security headers added
7. ✅ Login rate limiting implemented
8. ✅ CORS wildcard fixed
9. ✅ UUID validation added
10. ✅ Error logging sanitized
11. ✅ Health checks added to docker-compose.yml
12. ✅ Resource limits added to containers

**ACTION:** Run verification script to confirm all claimed fixes are present in code.

---

## 📋 IMMEDIATE ACTION CHECKLIST

### Before Next Deployment:
- [ ] Verify all SECURITY_AUDIT.md fixes in actual code
- [ ] Fix token leakage in superadmin impersonation
- [ ] Implement cancel/void order flow
- [ ] Add product archive functionality
- [ ] Configure Mauritius timezone
- [ ] Add role enforcement to admin-app.js
- [ ] Complete input validation on all order endpoints

### Before Production Launch:
- [ ] Remove all fake/useless features
- [ ] Implement inventory tracking
- [ ] Add comprehensive test suite
- [ ] Create backup/migration strategy
- [ ] Document all API endpoints
- [ ] Security penetration testing
- [ ] Load testing for concurrent users

---

## 📊 ISSUE COUNT SUMMARY

| Priority | Count | Status |
|----------|-------|--------|
| Critical | 5 | 0 fixed, 5 pending |
| High | 5 | 0 fixed, 5 pending (some claimed fixed, need verification) |
| Medium | 6 | 0 fixed, 6 pending (some claimed fixed, need verification) |
| Low | 8 | 0 fixed, 8 pending |
| **Total** | **24** | **Verification needed on 12 claims** |

---

## 🔍 NEXT STEPS

1. **Verification Sprint:** Audit codebase to confirm SECURITY_AUDIT.md claims
2. **Critical Fixes:** Address top 5 critical issues
3. **Security Hardening:** Complete remaining high-priority security items
4. **Feature Cleanup:** Remove fake/useless features
5. **Testing:** Implement basic test coverage
6. **Documentation:** Update all docs with current state

