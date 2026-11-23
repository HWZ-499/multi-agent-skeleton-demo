import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { plugin } from './index.mjs';
import { validateAdjustment } from '../../types/contracts.mjs';

/**
 * Helper to create a valid OrderContext for tests.
 * @param {Partial<import('../../types/contracts.mjs').OrderContext>} overrides
 * @returns {import('../../types/contracts.mjs').OrderContext}
 */
function makeContext(overrides = {}) {
  return {
    orderId: 'order-shipping-1',
    subtotal: 50,
    couponCode: '',
    region: 'US-CA',
    weightKg: 3,
    isExpress: false,
    ...overrides,
  };
}

describe('Shipping Plugin', () => {
  it('exposes the expected frozen plugin metadata', () => {
    assert.equal(plugin.id, 'shipping');
    assert.equal(plugin.order, 30);
    assert.equal(plugin.implemented, true);
    assert.equal(typeof plugin.apply, 'function');
  });

  it('calculates standard shipping when subtotal < 100 and isExpress is false', () => {
    const ctx = makeContext({ subtotal: 50, weightKg: 3, isExpress: false });
    const adj = plugin.apply(ctx);

    assert.deepEqual(adj, {
      pluginId: 'shipping',
      label: 'Standard Shipping',
      deltaAmount: 11,
      meta: { baseShipping: 11, expressSurcharge: 0 },
    });
    assert.deepEqual(validateAdjustment(adj), adj);
  });

  it('rounds fractional weights and applies standard shipping just below threshold', () => {
    const ctx = makeContext({ subtotal: 99.99, weightKg: 1.234, isExpress: false });
    const adj = plugin.apply(ctx);

    assert.deepEqual(adj, {
      pluginId: 'shipping',
      label: 'Standard Shipping',
      deltaAmount: 7.47,
      meta: { baseShipping: 7.47, expressSurcharge: 0 },
    });
    assert.deepEqual(validateAdjustment(adj), adj);
  });

  it('grants free standard shipping when subtotal >= 100 and isExpress is false', () => {
    const atBoundary = plugin.apply(makeContext({ subtotal: 100, weightKg: 5, isExpress: false }));
    assert.deepEqual(atBoundary, {
      pluginId: 'shipping',
      label: 'Free Standard Shipping',
      deltaAmount: 0,
      meta: { baseShipping: 0, expressSurcharge: 0 },
    });
    assert.deepEqual(validateAdjustment(atBoundary), atBoundary);

    const aboveBoundary = plugin.apply(makeContext({ subtotal: 250, weightKg: 10, isExpress: false }));
    assert.deepEqual(aboveBoundary, {
      pluginId: 'shipping',
      label: 'Free Standard Shipping',
      deltaAmount: 0,
      meta: { baseShipping: 0, expressSurcharge: 0 },
    });
    assert.deepEqual(validateAdjustment(aboveBoundary), aboveBoundary);
  });

  it('charges $15 express shipping when subtotal >= 100 and isExpress is true', () => {
    const ctx = makeContext({ subtotal: 100, weightKg: 4, isExpress: true });
    const adj = plugin.apply(ctx);

    assert.deepEqual(adj, {
      pluginId: 'shipping',
      label: 'Express Shipping',
      deltaAmount: 15,
      meta: { baseShipping: 0, expressSurcharge: 15 },
    });
    assert.deepEqual(validateAdjustment(adj), adj);
  });

  it('charges base shipping + $15 express surcharge when subtotal < 100 and isExpress is true', () => {
    const ctx = makeContext({ subtotal: 80, weightKg: 2.5, isExpress: true });
    const adj = plugin.apply(ctx);

    assert.deepEqual(adj, {
      pluginId: 'shipping',
      label: 'Express Shipping',
      deltaAmount: 25,
      meta: { baseShipping: 10, expressSurcharge: 15 },
    });
    assert.deepEqual(validateAdjustment(adj), adj);
  });

  it('produces valid adjustments for zero weight edge cases', () => {
    const standardZeroWeight = plugin.apply(makeContext({ subtotal: 20, weightKg: 0, isExpress: false }));
    assert.deepEqual(standardZeroWeight, {
      pluginId: 'shipping',
      label: 'Standard Shipping',
      deltaAmount: 5,
      meta: { baseShipping: 5, expressSurcharge: 0 },
    });
    assert.doesNotThrow(() => validateAdjustment(standardZeroWeight));

    const expressZeroWeight = plugin.apply(makeContext({ subtotal: 20, weightKg: 0, isExpress: true }));
    assert.deepEqual(expressZeroWeight, {
      pluginId: 'shipping',
      label: 'Express Shipping',
      deltaAmount: 20,
      meta: { baseShipping: 5, expressSurcharge: 15 },
    });
    assert.doesNotThrow(() => validateAdjustment(expressZeroWeight));
  });
});
