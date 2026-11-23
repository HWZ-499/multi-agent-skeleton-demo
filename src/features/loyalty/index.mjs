import { roundCurrency } from '../../types/contracts.mjs';

/**
 * SLOT 4: Loyalty Points & Cashback Plugin (Assigned to Codex / Agent-Codex-Loyalty)
 *
 * Specification:
 * 1. Set `implemented: true`. Keep `id: 'loyalty'` and `order: 15` unchanged.
 * 2. Implement `apply(ctx)` with the following rules:
 *    - pointsEarned = Math.floor(ctx.subtotal * 10)
 *    - Automatic loyalty cashback tier based on `ctx.subtotal`:
 *      - If `ctx.subtotal >= 200` (Platinum Tier): 5% instant cashback
 *          deltaAmount: -roundCurrency(ctx.subtotal * 0.05)
 *          tier: 'Platinum (5% Cashback)'
 *      - Else if `ctx.subtotal >= 100` (Gold Tier): 2% instant cashback
 *          deltaAmount: -roundCurrency(ctx.subtotal * 0.02)
 *          tier: 'Gold (2% Cashback)'
 *      - Else (Standard Member Tier): $0 instant cashback
 *          deltaAmount: 0
 *          tier: 'Standard Member (0% Cashback)'
 *    - Return:
 *      {
 *        pluginId: 'loyalty',
 *        label: `Loyalty: ${tier}`,
 *        deltaAmount,
 *        meta: { tier, pointsEarned }
 *      }
 * 3. Create `src/features/loyalty/widget.mjs` exporting `renderWidget(step, orderContext)`:
 *    - Must pass `validateWidgetOutput('loyalty', widget)` from `../../types/contracts.mjs`.
 *    - Must return `{ pluginId: 'loyalty', title: 'Loyalty Points & Cashback', badge, summary, metrics, html }`.
 *    - `metrics` must include at least:
 *      - `{ label: 'Points Earned', value: `${pointsEarned} pts` }`
 *      - `{ label: 'Cashback', value: ... }`
 *      - `{ label: 'Agent Vendor', value: 'OpenAI Codex' }`
 *    - `html` must include a visible badge `'Built by Codex'` and a loyalty tier progress visualization.
 * 4. Create `src/features/loyalty/index.test.mjs` using `node:test` and `node:assert/strict`.
 * 5. Do NOT modify any files outside `src/features/loyalty/`.
 */
export const plugin = {
  id: 'loyalty',
  order: 15,
  implemented: false,

  /**
   * @param {import('../../types/contracts.mjs').OrderContext} ctx
   * @returns {import('../../types/contracts.mjs').PluginAdjustment}
   */
  apply(ctx) {
    void roundCurrency;
    void ctx;
    throw new Error('Loyalty slot not implemented yet (assigned to Codex)');
  },
};
