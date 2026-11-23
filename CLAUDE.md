# CLAUDE.md — Anthropic Claude Code Rules

Read `AGENTS.md` and `src/types/contracts.mjs` before making any changes.

## Territory Ownership
- `src/features/discount/**` -> Discount slot only
- `src/features/loyalty/**` -> Loyalty slot (Codex) only
- `src/features/tax/**` -> Tax slot only
- `src/features/insurance/**` -> Insurance slot (OpenCode) only
- `src/features/shipping/**` -> Shipping slot only

## Strict Hotspot Lock (Do Not Modify)
- Never edit `package.json`, `README.md`, `AGENTS.md`, `TASKS.md`, `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`
- Never edit `src/index.mjs`, `src/server.mjs`, `src/core/**`, or `src/types/**`
- Never edit another slot's `src/features/<other>/**` folder

## Verification
- Always run `node --test src/features/<your-slot>/index.test.mjs` and confirm all tests pass.
- Do not modify files outside your assigned feature directory.
