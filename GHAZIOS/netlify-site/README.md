# GHAZIOS - Netlify Deployment

This folder is ready to be dropped into Netlify for static hosting.

## 🚀 Quick Deploy to Netlify

### Option 1: Drag and Drop
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the entire `netlify-site` folder onto the page
3. Your site will be live instantly!

### Option 2: Git Deploy
1. Push this folder to a Git repository
2. Connect your repo to Netlify
3. Set build settings:
   - **Publish directory**: `.` (current directory)
   - **Build command**: (leave empty)

## Structure

```
netlify-site/
├── index.html          # Main customer ordering website
├── css/
│   └── styles.css      # Website styles
├── js/
│   └── app.js          # Website JavaScript
├── admin/              # Admin panel (requires backend)
├── pos/                # Point of Sale (requires backend)
├── kitchen/            # Kitchen display (requires backend)
├── superadmin/         # Superadmin panel (requires backend)
└── netlify.toml        # Netlify configuration
```

## Important Notes

⚠️ **This is a STATIC frontend only.** The application requires a backend server to function properly:

1. **API Endpoints**: All JavaScript files reference `/api` endpoints that need a backend server
2. **Socket.IO**: Real-time features (orders, kitchen display) require Socket.IO server
3. **Database**: The app needs PostgreSQL with the schema in `/database/schema.sql`

## What Works on Netlify

✅ Customer-facing website (ordering interface)
✅ Static assets (CSS, JS, images)
✅ UI rendering and animations
✅ Binary rain animation
✅ Cart functionality (local)
✅ Navigation between pages

## What Won't Work Without Backend

❌ Loading restaurants from API
❌ Submitting orders
❌ Admin/POS/Kitchen/Superadmin panels (need authentication + API)
❌ Real-time order updates

## To Make It Fully Functional

You need to deploy the backend separately:

1. **Backend Server**: Deploy `/backend/server.js` to a service like:
   - Railway
   - Render
   - Heroku
   - DigitalOcean App Platform

2. **Database**: Set up PostgreSQL and run:
   - `/database/schema.sql`
   - `/database/seed-data.sql`

3. **Connect Frontend to Backend**: 
   - Update the `API` constant in all JS files to point to your backend URL
   - Example: `const API = 'https://your-backend.railway.app/api';`

4. **Environment Variables** (for backend):
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `PORT`

## Quick Test

After deploying to Netlify:
1. Visit your Netlify site URL
2. You'll see the landing page with binary rain animation
3. Restaurant list will be empty (no backend connection)
4. UI interactions work but data won't load

## URLs After Deployment

- **Main Site**: `https://your-site.netlify.app/`
- **Admin Panel**: `https://your-site.netlify.app/admin/`
- **POS System**: `https://your-site.netlify.app/pos/`
- **Kitchen Display**: `https://your-site.netlify.app/kitchen/`
- **Superadmin**: `https://your-site.netlify.app/superadmin/`

## Full Setup

For complete setup instructions, refer to the main README.md in the project root.
