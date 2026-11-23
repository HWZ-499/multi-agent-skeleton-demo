import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { plugin } from './index.mjs';
import { renderWidget } from './widget.mjs';
import { validateAdjustment, validateWidgetOutput } from '../../types/contracts.mjs';

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

describe('Shipping Widget (renderWidget)', () => {
  it('renders standard shipping (< $100) with unlock progress, ground delivery window, and weight tier cost', () => {
    const ctx = makeContext({ subtotal: 45, weightKg: 3, isExpress: false });
    const adj = plugin.apply(ctx);
    const step = { ...adj, status: 'ACTIVE' };

    const widget = renderWidget(step, ctx);
    assert.deepEqual(validateWidgetOutput('shipping', widget), widget);

    assert.equal(widget.pluginId, 'shipping');
    assert.equal(widget.title, 'Logistics & Fulfillment Estimator');
    assert.equal(widget.badge, 'STANDARD GROUND');
    assert.match(widget.summary, /5-7 Business Days \(Ground\)/);
    assert.match(widget.summary, /\$55\.00/);

    assert.deepEqual(widget.metrics, [
      { label: 'Shipping Total', value: '$11.00' },
      { label: 'Delivery Window', value: '5-7 Business Days (Ground)' },
      { label: 'Weight Tier Cost', value: '$11.00 (3 kg)' },
      { label: 'Free Ground Unlock', value: '45%' },
    ]);

    assert.match(widget.html, /width:45%/);
    assert.match(widget.html, /5-7 Business Days \(Ground\)/);
    assert.match(widget.html, /\$55\.00 left/);
  });

  it('does not falsely unlock free shipping when subtotal is 99.60 even though rounded progress is 100%', () => {
    const ctx = makeContext({ subtotal: 99.6, weightKg: 1, isExpress: false });
    const adj = plugin.apply(ctx);
    const widget = renderWidget({ ...adj, status: 'ACTIVE' }, ctx);

    assert.deepEqual(validateWidgetOutput('shipping', widget), widget);
    assert.equal(widget.badge, 'STANDARD GROUND');
    assert.equal(widget.metrics[0].value, '$7.00');
    assert.equal(widget.metrics[3].value, '100%');
    assert.match(widget.html, /\$0\.40 left/);
  });

  it('renders free standard shipping (>= $100) with 100% progress and waived weight tier cost', () => {
    const ctx = makeContext({ subtotal: 120, weightKg: 2.5, isExpress: false });
    const adj = plugin.apply(ctx);
    const step = { ...adj, status: 'ACTIVE' };

    const widget = renderWidget(step, ctx);
    assert.deepEqual(validateWidgetOutput('shipping', widget), widget);

    assert.equal(widget.pluginId, 'shipping');
    assert.equal(widget.title, 'Logistics & Fulfillment Estimator');
    assert.equal(widget.badge, 'FREE GROUND');
    assert.match(widget.summary, /Free Standard Ground unlocked/);
    assert.match(widget.summary, /5-7 Business Days \(Ground\)/);

    assert.deepEqual(widget.metrics, [
      { label: 'Shipping Total', value: '$0.00 (FREE)' },
      { label: 'Delivery Window', value: '5-7 Business Days (Ground)' },
      { label: 'Weight Tier Cost', value: '$0.00 ($10.00 waived)' },
      { label: 'Free Ground Unlock', value: '100%' },
    ]);

    assert.match(widget.html, /width:100%/);
    assert.match(widget.html, /Unlocked \(100%\)/);
    assert.match(widget.html, /Free Ground · 5-7 Business Days \(Ground\)/);
  });

  it('renders express shipping for subtotal < $100 and subtotal >= $100', () => {
    const underCtx = makeContext({ subtotal: 80, weightKg: 2.5, isExpress: true });
    const underStep = { ...plugin.apply(underCtx), status: 'ACTIVE' };
    const underWidget = renderWidget(underStep, underCtx);

    assert.deepEqual(validateWidgetOutput('shipping', underWidget), underWidget);
    assert.equal(underWidget.pluginId, 'shipping');
    assert.equal(underWidget.title, 'Logistics & Fulfillment Estimator');
    assert.equal(underWidget.badge, 'EXPRESS AIR');
    assert.deepEqual(underWidget.metrics, [
      { label: 'Shipping Total', value: '$25.00' },
      { label: 'Delivery Window', value: '1-2 Business Days (Air)' },
      { label: 'Weight Tier Cost', value: '$10.00 (2.5 kg)' },
      { label: 'Free Ground Unlock', value: '80%' },
    ]);
    assert.match(underWidget.html, /Express Air · 1-2 Business Days \(Air\)/);
    assert.match(underWidget.html, /width:80%/);
    assert.match(underWidget.html, /Base \$10\.00 \+ Air \$15\.00/);

    const freeBaseCtx = makeContext({ subtotal: 120, weightKg: 2.5, isExpress: true });
    const freeBaseStep = { ...plugin.apply(freeBaseCtx), status: 'ACTIVE' };
    const freeBaseWidget = renderWidget(freeBaseStep, freeBaseCtx);

    assert.deepEqual(validateWidgetOutput('shipping', freeBaseWidget), freeBaseWidget);
    assert.equal(freeBaseWidget.badge, 'EXPRESS AIR');
    assert.deepEqual(freeBaseWidget.metrics, [
      { label: 'Shipping Total', value: '$15.00' },
      { label: 'Delivery Window', value: '1-2 Business Days (Air)' },
      { label: 'Weight Tier Cost', value: '$0.00 ($10.00 waived)' },
      { label: 'Free Ground Unlock', value: '100%' },
    ]);
    assert.match(freeBaseWidget.html, /width:100%/);
    assert.match(freeBaseWidget.html, /Unlocked \(100%\)/);
    assert.match(freeBaseWidget.html, /Base \$0\.00 \+ Air \$15\.00/);
  });
});
