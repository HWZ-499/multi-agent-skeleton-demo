import { roundCurrency } from '../../types/contracts.mjs';

/**
 * SLOT 1: Discount Plugin (Assigned to Agent-Discount)
 *
 * Specification:
 * 1. Set `implemented: true`.
 * 2. Implement `apply(ctx)` with the following rules:
 *    - If `ctx.couponCode === 'FLASH30'` and `ctx.subtotal >= 200`:
 *      30% discount ->
 *        deltaAmount: -roundCurrency(ctx.subtotal * 0.30)
 *        label: 'FLASH30 (30% Off)'
 *        meta: { appliedCoupon: 'FLASH30' }
 *    - Else if `ctx.couponCode === 'VIP20'` and `ctx.subtotal >= 100`:
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
  implemented: true,

  /**
   * @param {import('../../types/contracts.mjs').OrderContext} ctx
   * @returns {import('../../types/contracts.mjs').PluginAdjustment}
   */
  apply(ctx) {
    if (ctx.couponCode === 'FLASH30' && ctx.subtotal >= 200) {
      return {
        pluginId: 'discount',
        label: 'FLASH30 (30% Off)',
        deltaAmount: -roundCurrency(ctx.subtotal * 0.30),
        meta: { appliedCoupon: 'FLASH30' },
      };
    }

    if (ctx.couponCode === 'VIP20' && ctx.subtotal >= 100) {
      return {
        pluginId: 'discount',
        label: 'VIP20 (20% Off)',
        deltaAmount: -roundCurrency(ctx.subtotal * 0.20),
        meta: { appliedCoupon: 'VIP20' },
      };
    }

    if (ctx.couponCode === 'SAVE10' && ctx.subtotal >= 50) {
      return {
        pluginId: 'discount',
        label: 'SAVE10 ($10 Off)',
        deltaAmount: -10,
        meta: { appliedCoupon: 'SAVE10' },
      };
    }

    return {
      pluginId: 'discount',
      label: 'No Discount',
      deltaAmount: 0,
      meta: { appliedCoupon: null },
    };
  },
};
