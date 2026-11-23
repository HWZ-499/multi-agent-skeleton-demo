import { roundCurrency } from '../../types/contracts.mjs';

/**
 * SLOT 1: Discount Plugin (Assigned to Agent-Discount)
 *
 * Specification:
 * 1. Set `implemented: true`.
 * 2. Implement `apply(ctx)` with the following rules:
 *    - If `ctx.couponCode === 'VIP20'` and `ctx.subtotal >= 100`:
 *      20% discount ->
 *        deltaAmount: -roundCurrency(ctx.subtotal * 0.20)
 *        label: 'VIP20 (20% Off)'
 *        meta: { appliedCoupon: 'VIP20' }
 *    - Else if `ctx.couponCode === 'SAVE10'` and `ctx.subtotal >= 50`:
 *      $10 flat discount ->
 *        deltaAmount: -10
 *        label: 'SAVE10 ($10 Off)'
 *        meta: { appliedCoupon: 'SAVE10' }
 *    - Else:
 *        deltaAmount: 0
 *        label: 'No Discount'
 *        meta: { appliedCoupon: null }
 * 3. Return `{ pluginId: 'discount', label, deltaAmount, meta }`.
 * 4. Do NOT modify `id` or `order`.
 */
export const plugin = {
  id: 'discount',
  order: 10,
  implemented: false,

  /**
   * @param {import('../../types/contracts.mjs').OrderContext} ctx
   * @returns {import('../../types/contracts.mjs').PluginAdjustment}
   */
  apply(ctx) {
    void roundCurrency;
    void ctx;
    throw new Error('Discount slot not implemented yet');
  },
};
