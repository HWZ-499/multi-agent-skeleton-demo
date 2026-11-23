import { roundCurrency, validateAdjustment } from '../../types/contracts.mjs';

/** Base transit protection rate applied to the order subtotal. */
const BASE_PROTECTION_RATE = 0.015;

/** Handling surcharge for express shipments or unusually heavy packages. */
const PREMIUM_SURCHARGE = 2.5;

/** Weight above this threshold (in kg) triggers the premium plan. */
const HEAVY_WEIGHT_THRESHOLD_KG = 10;

/**
 * SLOT 5: Transit Protection & Insurance Plugin (Assigned to OpenCode / Agent-OpenCode-Insurance)
 *
 * Specification:
 * 1. `implemented: true`. `id: 'insurance'` and `order: 25` are frozen.
 * 2. `apply(ctx)`:
 *    - If `ctx.subtotal === 0`:
 *        deltaAmount = 0
 *        coveragePlan = 'No Coverage'
 *        surcharge = 0
 *    - Otherwise:
 *        Base protection rate is 1.5% of `ctx.subtotal`.
 *        Heavy/Express handling surcharge:
 *          surcharge = (ctx.isExpress === true || ctx.weightKg > 10) ? 2.5 : 0
 *        deltaAmount = roundCurrency(ctx.subtotal * 0.015 + surcharge)
 *        coveragePlan = (ctx.isExpress === true || ctx.weightKg > 10)
 *          ? 'Premium Transit Shield'
 *          : 'Standard Transit Shield'
 * 3. The adjustment conforms to `validateAdjustment(...)`.
 */
export const plugin = {
  id: 'insurance',
  order: 25,
  implemented: true,

  /**
   * @param {import('../../types/contracts.mjs').OrderContext} ctx
   * @returns {import('../../types/contracts.mjs').PluginAdjustment}
   */
  apply(ctx) {
    const subtotal =
      typeof ctx?.subtotal === 'number' && Number.isFinite(ctx.subtotal) ? ctx.subtotal : 0;
    const weightKg =
      typeof ctx?.weightKg === 'number' && Number.isFinite(ctx.weightKg) ? ctx.weightKg : 0;
    const isExpress = ctx?.isExpress === true;

    if (subtotal === 0) {
      return validateAdjustment({
        pluginId: 'insurance',
        label: 'Insurance (No Coverage)',
        deltaAmount: 0,
        meta: { coveragePlan: 'No Coverage', insuredValue: subtotal, surcharge: 0 },
      });
    }

    const needsPremium = isExpress || weightKg > HEAVY_WEIGHT_THRESHOLD_KG;
    const surcharge = needsPremium ? PREMIUM_SURCHARGE : 0;
    const coveragePlan = needsPremium ? 'Premium Transit Shield' : 'Standard Transit Shield';
    const deltaAmount = roundCurrency(subtotal * BASE_PROTECTION_RATE + surcharge);

    return validateAdjustment({
      pluginId: 'insurance',
      label: `Insurance (${coveragePlan})`,
      deltaAmount,
      meta: { coveragePlan, insuredValue: subtotal, surcharge },
    });
  },
};
