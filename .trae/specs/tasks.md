# Implementation Tasks — CARE IT Assets

## Task 1: Backend — expand purchase categories & add department filter to asset exports

Status: pending
Priority: high
Parent ACs: AC-2, AC-4
Files to modify:
- `backend/care-it-backend-main/server.js`

Changes:
- Replace `PURCHASE_CATEGORIES` array with: ["Laptops", "Mobile Phones", "Tablets", "Printers", "Copiers", "Toners", "Network Devices", "Docking Station", "Keyboard Combo/Mouse", "Laptop Charger"]
- In `buildAssetFilterFromQuery(req)` add `department` extraction so asset Excel/PDF exports honor it
- In `buildExportFilename()` include `department` when present in query
- In purchase-item schema enum, reference `PURCHASE_CATEGORIES`
- Verify returnedAssetSchema & borrowedItemSchema don't need the same categories; leave those alone unless AC-4 failure

Test Requirements:
- **TR-1.1 (rule)**: GET `/api/purchase-items/categories` returns the 10-category list in the required order.
- **TR-1.2 (rule)**: GET `/api/export/excel?department=IT` downloads only IT assets and filename contains `-IT-`.
- **TR-1.3 (rubric, scale 0-2, pass ≥ 1)**: Backend restart (`npm start`) succeeds with the new enum; no validation errors when posting a purchase item of each new category. Score: 2 = all 10 submit cleanly; 1 = >75% submit; 0 = <50%.

Completion Evidence: recorded by implementer self-check with curl or equivalent.

---

## Task 2: Frontend index.html — add purchaseItemsPage DOM & Export Options panel

Status: pending
Priority: high
Parent ACs: AC-1, AC-3, AC-4, AC-5, AC-6
Files to modify:
- `index.html` (root)

