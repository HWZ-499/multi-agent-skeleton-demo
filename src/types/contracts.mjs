/**
 * Frozen Data Contracts for Multi-Agent Pricing Pipeline & Web Widgets.
 * DO NOT MODIFY THIS FILE IN FEATURE BRANCHES.
 */

/**
 * @typedef {Object} OrderContext
 * @property {string} orderId - Unique order identifier
 * @property {number} subtotal - Order subtotal in USD (>= 0)
 * @property {'VIP20'|'SAVE10'|'FLASH30'|''} couponCode - Optional promo coupon code
 * @property {'US-CA'|'US-NY'|'EU-DE'|'CN'|string} region - Tax region code
 * @property {number} weightKg - Total package weight in kilograms
 * @property {boolean} isExpress - Whether express shipping is requested
 */

/**
 * @typedef {Object} PluginAdjustment
 * @property {'discount'|'loyalty'|'tax'|'insurance'|'shipping'} pluginId - Must match plugin.id
 * @property {string} label - Non-empty human-readable description
 * @property {number} deltaAmount - Price adjustment in USD (<= 0 for discount/loyalty; >= 0 for tax/insurance/shipping)
 * @property {Record<string, unknown>} meta - Structured metadata for auditing
 */

/**
 * @typedef {Object} WidgetOutput
 * @property {'discount'|'loyalty'|'tax'|'insurance'|'shipping'} pluginId - Must match plugin.id
 * @property {string} title - Card title
 * @property {string} badge - Short status badge text
 * @property {string} summary - One-line summary text
 * @property {Array<{label: string, value: string}>} metrics - At least 2 key/value metric items
 * @property {string} html - Non-empty HTML fragment rendered inside the slot card
 */

const VALID_PLUGIN_IDS = new Set(['discount', 'loyalty', 'tax', 'insurance', 'shipping']);

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

  if ((adj.pluginId === 'discount' || adj.pluginId === 'loyalty') && adj.deltaAmount > 0) {
    throw new Error(`${adj.pluginId} deltaAmount must be <= 0, got ${adj.deltaAmount}`);
  }

  if (
    (adj.pluginId === 'tax' || adj.pluginId === 'insurance' || adj.pluginId === 'shipping') &&
    adj.deltaAmount < 0
  ) {
    throw new Error(`${adj.pluginId} deltaAmount must be >= 0, got ${adj.deltaAmount}`);
  }

  if (!adj.meta || typeof adj.meta !== 'object' || Array.isArray(adj.meta)) {
    throw new Error(`Adjustment for "${adj.pluginId}" must include a plain meta object`);
  }

  return adj;
}

/**
 * Validates that a feature slot widget conforms to the frozen UI contract.
 * @param {'discount'|'tax'|'shipping'} pluginId
 * @param {WidgetOutput} widget
 * @returns {WidgetOutput}
 */
export function validateWidgetOutput(pluginId, widget) {
  if (!widget || typeof widget !== 'object' || Array.isArray(widget)) {
    throw new TypeError(`Widget output for "${pluginId}" must be a non-null plain object`);
  }

  if (typeof widget.pluginId !== 'string' || widget.pluginId !== pluginId) {
    throw new Error(`Widget pluginId "${widget.pluginId}" must match "${pluginId}"`);
  }

  for (const field of ['title', 'badge', 'summary', 'html']) {
    if (typeof widget[field] !== 'string' || widget[field].trim().length === 0) {
      throw new Error(`Widget "${pluginId}" field "${field}" must be a non-empty string`);
    }
  }

  if (!Array.isArray(widget.metrics) || widget.metrics.length < 2) {
    throw new Error(`Widget "${pluginId}" must include a metrics array with at least 2 items`);
  }

  for (const [idx, item] of widget.metrics.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new TypeError(`Widget "${pluginId}" metric at index ${idx} must be a plain object`);
    }
    if (typeof item.label !== 'string' || item.label.trim().length === 0) {
      throw new Error(`Widget "${pluginId}" metric[${idx}].label must be a non-empty string`);
    }
    if (typeof item.value !== 'string' || item.value.trim().length === 0) {
      throw new Error(`Widget "${pluginId}" metric[${idx}].value must be a non-empty string`);
    }
  }

  return widget;
}
