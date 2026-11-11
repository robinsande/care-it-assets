# CARE IT Asset Management — Specification

## Problem
The CARE IT Asset Management System needs four improvements:
1. Asset exports (Excel/PDF) currently have no filter options — users cannot export subsets by location, department, category, or status.
2. The Purchase Items feature is referenced in the navbar and `switchPage()` routing but has no page UI, no load functions, and no create/edit form. The purchase categories are also incomplete.
3. Sign-in and page-load bugs: the login flow has no loading indicator when the backend warms up; initial page state can show stale pages briefly; 503/network errors on login show generic "Failed" instead of actionable messages.
4. After changes, both repos (frontend `care-it-assets` and backend `care-it-backend`) must be pushed to GitHub's `main` branch for Render deployment, accounting for OneDrive file locking.

## Users
- Admins / SuperAdmins: create assets & purchase items, bulk export by filters, deploy.
- Users / Viewers: view assets, export (read-only) by filters.

## Goals
1. Provide a dedicated "Export Options" UI on the Assets page that lets users pick Location, Department, Category, and Status before downloading Excel or PDF. The same filters are honored server-side.
2. Build a complete Purchase Items page (referenced by navbar + routing) with:
   - category dropdown including: **Laptops, Mobile Phones, Tablets, Printers, Copiers, Toners, Network Devices, Docking Station, Keyboard Combo/Mouse, Laptop Charger**;
   - fields for serial number, item tag, purchase date/price, supplier, invoice, quantity, location, condition, status;
   - full CRUD (create, read, update, delete) for admins.
3. Fix sign-in and loading bugs:
   - Login button shows a "Signing in…" state with backend warm-up awareness;
   - Clear loading messages when database wakes up (503);
   - `initializeApp()` correctly hides all pages before showing the first one;
   - No flash of Dashboard/Assets before login redirect;
   - Purchase Items page has a working "loading" + "no data" state.
4. Push both frontend and backend repositories to GitHub `main` using the existing batch scripts or PowerShell with OneDrive-safe Git settings (`core.appendAtomically=false`, `core.logAllRefUpdates=false`).

## Non-Goals
- No new auth provider; password resets and email flow stay as-is.
- No new chart/dashboard reports beyond what exists.
- No changes to the Reports page routing (page referenced but out of scope).

## Functional Requirements
### FR-1 — Filtered Asset Export (frontend UI)
On the Assets page, add an Export Options panel (visible on both Dashboard preview and Assets page) with:
- Location dropdown populated from the location enum
- Department dropdown populated from the department enum
- Category dropdown populated from `ASSET_CATEGORIES`
- Status dropdown with all status values
- "Export Excel" and "Export PDF" buttons that pass the chosen filters as query params to `/api/export/excel` and `/api/export/pdf`.

### FR-2 — Filtered Asset Export (backend)
- `buildAssetFilterFromQuery(req)` must accept `department` in addition to the existing `location/status/category/condition`.
- Excel/PDF filename includes chosen filters so files are distinguishable (e.g. `assets-Nairobi-IT-Assigned-2026-09-29.xlsx`).
- Export filenames also include `department`.

### FR-3 — Purchase Items Page (HTML)
Create the full `purchaseItemsPage` DOM block in `index.html`:
- `#headerPurchaseItems` header
- Page header with Add Purchase Item button
- Filters row (search, category, status, location, condition)
- Table with columns: Item Tag, Category, Brand/Model, Serial Number, Quantity, Purchase Date, Price, Supplier, Invoice #, Status, Location, Condition, Actions
- Modal form for create/edit with all PurchaseItem schema fields.

### FR-4 — Purchase Categories expanded
Update `PURCHASE_CATEGORIES` (backend) and the related frontend dropdowns to match user request exactly:
1. Laptops
2. Mobile Phones
3. Tablets
4. Printers
5. Copiers
6. Toners
7. Network Devices
8. Docking Station
9. Keyboard Combo/Mouse
10. Laptop Charger

Ensure enum values match in:
- backend `PURCHASE_CATEGORIES` array
- any frontend select that lists purchase categories.

### FR-5 — Purchase Items page logic (script.js)
Implement:
- `renderPurchaseHeaderActions()`
- `loadPurchaseItems()` — GET `/api/purchase-items` with optional filters
- purchase CRUD modals and submit handlers
- `switchPage('purchaseItemsPage')` fully renders everything (no missing functions).

