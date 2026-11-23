import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { plugin } from './index.mjs';
import { validateAdjustment } from '../../types/contracts.mjs';

function makeOrder(overrides = {}) {
  return {
    orderId: 'ord-test-1',
    subtotal: 100,
    couponCode: '',
    region: 'US-CA',
    weightKg: 1,
    isExpress: false,
    ...overrides,
  };
}

describe('discount plugin', () => {
  it('preserves required plugin metadata and sets implemented: true', () => {
    assert.equal(plugin.id, 'discount');
    assert.equal(plugin.order, 10);
    assert.equal(plugin.implemented, true);
    assert.equal(typeof plugin.apply, 'function');
  });

  it('applies VIP20 20% discount when subtotal is exactly 100', () => {
    const result = plugin.apply(makeOrder({ subtotal: 100, couponCode: 'VIP20' }));
    assert.deepEqual(result, {
      pluginId: 'discount',
      label: 'VIP20 (20% Off)',
      deltaAmount: -20,
      meta: { appliedCoupon: 'VIP20' },
    });
    assert.equal(validateAdjustment(result), result);
  });

  it('applies VIP20 20% discount with currency rounding above 100', () => {
    const result = plugin.apply(makeOrder({ subtotal: 101.23, couponCode: 'VIP20' }));
    assert.deepEqual(result, {
      pluginId: 'discount',
      label: 'VIP20 (20% Off)',
      deltaAmount: -20.25,
      meta: { appliedCoupon: 'VIP20' },
    });
    assert.equal(validateAdjustment(result), result);
  });

  it('does not apply VIP20 when subtotal is below 100', () => {
    const result = plugin.apply(makeOrder({ subtotal: 99.99, couponCode: 'VIP20' }));
    assert.deepEqual(result, {
      pluginId: 'discount',
      label: 'No Discount',
      deltaAmount: 0,
      meta: { appliedCoupon: null },
    });
    assert.equal(validateAdjustment(result), result);
  });

  it('applies SAVE10 $10 flat discount when subtotal is exactly 50', () => {
    const result = plugin.apply(makeOrder({ subtotal: 50, couponCode: 'SAVE10' }));
    assert.deepEqual(result, {
      pluginId: 'discount',
      label: 'SAVE10 ($10 Off)',
      deltaAmount: -10,
      meta: { appliedCoupon: 'SAVE10' },
    });
    assert.equal(validateAdjustment(result), result);
  });

  it('applies SAVE10 $10 flat discount when subtotal is above 50', () => {
    const result = plugin.apply(makeOrder({ subtotal: 150, couponCode: 'SAVE10' }));
    assert.deepEqual(result, {
      pluginId: 'discount',
      label: 'SAVE10 ($10 Off)',
      deltaAmount: -10,
      meta: { appliedCoupon: 'SAVE10' },
    });
    assert.equal(validateAdjustment(result), result);
  });

  it('does not apply SAVE10 when subtotal is below 50', () => {
    const result = plugin.apply(makeOrder({ subtotal: 49.99, couponCode: 'SAVE10' }));
    assert.deepEqual(result, {
      pluginId: 'discount',
      label: 'No Discount',
      deltaAmount: 0,
      meta: { appliedCoupon: null },
    });
    assert.equal(validateAdjustment(result), result);
  });

  it('returns No Discount for empty coupon code', () => {
    const result = plugin.apply(makeOrder({ subtotal: 200, couponCode: '' }));
    assert.deepEqual(result, {
      pluginId: 'discount',
      label: 'No Discount',
      deltaAmount: 0,
      meta: { appliedCoupon: null },
    });
    assert.equal(validateAdjustment(result), result);
  });

  it('returns No Discount for unknown coupon code', () => {
    const result = plugin.apply(makeOrder({ subtotal: 200, couponCode: 'FREE99' }));
    assert.deepEqual(result, {
      pluginId: 'discount',
      label: 'No Discount',
      deltaAmount: 0,
      meta: { appliedCoupon: null },
    });
    assert.equal(validateAdjustment(result), result);
  });

  it('returns No Discount for zero subtotal with no coupon', () => {
    const result = plugin.apply(makeOrder({ subtotal: 0, couponCode: '' }));
    assert.deepEqual(result, {
      pluginId: 'discount',
      label: 'No Discount',
      deltaAmount: 0,
      meta: { appliedCoupon: null },
    });
    assert.equal(validateAdjustment(result), result);
  });
});
