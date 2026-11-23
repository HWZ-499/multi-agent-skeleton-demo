import { roundCurrency } from '../../types/contracts.mjs';

/**
 * SLOT 5: Transit Protection & Insurance Plugin (Assigned to OpenCode / Agent-OpenCode-Insurance)
 *
 * Specification:
 * 1. Set `implemented: true`. Keep `id: 'insurance'` and `order: 25` unchanged.
 * 2. Implement `apply(ctx)` with the following rules:
 *    - If `ctx.subtotal === 0`:
 *        deltaAmount = 0
 *        coveragePlan = 'No Coverage'
 *        surcharge = 0
 *    - Otherwise:
 *        Base protection rate is 1.5% of `ctx.subtotal` (`ctx.subtotal * 0.015`).
 *        Heavy/Express handling surcharge:
 *          surcharge = (ctx.isExpress === true || ctx.weightKg > 10) ? 2.5 : 0
 *        deltaAmount = roundCurrency(ctx.subtotal * 0.015 + surcharge)
 *        coveragePlan = (ctx.isExpress === true || ctx.weightKg > 10)
 *          ? 'Premium Transit Shield'
 *          : 'Standard Transit Shield'
 *    - Return:
 *      {
 *        pluginId: 'insurance',
 *        label: `Insurance (${coveragePlan})`,
 *        deltaAmount,
 *        meta: { coveragePlan, insuredValue: ctx.subtotal, surcharge }
 *      }
 * 3. Create `src/features/insurance/widget.mjs` exporting `renderWidget(step, orderContext)`:
 *    - Must pass `validateWidgetOutput('insurance', widget)` from `../../types/contracts.mjs`.
 *    - Must return `{ pluginId: 'insurance', title: 'Transit Protection & Insurance', badge, summary, metrics, html }`.
 *    - `metrics` must include at least:
 *      - `{ label: 'Coverage Plan', value: coveragePlan }`
 *      - `{ label: 'Insured Value', value: `$${orderContext.subtotal.toFixed(2)}` }`
 *      - `{ label: 'Agent Vendor', value: 'OpenCode' }`
 *    - `html` must include a visible badge `'Built by OpenCode'` and a coverage breakdown visualization.
 * 4. Create `src/features/insurance/index.test.mjs` using `node:test` and `node:assert/strict`.
 * 5. Do NOT modify any files outside `src/features/insurance/`.
 */
export const plugin = {
  id: 'insurance',
  order: 25,
  implemented: false,

  /**
   * @param {import('../../types/contracts.mjs').OrderContext} ctx
   * @returns {import('../../types/contracts.mjs').PluginAdjustment}
   */
  apply(ctx) {
    void roundCurrency;
    void ctx;
    throw new Error('Insurance slot not implemented yet (assigned to OpenCode)');
  },
};
