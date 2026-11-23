import { roundCurrency } from '../../types/contracts.mjs';

/**
 * SLOT 2: Tax Plugin (Assigned to Agent-Tax)
 *
 * Specification:
 * 1. Set `implemented: true`.
 * 2. Implement `apply(ctx)` with the following region tax rates:
 *    - 'US-CA': 0.0825
 *    - 'US-NY': 0.08
 *    - 'EU-DE': 0.19
 *    - 'CN':    0.13
 *    - default fallback: 0.05
 * 3. Compute:
 *    - deltaAmount: roundCurrency(ctx.subtotal * rate)
 *    - label: `Tax (${ctx.region})`
 *    - meta: { region: ctx.region, rate }
 * 4. Return `{ pluginId: 'tax', label, deltaAmount, meta }`.
 * 5. Do NOT modify `id` or `order`.
 */
export const plugin = {
  id: 'tax',
  order: 20,
  implemented: false,

  /**
   * @param {import('../../types/contracts.mjs').OrderContext} ctx
   * @returns {import('../../types/contracts.mjs').PluginAdjustment}
   */
  apply(ctx) {
    void roundCurrency;
    void ctx;
    throw new Error('Tax slot not implemented yet');
  },
};
