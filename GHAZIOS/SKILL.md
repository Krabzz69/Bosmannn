# GHAZIOS DESIGN SYSTEM SKILL

## 🎯 CORE IDENTITY
**Project Purpose**: Multi-tenant POS system for restaurants in Mauritius
**Design Personality**: Professional, trustworthy, efficient, locally-rooted yet modern
**Target Users**: Restaurant owners, cashiers, kitchen staff, superadmins
**Brand Values**: Reliability, Speed, Clarity, Mauritian Hospitality

---

## 1. GLOBAL CONFIGURATION & TASTE VARIABLES

```yaml
DESIGN_VARIANCE: 3      # Professional & Consistent (not experimental)
TYPOGRAPHY_SCALE: 6     # Clear hierarchy, comfortable reading for long shifts
WHITESPACE_DENSITY: 6   # Balanced - efficient but not cramped
COLOR_SATURATION: 5     # Moderate - professional with subtle warmth
```

---

## 2. THE ANTI-SLOP BASELINE (Strict Prohibitions)

### 🚫 BANNED ELEMENTS
- **Fonts**: Inter, Roboto, Open Sans, Arial, default system fonts
- **Colors**: 
  - Default Tailwind `purple-500`/`blue-600` gradients
  - Neon green accents on dark mode
  - Pure `#FFFFFF` or `#000000`
- **Patterns**:
  - Generic rounded cards with heavy drop shadows
  - Glassmorphism without performance consideration
  - Default unstyled HTML form elements
  - Bootstrap-looking components

### ✅ REQUIRED ALTERNATIVES
- **Primary Font**: `General Sans` or `Satoshi` (via CDN)
- **Fallback**: `system-ui, -apple-system, BlinkMacSystemFont`
- **Color Palette**: Off-whites (`#FAFAFA`, `#F9FAFB`), deep off-blacks (`#09090B`, `#111827`)
- **Borders**: Subtle low-opacity (`border-black/5`, `border-white/10`)

---

## 3. PREMIUM AESTHETICS & TYPOGRAPHY

### Typography Hierarchy
```css
/* Headings - Tight tracking, generous weight */
h1: text-4xl font-semibold tracking-tight leading-tight
h2: text-3xl font-semibold tracking-tight leading-tight
h3: text-2xl font-medium tracking-tight leading-snug
h4: text-xl font-medium tracking-normal leading-snug

/* Body - Comfortable line-height, optimal measure */
body: text-base leading-relaxed max-w-[65ch]
small: text-sm leading-relaxed
caption: text-xs leading-relaxed text-muted-foreground

/* UI Text */
button: text-sm font-medium tracking-wide
label: text-sm font-medium
input: text-base
```

### Whitespace Rules
- **Main containers**: `p-6` (mobile), `p-8` (tablet), `p-12` (desktop)
- **Card padding**: `p-4` minimum, `p-6` preferred
- **Section gaps**: `gap-6` to `gap-8`
- **Element separation**: Tight grouping, ample section margins (`mb-8`, `mb-12`)

### Color System
```css
/* Light Mode */
--background: #FAFAFA
--foreground: #09090B
--card: #FFFFFF
--card-foreground: #09090B
--primary: #111827
--primary-foreground: #FAFAFA
--secondary: #F3F4F6
--secondary-foreground: #1F2937
--muted: #F9FAFB
--muted-foreground: #6B7280
--accent: #E5E7EB
--accent-foreground: #111827
--border: rgba(0,0,0,0.05)
--ring: rgba(0,0,0,0.1)

/* Dark Mode */
--background: #09090B
--foreground: #FAFAFA
--card: #111827
--card-foreground: #FAFAFA
--primary: #FAFAFA
--primary-foreground: #09090B
--secondary: #1F2937
--secondary-foreground: #F3F4F6
--muted: #111827
--muted-foreground: #9CA3AF
--accent: #1F2937
--accent-foreground: #FAFAFA
--border: rgba(255,255,255,0.1)
--ring: rgba(255,255,255,0.15)
```

---

## 4. COMPONENT ARCHITECTURE

### Cards
```html
<!-- Standard Card -->
<div class="bg-card border border-border rounded-lg shadow-sm shadow-black/5 
            hover:shadow-md hover:border-black/10 transition-all duration-200 ease-out">
  <!-- Content -->
</div>

<!-- Interactive Card -->
<div class="bg-card border border-border rounded-lg shadow-sm 
            hover:bg-accent/50 hover:scale-[1.01] active:scale-[0.99] 
            transition-all duration-200 ease-out cursor-pointer">
  <!-- Content -->
</div>
```

