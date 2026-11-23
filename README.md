# Multi-Agent Skeleton Demo

A practical reference repository demonstrating how multiple AI coding agents can develop features in parallel on the same codebase with **zero merge conflicts**.

## Core Architecture: Slot-Based Skeleton

Instead of letting agents edit shared entry points or invent inconsistent directory structures, this repository separates **frozen infrastructure** from **parallel fill-in-the-blank slots**:

1. **Auto-Discovery Plugin Loader (`src/core/loader.mjs`)**
   Dynamically scans `src/features/*/index.mjs`, sorts plugins by `order`, and executes them. Agents never touch `src/index.mjs` or register routes/handlers manually.
2. **Frozen Data Contracts (`src/types/contracts.mjs`)**
   Defines and runtime-validates the `OrderContext` input and `PluginAdjustment` output shapes (`roundCurrency`, `validateAdjustment`).
3. **Pre-Allocated Stub Slots (`src/features/*/index.mjs`)**
   Each module (`discount`, `tax`, `shipping`) starts as a typed stub with `implemented: false` and an explicit comment specification.
4. **Git Worktree Isolation + PR Integration**
   Each agent works in its own physical worktree (`wt-discount`, `wt-tax`, `wt-shipping`) on its own branch (`feat/agent-discount`, `feat/agent-tax`, `feat/agent-shipping`), and merges back to `main` via Pull Requests with zero conflicts.

## Directory Layout

```text
multi-agent-skeleton-demo/
├── AGENTS.md                       # Territory boundaries & hotspot lock rules
├── package.json                    # Zero-dependency Node.js ESM config
├── README.md
└── src/
    ├── index.mjs                   # Sample pipeline runner (frozen)
    ├── core/
    │   └── loader.mjs              # Auto-discovery pipeline loader (frozen)
    ├── types/
    │   └── contracts.mjs           # Shared currency & validation contracts (frozen)
    └── features/
        ├── discount/index.mjs      # Slot 1 -> Agent-Discount
        ├── tax/index.mjs           # Slot 2 -> Agent-Tax
        └── shipping/index.mjs      # Slot 3 -> Agent-Shipping
```

## Quick Start

Run the pipeline:
```bash
npm start
```

Run all unit tests:
```bash
npm test
```

## Multi-Agent Worktree Workflow

```bash
git worktree add ../wt-discount -b feat/agent-discount
git worktree add ../wt-tax -b feat/agent-tax
git worktree add ../wt-shipping -b feat/agent-shipping
```
