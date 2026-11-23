# GitHub Copilot Coding Agent Instructions

This repository uses a Slot-based Multi-Agent Architecture (`AGENTS.md`).

1. **Strict Slot Ownership**: Only modify files within your assigned `src/features/<slot>/` folder (`discount`, `tax`, or `shipping`).
2. **Forbidden Files**: Do not touch `package.json`, `src/server.mjs`, `src/index.mjs`, `src/core/**`, or `src/types/**`.
3. **Contract Compliance**: All `plugin.apply(ctx)` outputs must pass `validateAdjustment`, and all `renderWidget(step, orderContext)` outputs must pass `validateWidgetOutput` defined in `src/types/contracts.mjs`.
4. **Tests Required**: Add unit tests in `src/features/<slot>/index.test.mjs` using `node:test` and verify with `node --test`.