### Buttons
```html
<!-- Primary Button -->
<button class="inline-flex items-center justify-center gap-2 px-6 py-3 
               bg-primary text-primary-foreground rounded-lg 
               font-medium text-sm tracking-wide
               hover:bg-primary/90 hover:scale-[1.02] 
               active:scale-[0.98] active:bg-primary/95
               focus:outline-none focus:ring-2 focus:ring-ring/20
               disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
               transition-all duration-200 ease-out min-h-[44px]">
  <!-- Icon + Text -->
</button>

<!-- Secondary Button -->
<button class="inline-flex items-center justify-center gap-2 px-6 py-3 
               bg-transparent border border-border text-foreground rounded-lg 
               font-medium text-sm tracking-wide
               hover:bg-accent/50 hover:border-black/10 
               active:scale-[0.98]
               focus:outline-none focus:ring-2 focus:ring-ring/20
               disabled:opacity-50 disabled:cursor-not-allowed
               transition-all duration-200 ease-out min-h-[44px]">
  <!-- Icon + Text -->
</button>

<!-- Ghost Button -->
<button class="inline-flex items-center justify-center gap-2 px-4 py-2 
               bg-transparent text-foreground rounded-md 
               font-medium text-sm
               hover:bg-accent/50 
               active:scale-[0.98]
               focus:outline-none focus:ring-2 focus:ring-ring/20
               transition-all duration-200 ease-out min-h-[44px]">
  <!-- Icon + Text -->
</button>
```

### Modals & Dialogs
```html
<!-- Backdrop -->
<div class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50
            animate-in fade-in duration-200">
  <!-- Modal Content -->
  <div class="fixed inset-0 flex items-center justify-center p-4">
    <div class="bg-card rounded-xl shadow-xl border border-border 
                max-w-md w-full p-6
                animate-in zoom-in-95 fade-in duration-200">
      <!-- Content -->
    </div>
  </div>
</div>
```

### Inputs
```html
<!-- Text Input -->
<div class="space-y-2">
  <label class="text-sm font-medium text-foreground">Label</label>
  <input type="text" 
         class="w-full px-4 py-3 bg-background border border-border rounded-lg 
                text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary
                hover:border-black/10
                transition-all duration-200 ease-out
                disabled:opacity-50 disabled:cursor-not-allowed
                min-h-[44px]" />
  <p class="text-xs text-muted-foreground">Helper text</p>
</div>

<!-- Error State -->
<div class="space-y-2">
  <label class="text-sm font-medium text-foreground">Label</label>
  <input type="text" 
         class="w-full px-4 py-3 bg-background border border-red-500/50 rounded-lg 
                text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-red-500/20
                transition-all duration-200 ease-out" />
  <p class="text-xs text-red-600">Error message</p>
</div>
```

---

## 5. ICONOGRAPHY & ASSETS

### Icon Rules
- **Library**: Lucide Icons (consistent stroke weight: 1.5px)
- **Sizes**: 
  - Inline with text: `w-4 h-4` or `w-5 h-5`
  - Standalone: `w-6 h-6`
  - Hero icons: `w-8 h-8` or larger
- **Alignment**: Always `flex items-center gap-2`
- **Color**: `text-current` or `text-muted-foreground`
- **Never**: Mix filled/outlined, use absolute positioning for inline icons

### Example
```html
<button class="inline-flex items-center gap-2">
  <svg class="w-5 h-5" ...><!-- Icon --></svg>
  <span>Button Text</span>
</button>
```

---

## 6. MICRO-INTERACTIONS & "FEEL"

### Transition Standards
```css
/* Default Transition */
transition-all duration-200 ease-out

/* Hover States */
hover:scale-[1.02]
hover:bg-accent/50
hover:border-black/10
hover:shadow-md

/* Active/Click States */
active:scale-[0.98]
active:bg-primary/95

/* Loading States */
/* Use skeleton loaders, never browser spinners */
.animate-pulse.bg-muted.rounded

/* Scroll Behavior */
scroll-smooth

/* Viewport Animations */
animate-in fade-in slide-in-from-bottom-4 duration-300
```

### Loading Skeleton
```html
<div class="space-y-4">
  <div class="h-4 bg-muted rounded animate-pulse w-3/4"></div>
  <div class="h-4 bg-muted rounded animate-pulse"></div>
  <div class="h-4 bg-muted rounded animate-pulse w-5/6"></div>
</div>
```

---

## 7. CODE-LEVEL ENFORCEMENT & TAILWIND RULES

### Class Organization Order
```
1. Layout (flex, grid, block, etc.)
2. Spacing (p-*, m-*, gap-*)
3. Typography (text-*, font-*, leading-*, tracking-*)
4. Visuals (bg-*, border-*, shadow-*, rounded-*)
5. States (hover:*, focus:*, active:*, disabled:*)
6. Responsive (sm:*, md:*, lg:*, xl:*)
```

### Example
```html
<div class="flex items-center gap-4 p-6 text-lg font-semibold 
            text-primary hover:bg-accent md:p-8">
  <!-- Content -->
</div>
```

### Component Extraction Rules
- Extract if > 40 lines
- Extract if repeated > 2 times
- Keep components single-purpose

