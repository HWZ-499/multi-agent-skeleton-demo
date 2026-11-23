/**
 * Frozen Data Contracts for Multi-Agent Pricing Pipeline.
 * DO NOT MODIFY THIS FILE IN FEATURE BRANCHES.
 */

/**
 * @typedef {Object} OrderContext
 * @property {string} orderId - Unique order identifier
 * @property {number} subtotal - Order subtotal in USD (>= 0)
 * @property {'VIP20'|'SAVE10'|''} couponCode - Optional promo coupon code
 * @property {'US-CA'|'US-NY'|'EU-DE'|'CN'|string} region - Tax region code
 * @property {number} weightKg - Total package weight in kilograms
 * @property {boolean} isExpress - Whether express shipping is requested
 */

/**
 * @typedef {Object} PluginAdjustment
 * @property {'discount'|'tax'|'shipping'} pluginId - Must match plugin.id
 * @property {string} label - Non-empty human-readable description
 * @property {number} deltaAmount - Price adjustment in USD (<= 0 for discount; >= 0 for tax/shipping)
 * @property {Record<string, unknown>} meta - Structured metadata for auditing
 */

const VALID_PLUGIN_IDS = new Set(['discount', 'tax', 'shipping']);

/**
 * Rounds a number to 2 decimal places for USD currency values.
 * @param {number} val
 * @returns {number}
 */
export function roundCurrency(val) {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    throw new TypeError(`roundCurrency expected a finite number, got: ${val}`);
  }
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Validates that a plugin's adjustment conforms to the frozen contract.
 * @param {PluginAdjustment} adj
 * @returns {PluginAdjustment}
 */
export function validateAdjustment(adj) {
  if (!adj || typeof adj !== 'object' || Array.isArray(adj)) {
    throw new TypeError('Adjustment must be a non-null plain object');
  }

  if (typeof adj.pluginId !== 'string' || !VALID_PLUGIN_IDS.has(adj.pluginId)) {
    throw new Error(
      `Invalid pluginId "${adj.pluginId}". Expected one of: ${Array.from(VALID_PLUGIN_IDS).join(', ')}`
    );
  }

  if (typeof adj.label !== 'string' || adj.label.trim().length === 0) {
    throw new Error(`Adjustment for "${adj.pluginId}" must include a non-empty label`);
  }

  if (typeof adj.deltaAmount !== 'number' || !Number.isFinite(adj.deltaAmount)) {
    throw new Error(`Adjustment deltaAmount for "${adj.pluginId}" must be a finite number`);
  }

  if (adj.pluginId === 'discount' && adj.deltaAmount > 0) {
    throw new Error(`Discount deltaAmount must be <= 0, got ${adj.deltaAmount}`);
  }

  if ((adj.pluginId === 'tax' || adj.pluginId === 'shipping') && adj.deltaAmount < 0) {
    throw new Error(`${adj.pluginId} deltaAmount must be >= 0, got ${adj.deltaAmount}`);
  }

  if (!adj.meta || typeof adj.meta !== 'object' || Array.isArray(adj.meta)) {
    throw new Error(`Adjustment for "${adj.pluginId}" must include a plain meta object`);
  }

  return adj;
}
