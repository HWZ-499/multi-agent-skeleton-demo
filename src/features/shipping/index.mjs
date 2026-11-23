import { roundCurrency } from '../../types/contracts.mjs';

/**
 * SLOT 3: Shipping Plugin (Assigned to Agent-Shipping)
 *
 * Specification:
 * 1. Set `implemented: true`.
 * 2. Implement `apply(ctx)` with the following rules:
 *    - baseShipping = ctx.subtotal >= 100 ? 0 : roundCurrency(5 + ctx.weightKg * 2)
 *    - expressSurcharge = ctx.isExpress ? 15 : 0
 *    - deltaAmount = roundCurrency(baseShipping + expressSurcharge)
 *    - label = ctx.isExpress
 *        ? 'Express Shipping'
 *        : (baseShipping === 0 ? 'Free Standard Shipping' : 'Standard Shipping')
 *    - meta = { baseShipping, expressSurcharge }
 * 3. Return `{ pluginId: 'shipping', label, deltaAmount, meta }`.
 * 4. Do NOT modify `id` or `order`.
 */
export const plugin = {
  id: 'shipping',
  order: 30,
  implemented: true,

  /**
   * @param {import('../../types/contracts.mjs').OrderContext} ctx
   * @returns {import('../../types/contracts.mjs').PluginAdjustment}
   */
  apply(ctx) {
    const baseShipping = ctx.subtotal >= 100 ? 0 : roundCurrency(5 + ctx.weightKg * 2);
    const expressSurcharge = ctx.isExpress ? 15 : 0;
    const deltaAmount = roundCurrency(baseShipping + expressSurcharge);
    const label = ctx.isExpress
      ? 'Express Shipping'
      : baseShipping === 0
        ? 'Free Standard Shipping'
        : 'Standard Shipping';

    return {
      pluginId: 'shipping',
      label,
      deltaAmount,
      meta: { baseShipping, expressSurcharge },
    };
  },
};