### Accessibility Requirements
- All interactive elements keyboard navigable
- All images/icons have `alt` or `aria-label`
- Color contrast meets WCAG AA (4.5:1 minimum)
- Proper heading hierarchy (h1 → h2 → h3)
- Form inputs have associated `<label>` tags
- Visible focus rings (`focus:ring-2 focus:ring-ring/20`)

---

## 8. QUALITY GATES & REVIEW CHECKPOINTS

Before finalizing any UI, verify:

✅ **Spacing**: Consistent 4px/8px grid, uniform margins/padding  
✅ **Responsiveness**: Graceful mobile degradation, adequate touch targets (44x44px)  
✅ **Contrast**: Legible text in light/dark modes  
✅ **States**: Hover, focus, active, disabled defined  
✅ **Edge Cases**: Empty states, long text handling, loading states  
✅ **Typography**: Proper hierarchy, comfortable line-height  
✅ **Icons**: Consistent set, proper sizing, aligned with flexbox  

---

## 9. SLASH COMMANDS & WORKFLOWS

### `/audit`
Perform comprehensive UI/UX and accessibility review.
**Output**: Markdown report with failures in spacing, contrast, ARIA labels, breakpoints + specific Tailwind fixes.

### `/polish`
Execute final premium pass before deployment.
**Output**: Refined typography (tracking/leading), increased whitespace, smooth micro-interactions, subtle borders/shadows.

### `/distill`
Strip component to absolute essentials.
**Output**: Remove redundant wrappers, consolidate classes, eliminate unnecessary animations.

### `/bolder`
Increase visual weight.
**Output**: Higher font weights, saturated colors, stronger borders, increased contrast.

### `/quieter`
Decrease visual weight.
**Output**: Muted colors, reduced font weights, replace borders with background shifts, increase whitespace.

### `/baseline-ui`
Enforce strict Tailwind and design system consistency.
**Output**: Auto-fix inline styles, hardcoded hex colors, inconsistent border radii.

### `/fixing-accessibility`
Deep-dive accessibility audit.
**Output**: Check heading hierarchy, label associations, focus rings, color contrast. Fix all violations.

### `/mauritius-mode`
Apply local Mauritian context.
**Output**: Adjust colors for tropical lighting, ensure Creole/French text support, optimize for local devices/networks.

---

## 10. PROJECT-SPECIFIC APPLICATION

### GHAZIOS Brand Colors (Mauritian Inspired)
```css
/* Primary - Deep Ocean Blue */
--ghazios-primary: #0F172A

/* Accent - Sunset Orange */
--ghazios-accent: #EA580C

/* Success - Tropical Green */
--ghazios-success: #059669

/* Warning - Mango Yellow */
--ghazios-warning: #D97706

/* Error - Hibiscus Red */
--ghazios-error: #DC2626

/* Background - Sand White */
--ghazios-bg: #FAFAF9

/* Card - Cloud White */
--ghazios-card: #FFFFFF
```

### Role-Specific Interfaces

#### Superadmin Dashboard
- **Style**: Corporate, data-dense, authoritative
- **Density**: High information, clear hierarchy
- **Actions**: Global oversight, tenant management

#### Restaurant Admin Panel
- **Style**: Professional, balanced, empowering
- **Density**: Medium, actionable insights
- **Actions**: Menu management, staff control, reports

#### POS Interface (Cashier)
- **Style**: Efficient, high-contrast, large touch targets
- **Density**: Optimized for speed, minimal clicks
- **Actions**: Quick order entry, payment processing

#### Kitchen Display
- **Style**: High-contrast, glanceable, status-focused
- **Density**: Order queue clarity, timing emphasis
- **Actions**: Status updates, priority management

---

## 11. IMPLEMENTATION CHECKLIST

### Font Setup
```html
<!-- Add to <head> -->
<link rel="preconnect" href="https://fonts.bunny.net">
<link href="https://fonts.bunny.net/css?family=general-sans:400,500,600,700" rel="stylesheet" />
<style>
  :root {
    font-family: 'General Sans', system-ui, -apple-system, sans-serif;
  }
</style>
```

### Tailwind Config Extension
```js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['General Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'rgba(0,0,0,0.05)',
        ring: 'rgba(0,0,0,0.1)',
        muted: {
          DEFAULT: '#F9FAFB',
          foreground: '#6B7280',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
}
```

---

## USAGE INSTRUCTIONS

When generating UI for GHAZIOS:

1. **Reference this skill** before writing any CSS/HTML
2. **Apply the anti-slop baseline** - reject banned elements
3. **Use the component architecture** - consistent patterns
4. **Enforce accessibility** - WCAG AA compliance
5. **Add micro-interactions** - make it feel premium
6. **Run quality gates** - verify before finalizing
7. **Apply project-specific colors** - Mauritian brand identity
8. **Consider role context** - different interfaces for different users

**Remember**: This is a professional POS system for real restaurants. Every pixel must serve clarity, efficiency, and trust.