### FR-6 — Sign-in bug fixes
- `handleUserLogin`: keep button disabled and show "Signing in…" until the call resolves; on 503 with "Database is waking up" message, show a friendly "Database starting up — please retry in 5 seconds" message with auto retry.
- `initializeApp()`: on page load, hide ALL pages before showing any page; prevents UI flash.
- `warmBackend()`: run on login click (as well as on load) so cold Render instance is spun earlier.
- Loading states on tables: "Loading…" message visible until fetch completes; error message on failure.

### FR-7 — Purchase Items loading state fixes
- `loadPurchaseItems`, `loadAssets`, `loadUsers`, `loadDashboardData` must all show a table-level loading skeleton/message while data is loading; empty states say "No data" instead of leaving "Loading…" stuck.

## Non-Functional Requirements
### NFR-1 — OneDrive-safe Git operations
Use `git -c core.appendAtomically=false -c core.logAllRefUpdates=false` for commit/push operations from this repository; or use the existing batch scripts.

### NFR-2 — Backwards compatibility
- Existing Excel export (14 columns including returnedBy/returnDate) must remain identical.
- New filter query parameters are optional; when absent, export all assets.
- Existing import and API routes must not break.

### NFR-3 — Cache busting
After frontend changes, bump version query strings (`?v=YYYYMMDDx`) on `care-logo.svg`, `style.css`, and `script.js` in `index.html`.

## Constraints
- Backend: Node.js/Express with Mongoose; deploy to Render via pushes to GitHub `main`.
- Frontend: vanilla HTML/JS/CSS; no build step.
- Department/category/location enums must match exactly between backend schema and frontend dropdowns.
- Export filters must also support "All / no filter" (empty string = no filter).

## Dependencies
- Backend packages already installed: `exceljs`, `pdfkit`, `mongoose`. No new dependencies.

## Assumptions
- Purchase items page is admin-only for create/update/delete; read for users and viewers is acceptable.
- Export by department/category/location/status is AND-combined (all non-empty filters apply together).
- Purchase page "Reports" nav link referenced by `initializeApp` can remain stub (page not present); not a blocker.

## Acceptance Criteria

### AC-1 (rule)
On the Assets page, an Export Options panel exists with the four filter dropdowns (Location, Department, Category, Status) and two buttons (Export Excel, Export PDF). Clicking either downloads a file whose contents match the chosen filters and whose filename includes those filter values plus the date.

### AC-2 (rule)
`GET /api/export/excel?department=IT&location=Nairobi&category=Laptops&status=Assigned` returns an `.xlsx` containing only assets that match all four filters. Same filter set works for `/api/export/pdf`.

### AC-3 (rule)
The `purchaseItemsPage` section exists in `index.html` and clicking the Purchase Items navbar link shows a populated page with header, filters, and table. Navigating to the page does not throw console errors for missing `renderPurchaseHeaderActions` or `loadPurchaseItems`.

### AC-4 (rule)
The Purchase Item create/edit modal's Category dropdown lists exactly these values in this order: **Laptops, Mobile Phones, Tablets, Printers, Copiers, Toners, Network Devices, Docking Station, Keyboard Combo/Mouse, Laptop Charger**. Submitting a valid item returns success and appears in the table.

### AC-5 (rubric, scale 0-2, pass ≥ 1)
Sign-in loading behaviour quality:
- 2: Login button disables with "Signing in…" text; 503 DB wake-up shows friendly retry message and retries once; no UI flash of protected pages.
- 1: Login button disables but messages are generic; no protected-page flash.
- 0: Login button does not disable, or pages visibly flash before redirect.

### AC-6 (rule)
Every table (Dashboard stats, Assets, Users, Purchase Items) has a visible "Loading…" state on first render; an empty result shows a "No data" row rather than leaving the loading row; network errors show a message (not empty table + loading spinner).

### AC-7 (rule)
After implementation, both repositories (frontend `care-it-assets` and backend `care-it-backend`) contain all changes committed locally, and the provided push script / PowerShell push commands complete without OneDrive locking errors. Deploy confirmation info (Render deploys on `main` push) is returned to the user.
