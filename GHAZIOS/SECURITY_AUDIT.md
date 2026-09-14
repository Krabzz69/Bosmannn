# GHAZIOS Security Audit Report
## Date: 2026-08-10
## Severity: CRITICAL / HIGH / MEDIUM / LOW

---

## FINDINGS

### CRITICAL

1. **XSS via innerHTML — All Frontend Files**
   All 5 frontend JS files render API data directly into innerHTML without sanitization.
   Customer names, product names, restaurant names, and notes are injected raw.
   A malicious `<img onerror="..." src=x>` in any name field executes arbitrary JS.
   Files: pos-app.js, kitchen-app.js, admin-app.js, superadmin-app.js, website/app.js

2. **Socket.IO No Authentication — Room Hijacking**
   Any client can join ANY room by emitting `join-room` with any string.
   A POS client for Restaurant A can join `${restaurantB}-kitchen` and receive
   all of Restaurant B's live orders. Complete multi-tenant isolation bypass.

3. **Database Port Exposed to Host Network**
   docker-compose.yml maps port 5433:5432, exposing PostgreSQL to the public
   internet. Any attacker can attempt connections to the database directly.

4. **Hardcoded Server IP in Frontend**
   `io('http://161.97.115.195:4001')` in 4 frontend files exposes the VPS IP
   and allows direct backend access bypassing nginx.

### HIGH

5. **No Login Rate Limiting**
   `/api/auth/login` has no specific rate limit. An attacker can brute-force
   passwords at the global limit of 200 requests per 15 minutes.

6. **CORS Wildcard**
   `cors({ origin: '*' })` allows any website to make authenticated API calls
   using a stolen JWT token from the browser.

7. **Backend Directly Accessible on Port 4001**
   docker-compose.yml exposes port 4001 to host, allowing direct API access
   bypassing nginx security headers and rate limiting.

8. **Docker Container Runs as Root**
   Dockerfile has no USER directive. The Node.js process runs as root inside
   the container, meaning a container escape gives root on the host.

9. **No Security Headers (Helmet Missing)**
   No X-Frame-Options, X-Content-Type-Options, CSP, HSTS headers.
   Allows clickjacking, MIME sniffing, and content injection attacks.

10. **Weak Default Secrets**
    JWT_SECRET and POSTGRES_PASSWORD have hardcoded fallback values in
    docker-compose.yml. If .env is missing, production uses known passwords.

### MEDIUM

11. **No UUID Validation on Route Parameters**
    `req.params.id` is passed directly to SQL. While parameterized queries
    prevent SQLi, invalid UUIDs cause unhandled PostgreSQL errors (22P02).

12. **Socket.IO CORS Wildcard**
    `new Server(server, { cors: { origin: '*' } })` allows any origin to
    establish WebSocket connections.

13. **Excessive Error Logging in Production**
    `console.error` with full error objects could leak stack traces, database
    connection strings, or query details in container logs.

14. **No Input Length Validation**
    Customer names, notes, product descriptions have no max length enforcement
    at the API level. Could be used for storage exhaustion.

15. **Rate Limit Applied Only to /api/ Prefix**
    Health endpoint and non-prefixed routes have no rate limiting.

### LOW

16. **No Docker Health Checks**
    No `healthcheck` directives in docker-compose.yml. Unhealthy containers
    won't auto-restart.

17. **No Docker Resource Limits**
    No memory or CPU limits. A single container can starve the host.

---

## FIXES APPLIED

See modified files:
- backend/server.js — helmet, login rate limit, Socket.IO auth, UUID validation, input sanitization, error handler
- backend/Dockerfile — non-root user
- backend/package.json — added helmet dependency
- docker-compose.yml — removed DB/backend port exposure, added healthchecks, resource limits
- nginx/*.conf — security headers on all services
- All frontend JS files — XSS sanitization via escapeHtml(), removed hardcoded IPs
