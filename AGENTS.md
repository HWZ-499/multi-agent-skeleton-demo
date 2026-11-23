# Multi-Agent Collaboration Rules

This repository is structured as a **Slot-based Multi-Agent Skeleton** designed for conflict-free parallel development across isolated Git Worktrees.

## 1. Strict File Ownership (Territory Table)

Every agent is assigned **one** feature slot and must stay strictly within its directory:

| Agent Role | Assigned Branch | Exclusive Territory | Unit Test Command |
| :--- | :--- | :--- | :--- |
| **Agent-Discount** | `feat/agent-discount` | `src/features/discount/**` | `node --test src/features/discount/index.test.mjs` |
| **Agent-Tax** | `feat/agent-tax` | `src/features/tax/**` | `node --test src/features/tax/index.test.mjs` |
| **Agent-Shipping** | `feat/agent-shipping` | `src/features/shipping/**` | `node --test src/features/shipping/index.test.mjs` |

## 2. Shared Hotspot Lock (Forbidden Files)

All agents are **strictly forbidden** from modifying any file outside their assigned territory, including:
- `package.json`
- `README.md`
- `AGENTS.md`
- `src/index.mjs`
- `src/core/**` (auto-discovery loader is frozen)
- `src/types/**` (data contracts are frozen)
- Any other agent's `src/features/<other>/**` folder

## 3. Implementation & Verification Rules

1. **Read Before Coding**: Always read `AGENTS.md`, `src/types/contracts.mjs`, and your slot's `index.mjs` stub file first.
2. **Keep Plugin Metadata Intact**: Do not rename the exported `plugin` object, or change `id` or `order`. Only set `implemented: true` and implement `apply(ctx)`.
3. **Self-Contained Unit Tests**: Every agent must create `src/features/<module>/index.test.mjs` using Node's built-in `node:test` and `node:assert/strict` modules and verify all tests pass before finishing.
4. **No Cross-Module Side Effects**: Do not run global formatters or modify git branches outside your assigned worktree.
