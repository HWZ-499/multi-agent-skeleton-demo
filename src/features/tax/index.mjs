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
const TAX_RATES = new Map([
  ['US-CA', 0.0825],
  ['US-NY', 0.08],
  ['EU-DE', 0.19],
  ['CN', 0.13],
]);

const DEFAULT_TAX_RATE = 0.05;

export const plugin = {
  id: 'tax',
  order: 20,
  implemented: true,

  /**
   * @param {import('../../types/contracts.mjs').OrderContext} ctx
   * @returns {import('../../types/contracts.mjs').PluginAdjustment}
   */
  apply(ctx) {
    if (!ctx || typeof ctx !== 'object') {
      throw new TypeError('OrderContext must be an object');
    }
    if (typeof ctx.subtotal !== 'number' || !Number.isFinite(ctx.subtotal) || ctx.subtotal < 0) {
      throw new RangeError(`Order subtotal must be a finite non-negative number, got: ${ctx.subtotal}`);
    }

    const rate = TAX_RATES.get(ctx.region) ?? DEFAULT_TAX_RATE;
    const deltaAmount = roundCurrency(ctx.subtotal * rate);
    const label = `Tax (${ctx.region})`;

    return {
      pluginId: 'tax',
      label,
      deltaAmount,
      meta: {
        region: ctx.region,
        rate,
      },
    };
  },
};
