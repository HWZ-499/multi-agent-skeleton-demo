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
export const TAX_REGIMES = [
  { code: 'US-CA', rate: 0.0825, taxType: 'California Sales Tax' },
  { code: 'US-NY', rate: 0.08, taxType: 'New York Sales Tax' },
  { code: 'EU-DE', rate: 0.19, taxType: 'Germany EU VAT' },
  { code: 'CN', rate: 0.13, taxType: 'China VAT' },
  { code: 'US-TX', rate: 0.0625, taxType: 'Texas Sales Tax' },
  { code: 'SG', rate: 0.09, taxType: 'Singapore GST' },
];

export const DEFAULT_TAX_REGIME = {
  code: 'Other',
  rate: 0.05,
  taxType: 'Standard International Tax',
  isFallback: true,
};

const TAX_REGIMES_BY_CODE = new Map(TAX_REGIMES.map((regime) => [regime.code, regime]));

/**
 * Resolves the tax regime configuration for a given region code.
 * @param {string} region
 * @returns {{ code: string, rate: number, taxType: string, isFallback: boolean }}
 */
export function resolveTaxRegime(region) {
  const matched = TAX_REGIMES_BY_CODE.get(region);
  if (matched) {
    return { ...matched, isFallback: false };
  }
  return { ...DEFAULT_TAX_REGIME };
}

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

    const { rate } = resolveTaxRegime(ctx.region);
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
