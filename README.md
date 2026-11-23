# Multi-Agent Checkout & Pricing Studio

A practical full-stack demonstration built on a **Slot-based Multi-Agent Skeleton**, showing how 3 AI coding agents collaborate in parallel on the same web application with **zero merge conflicts**.

## Full-Stack Slot Architecture

Instead of letting agents edit shared server routes, HTML layouts, or entry points, this repository separates **frozen host infrastructure** from **parallel feature slots**:

1. **Web App Host (`src/server.mjs`)**
   Zero-dependency Node.js HTTP server (`http://localhost:3090`) serving the interactive **Checkout & Pricing Studio** UI and `/api/calculate` endpoint.
2. **Auto-Discovery Plugin & Widget Loader (`src/core/loader.mjs`)**
   Automatically discovers `src/features/*/index.mjs` (pricing logic) and `src/features/*/widget.mjs` (UI card renderer) without any agent touching `src/server.mjs` or `src/index.mjs`.
3. **Frozen Contracts (`src/types/contracts.mjs`)**
   Validates both backend calculations (`validateAdjustment`) and UI widget payloads (`validateWidgetOutput`).
4. **Parallel Feature Slots (`src/features/*/`)**
   - `src/features/discount/` — Owned by `Agent-Discount`
   - `src/features/tax/` — Owned by `Agent-Tax`
   - `src/features/shipping/` — Owned by `Agent-Shipping`

## Quick Start

Start the interactive Web App (`http://localhost:3090`):
```bash
npm run serve
```

Run the CLI pipeline:
```bash
npm start
```

Run all unit tests:
```bash
npm test
```
