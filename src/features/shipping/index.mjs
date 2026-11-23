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
  implemented: false,

  /**
   * @param {import('../../types/contracts.mjs').OrderContext} ctx
   * @returns {import('../../types/contracts.mjs').PluginAdjustment}
   */
  apply(ctx) {
    void roundCurrency;
    void ctx;
    throw new Error('Shipping slot not implemented yet');
  },
};
