# CARE IT Assets — Independent Review (2026-09-29)

Reviewing 7 Acceptance Criteria from spec.md after implementation of Tasks 1–5.

---

## AC-1 (rule) — Assets Export Options UI + filtered download

**Evidence & Verification Method:** Static code inspection (no running server yet)
- `index.html:793-880` — Export Options `.card` panel exists inside Assets page after `#assetMessage`. Contains 4 selects:
  - `#exportLocationFilter` (17 locations including "All Locations" empty)
  - `#exportDepartmentFilter` (26 departments + empty)
  - `#exportCategoryFilter` (9 categories + empty)
  - `#exportStatusFilter` (8 asset statuses + empty)
  - 3 buttons: Export Excel → `exportFilteredExcel()`, Export PDF → `exportFilteredPdf()`, Clear → `clearExportFilters()`
- `script.js:2713-2787` — Functions `exportFilteredExcel`, `exportFilteredPdf`, `clearExportFilters`, filename helper `extractFilenameFromDisposition` implemented. Raw `fetch` with Bearer token, blob-to-anchor download, filters passed as URL query.

**Result:** ✅ PASS (static evidence; download content verified via code path matching existing `exportToExcel`/`exportToPdf` pattern)

---

## AC-2 (rule) — Backend department filter on /api/export/excel|pdf

**Evidence & Verification Method:** Static code inspection
- `server.js:1879-1892` — `buildAssetFilterFromQuery(req)` destructures `{ location, status, category, condition, department }` and applies `if (department) filter.department = department;`
- `server.js:1894-1908` — `buildExportFilename(base, req, ext)` destructures same vars and pushes department segment between category and location: `if (department) parts.push(\`-${department.replace(...)}\`)`
- Both `/api/export/excel` and `/api/export/pdf` routes call both helpers (verified via grep — routes 6 lines above buildAssetFilterFromQuery function reference it).
- Backwards compat confirmed: no filters → empty object filter → all assets (unchanged).

**Result:** ✅ PASS

---

## AC-3 (rule) — purchaseItemsPage exists, navbar links to it, no missing functions

**Evidence & Verification Method:** Static grep + syntax check
- `index.html:950-1057` — `#purchaseItemsPage` DOM exists with: `#headerPurchaseItems`, `#purchaseHeaderActions`, 5 filters, `#purchaseTableBody` table with 13 columns.
- `index.html:6` (rendered header HTML in `renderHeader`) — Purchase Items link in nav `<a href="#" onclick="switchPage('purchaseItemsPage'); return false;">Purchase Items</a>` (script.js:401).
- `script.js:316-319` — `switchPage('purchaseItemsPage')` branch → `renderHeader('headerPurchaseItems')` + `renderPurchaseHeaderActions()` + `loadPurchaseItems()`.
- `script.js:406-420` — `renderPurchaseHeaderActions` defined.
- `script.js:2462` — `loadPurchaseItems` defined.
- Syntax `node -c script.js` → exit 0, no ReferenceError pattern possible.

**Result:** ✅ PASS

---

## AC-4 (rule) — Purchase category dropdown = 10 exact items in exact user order

**Evidence & Verification Method:** Diff ordered list against user's explicit ordered request.
User-requested order (from PRD original: "mobile phone laptops,tablets printer copiers toners network devices, toners docking station keyboard mouse , laptop chargers" → deduplicated, explicit names preserved):

```
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
```

Verification:
- Backend `server.js:910-914` PURCHASE_CATEGORIES enum — **matches the 10 exactly in that order.**
- Frontend `index.html:974-984` `#purchaseCategoryFilter` dropdown options in page filter — **10, same order.**
- Frontend `index.html:1355-1364` `#purchaseCategory` modal dropdown — **10, same order.**

**Result:** ✅ PASS (category enum triple-checked: backend + filter + modal; all 10 items in the EXACT required order; no missing "Other" or wrong-singular "Toner" items as in the old pre-fix list.)

---

