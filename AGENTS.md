# Multi-Agent Collaboration Rules

This repository is structured as a **Slot-based Multi-Agent Full-Stack Skeleton** designed for conflict-free parallel development across isolated Git Worktrees.

## 1. Strict File Ownership (Territory Table)

Every agent is assigned **one** feature slot and must stay strictly within its directory:

| Agent Role | Assigned Branch | Exclusive Territory | Unit Test Command |
| :--- | :--- | :--- | :--- |
| **Agent-Discount** | `feat/vendor-claude-discount` | `src/features/discount/**` | `node --test src/features/discount/index.test.mjs` |
| **Agent-Codex-Loyalty** | `feat/codex-loyalty` | `src/features/loyalty/**` | `node --test src/features/loyalty/index.test.mjs` |
| **Agent-Tax** | `feat/vendor-gpt-tax` | `src/features/tax/**` | `node --test src/features/tax/index.test.mjs` |
| **Agent-OpenCode-Insurance** | `feat/opencode-insurance` | `src/features/insurance/**` | `node --test src/features/insurance/index.test.mjs` |
| **Agent-Shipping** | `feat/vendor-gemini-shipping` | `src/features/shipping/**` | `node --test src/features/shipping/index.test.mjs` |

## 2. Shared Hotspot Lock (Forbidden Files)

All agents are **strictly forbidden** from modifying any file outside their assigned territory, including:
- `package.json`
- `README.md`
- `AGENTS.md`
- `TASKS.md`
- `CLAUDE.md`
- `.cursorrules`
- `.github/copilot-instructions.md`
- `src/index.mjs`
- `src/server.mjs` (Web host server is frozen)
- `src/core/**` (auto-discovery loader is frozen)
- `src/types/**` (data & widget contracts are frozen)
- Any other agent's `src/features/<other>/**` folder

## 3. Feature Slot Contracts (`index.mjs` + `widget.mjs`)

1. **Read Before Coding**: Always read `AGENTS.md` and `src/types/contracts.mjs` first.
2. **Backend Logic (`src/features/<slot>/index.mjs`)**: Keep exported `plugin.id` and `plugin.order` intact, keep `implemented: true`, and pass `validateAdjustment(...)`.
3. **Frontend Widget (`src/features/<slot>/widget.mjs`)**: Export `renderWidget(step, orderContext)` returning `{ pluginId, title, badge, summary, metrics, html }` conforming to `validateWidgetOutput(pluginId, widget)` in `src/types/contracts.mjs`.
4. **Self-Contained Unit Tests**: Every agent must cover both `plugin.apply(ctx)` and `renderWidget(step, orderContext)` inside `src/features/<module>/index.test.mjs` using `node:test` and `node:assert/strict`.
5. **No Cross-Module Side Effects**: Do not run global formatters or modify git branches outside your assigned worktree.
