import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { plugin } from './index.mjs';
import { renderWidget } from './widget.mjs';
import { validateAdjustment, validateWidgetOutput } from '../../types/contracts.mjs';

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

  it('applies FLASH30 30% discount when subtotal is exactly 200', () => {
    const result = plugin.apply(makeOrder({ subtotal: 200, couponCode: 'FLASH30' }));
    assert.deepEqual(result, {
      pluginId: 'discount',
      label: 'FLASH30 (30% Off)',
      deltaAmount: -60,
      meta: { appliedCoupon: 'FLASH30' },
    });
    assert.equal(validateAdjustment(result), result);
  });

  it('applies FLASH30 30% discount with currency rounding above 200', () => {
    const result = plugin.apply(makeOrder({ subtotal: 233.35, couponCode: 'FLASH30' }));
    assert.deepEqual(result, {
      pluginId: 'discount',
      label: 'FLASH30 (30% Off)',
      deltaAmount: -70.01,
      meta: { appliedCoupon: 'FLASH30' },
    });
    assert.equal(validateAdjustment(result), result);
  });

  it('does not apply FLASH30 when subtotal is below 200', () => {
    const result = plugin.apply(makeOrder({ subtotal: 199.99, couponCode: 'FLASH30' }));
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

describe('discount widget', () => {
  it('renders valid widget output with FLASH30 active at $240', () => {
    const order = makeOrder({ subtotal: 240, couponCode: 'FLASH30' });
    const adj = plugin.apply(order);
    const widget = renderWidget({ ...adj, status: 'ACTIVE' }, order);

    assert.equal(validateWidgetOutput('discount', widget), widget);
    assert.equal(widget.pluginId, 'discount');
    assert.equal(widget.title, 'Smart Promo & Coupon Engine');
    assert.equal(widget.badge, 'FLASH30 ACTIVE');
    assert.match(widget.summary, /30\.0% saved/);
    assert.ok(widget.metrics.some((m) => m.label === 'Savings' && m.value === '-$72.00'));
    assert.ok(widget.metrics.some((m) => m.label === 'Savings Rate' && m.value === '30.0%'));
    assert.match(widget.html, /SAVE10 &gt;= \$50|SAVE10 >= \$50/);
    assert.match(widget.html, /VIP20 &gt;= \$100|VIP20 >= \$100/);
    assert.match(widget.html, /FLASH30 &gt;= \$200|FLASH30 >= \$200/);
    assert.match(widget.html, /width:100%/);
  });

  it('renders savings rate and remaining amount to unlock FLASH30 when VIP20 is active at $120', () => {
    const order = makeOrder({ subtotal: 120, couponCode: 'VIP20' });
    const adj = plugin.apply(order);
    const widget = renderWidget({ ...adj, status: 'ACTIVE' }, order);

    assert.equal(validateWidgetOutput('discount', widget), widget);
    assert.equal(widget.badge, 'VIP20 ACTIVE');
    assert.match(widget.summary, /\$80\.00 more to unlock FLASH30/);
    assert.ok(widget.metrics.some((m) => m.label === 'Savings Rate' && m.value === '20.0%'));
    assert.ok(widget.metrics.some((m) => m.label === 'Next Tier Gap' && m.value === '$80.00 to FLASH30'));
    assert.match(widget.html, /width:60%/);
    assert.match(widget.html, /Need \$80\.00 more/);
  });

  it('renders locked tier guidance for all thresholds when subtotal is $45 with SAVE10', () => {
    const order = makeOrder({ subtotal: 45, couponCode: 'SAVE10' });
    const adj = plugin.apply(order);
    const widget = renderWidget({ ...adj, status: 'ACTIVE' }, order);

    assert.equal(validateWidgetOutput('discount', widget), widget);
    assert.equal(widget.badge, 'SAVE10 LOCKED');
    assert.match(widget.summary, /add \$5\.00 more to unlock \$10 Off/);
    assert.ok(widget.metrics.some((m) => m.label === 'Savings Rate' && m.value === '0.0%'));
    assert.match(widget.html, /Need \$5\.00 more/);
    assert.match(widget.html, /Need \$55\.00 more/);
    assert.match(widget.html, /Need \$155\.00 more/);
  });

  it('handles zero subtotal and empty coupon cleanly without NaN', () => {
    const order = makeOrder({ subtotal: 0, couponCode: '' });
    const adj = plugin.apply(order);
    const widget = renderWidget({ ...adj, status: 'ACTIVE' }, order);

    assert.equal(validateWidgetOutput('discount', widget), widget);
    assert.equal(widget.badge, 'NO DISCOUNT');
    assert.ok(widget.metrics.some((m) => m.label === 'Savings Rate' && m.value === '0.0%'));
    assert.match(widget.summary, /\$50\.00 more to unlock SAVE10/);
    assert.doesNotMatch(widget.html, /NaN/);
  });
});