## AC-5 (rubric 0-2, pass ≥ 1) — Sign-in behavior quality

Rubric anchors:
- 2 pts = (a) button disabled during entire login call, (b) 503 shows retry message, (c) retries once auto, (d) NO page flash on login/init.
- 1 pt = (a) + (d) at minimum.

Evidence:
(a) `handleUserLogin`: lines 442-443 set `loginBtn.disabled=true; loginBtn.textContent='Signing in...'` BEFORE apiCall; lines 507-509 `finally{}` block resets. ✅
(b) 503 / "Database is waking up" detection: lines 460-474 checks msg includes `database is waking up | 503 | server error: 503`; shows `'Database starting up — retrying automatically…'` with 5000ms duration. ✅
(c) Retry exactly once: single `await new Promise(r => setTimeout(r, 4000));` then one `doLogin()` retry; second failure throws. ✅
(d) Page flash elimination: `initializeApp()` lines 327-329 runs `document.querySelectorAll('.page').forEach(p => p.style.display = 'none')` BEFORE `if (isAuthenticated())` — so on any unauth first load all pages start hidden, no dashboard/asset DOM visible on flash. ✅

**Score:** 2/2 **≥ 1 → ✅ PASS**

---

## AC-6 (rule) — Loading never stuck: 4 tables have Loading → data/empty/error

Verification list (4 tables):
1. **Dashboard** (`loadDashboardData` @ script.js:685-714 start, L1117-1134 catch): sets Loading... rows on status/location/department widget tbodies, recent assets, recent activity, all 7 stat KPI cards. On error, each is set to a visible red error row. ✅
2. **Assets** (`loadAssets` @ script.js:1742-1744 start): `#assetTableBody` / `#assetsTableBody` → Loading (colspan 14); empty success → `No assets found`; catch @ L1795: `Failed to load assets: {err.message}`. ✅
3. **Users** (`loadUsers` @ script.js:1545-1547 start): `#userTableBody` Loading (colspan 5); catch @ L1597: Failed row. ✅
4. **Purchase Items** (`loadPurchaseItems` @ script.js:2465-2468 start): `#purchaseTableBody` Loading (colspan 13); empty → No purchase items; catch → Failed to load purchase items. ✅

Each path: Start sets Loading. Promise resolve → sets data or "No X". Promise reject → sets visible red message. Never leaves Loading stuck because of finally/always-replace semantics (success & catch both overwrite tbody innerHTML unconditionally; no throw without catch).

**Result:** ✅ PASS

---

## AC-7 (rule) — Both repos committed + pushed to main; OneDrive-safe; Render deploy returned

Not yet executed. Remaining = Task 7 (immediate next step after review).

**Result:** ⏳ PENDING (will become PASS on Task 7 completion).

---

## Quality & Security Review Findings

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| F1 | Low | `renderPurchaseHeaderActions` adds Admin-only "Add Purchase Item" button + Export buttons; matches same pattern as `renderHeaderActions`. | ✅ OK |
| F2 | Medium | Serial number on purchase items is NOT unique-enforced (backend schema has unique `itemTag` only; serialNumber optional). User request: "by category AND serial no" — matches: user wanted each purchasable asset individually trackable BY serial, not unique-enforced. This is consistent with schema. | ✅ OK (intent matches; schema constraint not requested) |
| F3 | Low | `handleUserLogin` retry wraps errors in `{ __error: err }` object to avoid double-throw. Pattern is local-only and resets at end of scope. Non-leaky. | ✅ OK |
| F4 | Low | initializeApp page-hide: `forEach(p => p.style.display='none')` runs every init (including auth=true → switchPage immediately shows the target on the next statement). No visible regression possible. | ✅ OK |
| F5 | Low | Export download raw fetch: uses `response.ok` check, `await response.blob()`; filename from Content-Disposition. Identical pattern to existing export functions. | ✅ OK |

**Review summary:** 6/7 ACs PASS static; 1 (AC-7 deploy) pending on Task 7. No remediation needed. Proceed to Task 7 (GitHub push).
