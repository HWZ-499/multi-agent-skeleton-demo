# External Coding Agent Tasks (`TASKS.md`)

Welcome! Before writing any code, read **`AGENTS.md`** and **`src/types/contracts.mjs`**.
Remember the **Strict Hotspot Lock**: ONLY modify or create files inside your assigned `src/features/<your-slot>/` directory! Never touch `package.json`, `src/server.mjs`, `src/index.mjs`, `src/core/**`, `src/types/**`, `AGENTS.md`, or `TASKS.md`.

---

## Task A (Assigned to OpenAI Codex) — Loyalty Points & Cashback (`src/features/loyalty/`)
- **Branch**: `feat/codex-loyalty`
- **Exclusive Territory**: `src/features/loyalty/**`
- **Test Command**: `node --test src/features/loyalty/index.test.mjs`

### Requirements
1. Implement `src/features/loyalty/index.mjs`:
   - Set `implemented: true` (keep `id: 'loyalty'` and `order: 15` unchanged).
   - Calculate `pointsEarned = Math.floor(ctx.subtotal * 10)`.
   - Determine loyalty cashback tier from `ctx.subtotal`:
     - `ctx.subtotal >= 200` -> `tier = 'Platinum (5% Cashback)'`, `deltaAmount = -roundCurrency(ctx.subtotal * 0.05)`
     - `ctx.subtotal >= 100` -> `tier = 'Gold (2% Cashback)'`, `deltaAmount = -roundCurrency(ctx.subtotal * 0.02)`
     - `< 100` -> `tier = 'Standard Member (0% Cashback)'`, `deltaAmount = 0`
   - Return `{ pluginId: 'loyalty', label: 'Loyalty: ' + tier, deltaAmount, meta: { tier, pointsEarned } }`.
   - Must pass `validateAdjustment(...)`.
2. Create `src/features/loyalty/widget.mjs` exporting `renderWidget(step, orderContext)`:
   - Return `{ pluginId: 'loyalty', title: 'Loyalty Points & Cashback', badge, summary, metrics, html }`.
   - `metrics` must include `{ label: 'Points Earned', value: pointsEarned + ' pts' }`, `{ label: 'Cashback', value: ... }`, and `{ label: 'Agent Vendor', value: 'OpenAI Codex' }`.
   - `html` must include a visible `'Built by Codex'` badge and a loyalty tier progress visualization (dark-theme friendly inline CSS).
   - Must pass `validateWidgetOutput('loyalty', widget)`.
3. Create `src/features/loyalty/index.test.mjs` using `node:test` and `node:assert/strict` covering:
   - `plugin.apply` for `< 100`, `>= 100` (Gold), and `>= 200` (Platinum), plus `validateAdjustment`
   - `renderWidget` across tiers, plus `validateWidgetOutput('loyalty', widget)`

---

## Task B (Assigned to OpenCode) — Transit Protection & Insurance (`src/features/insurance/`)
- **Branch**: `feat/opencode-insurance`
- **Exclusive Territory**: `src/features/insurance/**`
- **Test Command**: `node --test src/features/insurance/index.test.mjs`

### Requirements
1. Implement `src/features/insurance/index.mjs`:
   - Set `implemented: true` (keep `id: 'insurance'` and `order: 25` unchanged).
   - Calculate transit protection fee:
     - If `ctx.subtotal === 0`: `deltaAmount = 0`, `coveragePlan = 'No Coverage'`, `surcharge = 0`.
     - Otherwise:
       - `surcharge = (ctx.isExpress === true || ctx.weightKg > 10) ? 2.5 : 0`
       - `deltaAmount = roundCurrency(ctx.subtotal * 0.015 + surcharge)`
       - `coveragePlan = (ctx.isExpress === true || ctx.weightKg > 10) ? 'Premium Transit Shield' : 'Standard Transit Shield'`
   - Return `{ pluginId: 'insurance', label: 'Insurance (' + coveragePlan + ')', deltaAmount, meta: { coveragePlan, insuredValue: ctx.subtotal, surcharge } }`.
   - Must pass `validateAdjustment(...)`.
2. Create `src/features/insurance/widget.mjs` exporting `renderWidget(step, orderContext)`:
   - Return `{ pluginId: 'insurance', title: 'Transit Protection & Insurance', badge, summary, metrics, html }`.
   - `metrics` must include `{ label: 'Coverage Plan', value: coveragePlan }`, `{ label: 'Insured Value', value: '$' + orderContext.subtotal.toFixed(2) }`, and `{ label: 'Agent Vendor', value: 'OpenCode' }`.
   - `html` must include a visible `'Built by OpenCode'` badge and a coverage breakdown visualization (dark-theme friendly inline CSS).
   - Must pass `validateWidgetOutput('insurance', widget)`.
3. Create `src/features/insurance/index.test.mjs` using `node:test` and `node:assert/strict` covering:
   - `plugin.apply` for `subtotal === 0`, Standard Transit Shield, and Premium Transit Shield (`isExpress` or `weightKg > 10`), plus `validateAdjustment`
   - `renderWidget` across scenarios, plus `validateWidgetOutput('insurance', widget)`