Changes:
- Add `#purchaseItemsPage` section including header (`#headerPurchaseItems`), page-header + header-actions, filters row (search, category, status, location, condition), responsive table (Item Tag, Category, Brand/Model, Serial, Quantity, Purchase Date, Price, Supplier, Invoice #, Status, Location, Condition, Actions), purchase-item modal with form fields matching schema (`itemTag`, `category`, `brand`, `model`, `serialNumber`, `purchaseDate`, `purchasePrice`, `supplier`, `invoiceNumber`, `quantity`, `status`, `location`, `condition`, `assignedTo`, `notes`).
- On Assets page, insert an "Export Options" card/row above or inside `.filters` with four dropdowns (Location, Department, Category, Status) and Export Excel / Export PDF buttons. Department dropdown must list all values from the asset department enum.
- Bump `?v=…` cache-buster on SVG/CSS/script tag to today's new version.

Test Requirements:
- **TR-2.1 (rule)**: Document.getElementById('purchaseItemsPage') returns a non-null DOM node with at least one `<table>` child, one form, and one Add button.
- **TR-2.2 (rule)**: Assets page Export Options panel contains four `<select>` elements with IDs `exportLocationFilter`, `exportDepartmentFilter`, `exportCategoryFilter`, `exportStatusFilter`, and two buttons with `onclick=exportFilteredExcel()/exportFilteredPdf()`.
- **TR-2.3 (rule)**: Purchase Item Category `<select>` contains exactly 10 `<option>` values matching the AC-4 list order.
- **TR-2.4 (rubric, scale 0-2, pass ≥ 1)**: Page layout quality: dashboard/asset/purchase pages all fit the edge-to-edge convention (no hard width caps on `.container > .page-header/.filters/.card`). 2 = all three pages match; 1 = two pages match; 0 = one or zero match.

Completion Evidence: browser console/DOM inspection.

---

## Task 3: Frontend script.js — purchase page logic, filtered export, sign-in & loading fixes

Status: pending
Priority: high
Parent ACs: AC-1, AC-3, AC-4, AC-5, AC-6
Files to modify:
- `script.js` (root)

Changes grouped by feature:

### 3a. Filtered asset exports
- Add `exportFilteredExcel()` and `exportFilteredPdf()` that read the four Export-Options dropdowns, build a query string (encodeURIComponent), and call `/api/export/excel?…` / `/api/export/pdf?…`. Keep existing `exportToExcel()`/`exportToPdf()` for simple exports (no filters).
- Wire the buttons' onclick from Task 2 to these new functions.

### 3b. Purchase Items page
- Implement `renderPurchaseHeaderActions(headerId default 'headerPurchaseItems')` — shows Add Purchase Item, Export Excel, Export PDF for purchase items (call `/api/purchase-export/excel|pdf`).
- Implement `loadPurchaseItems()` — fetch `/api/purchase-items` with filters, render rows with loading → data → empty state; delete/edit/view actions per role.
- Implement open/close/edit/submit/delete modal handlers (`openPurchaseItemModal()`, `closePurchaseItemModal()`, `submitPurchaseItemForm(event)`, `deletePurchaseItem(id)`), and `filterPurchaseItems()` for client-side filtering.

### 3c. Sign-in bug fixes
- `warmBackend()` call from `handleUserLogin` submit (at the start) so cold backend starts warming immediately.
- In `handleUserLogin`, improve catch for 503: show "Database starting up — retrying automatically…", delay 4s, then retry exactly once.
- In `initializeApp()`, hide ALL `.page` elements BEFORE `if (isAuthenticated())` branch; prevents flash of Dashboard during login-page visit.
- Ensure login button remains disabled with "Signing in…" text through the first attempted call (already implemented — confirm path for 503 retry also keeps it disabled).

### 3d. Loading states everywhere
- `loadAssets`: show `<tr><td colspan=N class=text-center>Loading…</td></tr>` at call start; replace on success or show error banner on failure.
- `loadDashboardData`: show loading message in each table body until data is ready.
- `loadUsers`: same pattern.
- `loadPurchaseItems`: implement same pattern.

Test Requirements:
- **TR-3.1 (rule)**: `typeof renderPurchaseHeaderActions` and `typeof loadPurchaseItems` are both `function`; calling `loadPurchaseItems()` triggers fetch to `/api/purchase-items` (observed via Network tab or mocked fetch).
- **TR-3.2 (rule)**: Submitting the purchase-item create form with all required fields and any of the 10 categories creates the item (server returns 2xx; new row appears; no schema enum error).
- **TR-3.3 (rule)**: Clicking Export Excel in the Assets Export Options with, e.g., Department=IT selected, produces a request whose URL includes `department=IT` (or URL-encoded equivalent).
- **TR-3.4 (rubric, scale 0-2, pass ≥ 1)**: Sign-in UX on a cold-load simulation (disconnect then click Sign In). 2 = button disables, shows "Signing in…", shows a "starting up…retrying" message on transient 503, re-enables on final failure with correct error text; 1 = button disables but messages are generic; 0 = button stays clickable during call, or UI flash occurs.
- **TR-3.5 (rule)**: First render of purchase page shows table body row "Loading…" then either populated rows or "No purchase items found"; never leaves "Loading…" stuck when server returns 0 items or an error.

Completion Evidence: manual browser run + screenshot / console capture recorded by implementer.

---

## Task 4: Frontend style.css — purchase page & export options layout (only if needed)

Status: pending
Priority: medium
Parent ACs: AC-3, NFR-2
Files to modify:
- `style.css` (root; if existing classes aren't sufficient)

Changes:
- Reuse existing `.card`, `.filters`, `.page-header`, `.table-responsive`, `.modal`, `.bulk-actions-bar` classes from Assets page layout. If purchase page layout breaks, add targeted styles (no new color tokens, no new button variants).
- Ensure the new Export Options panel on Assets page uses a `.card` with grid-2 or grid-4 responsive layout consistent with the Dashboard cards.

Test Requirements:
- **TR-4.1 (rule)**: Purchase page renders without horizontal scroll at widths ≥ 360px (Chrome DevTools responsive).
- **TR-4.2 (rule)**: Export Options row dropdowns + buttons fit on one row at width ≥ 1280px and wrap cleanly below.

Completion Evidence: responsive-view screenshots or inline DevTools measurements.

---

## Task 5: Push both repositories to GitHub `main` with OneDrive-safe settings

Status: pending
Priority: high
Parent ACs: AC-7
Scope: no file edits — only git operations
Commands: use existing `Step1-Push-Backend.bat` and `Step2-Commit-Push-Frontend.bat` in repo root, OR equivalent PowerShell with `git -c core.appendAtomically=false -c core.logAllRefUpdates=false`.

Test Requirements:
- **TR-5.1 (rule)**: `git log --oneline -3` in both frontend and backend working copies include a new commit message describing the changes.
- **TR-5.2 (rule)**: `git status` reports "nothing to commit, working tree clean" (or similar) after the push script completes; no .lock file errors.
- **TR-5.3 (rubric, scale 0-2, pass ≥ 1)**: Push success quality — 2 = both repos push cleanly, GitHub latest commit on main matches; 1 = one repo pushed, second has a clear retryable error (e.g., auth) that is documented to the user; 0 = neither push completed.

Completion Evidence: captured `git status` / `git log` output and confirmation that Render auto-deploys on push.

---

## Task 6: Independent Review gate

Status: pending
Priority: high
Review-only task — performed by a separate pass after Tasks 1-5 reach `completed`. Produces `review.md` with evidence of AC-1 through AC-7 checks; any failures become new remediation pending tasks inserted before the "Push" gate re-runs.

Test Requirements:
- **TR-6.1 (rule)**: Every AC listed in `spec.md` has independent pass evidence in `review.md`.
- **TR-6.2 (rule)**: Any actionable Review findings become `pending` tasks in this `tasks.md` before the overall implementation is considered done.

Completion Evidence: populated `review.md` present under `.trae/specs/`.
