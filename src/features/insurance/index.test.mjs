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
    orderId: 'order-insurance-1',
    subtotal: 100,
    couponCode: '',
    region: 'US-CA',
    weightKg: 3,
    isExpress: false,
    ...overrides,
  };
}

describe('Insurance Plugin', () => {
  it('exposes the expected frozen plugin metadata', () => {
    assert.equal(plugin.id, 'insurance');
    assert.equal(plugin.order, 25);
    assert.equal(plugin.implemented, true);
    assert.equal(typeof plugin.apply, 'function');
  });

  it('charges no insurance when the subtotal is zero', () => {
    const ctx = makeContext({ subtotal: 0, weightKg: 25, isExpress: true });
    const adj = plugin.apply(ctx);

    assert.deepEqual(adj, {
      pluginId: 'insurance',
      label: 'Insurance (No Coverage)',
      deltaAmount: 0,
      meta: { coveragePlan: 'No Coverage', insuredValue: 0, surcharge: 0 },
    });
    assert.deepEqual(validateAdjustment(adj), adj);
  });

  it('applies standard protection at 1.5% for a light ground shipment', () => {
    const ctx = makeContext({ subtotal: 100, weightKg: 5, isExpress: false });
    const adj = plugin.apply(ctx);

    assert.deepEqual(adj, {
      pluginId: 'insurance',
      label: 'Insurance (Standard Transit Shield)',
      deltaAmount: 1.5,
      meta: { coveragePlan: 'Standard Transit Shield', insuredValue: 100, surcharge: 0 },
    });
    assert.deepEqual(validateAdjustment(adj), adj);
  });

  it('stays on the standard plan at exactly 10 kg and rounds the fee correctly', () => {
    const ctx = makeContext({ subtotal: 33.33, weightKg: 10, isExpress: false });
    const adj = plugin.apply(ctx);

    assert.deepEqual(adj, {
      pluginId: 'insurance',
      label: 'Insurance (Standard Transit Shield)',
      deltaAmount: 0.5,
      meta: { coveragePlan: 'Standard Transit Shield', insuredValue: 33.33, surcharge: 0 },
    });
    assert.doesNotThrow(() => validateAdjustment(adj));
  });

  it('upgrades to premium protection for express shipments', () => {
    const ctx = makeContext({ subtotal: 200, weightKg: 2, isExpress: true });
    const adj = plugin.apply(ctx);

    assert.deepEqual(adj, {
      pluginId: 'insurance',
      label: 'Insurance (Premium Transit Shield)',
      deltaAmount: 5.5,
      meta: { coveragePlan: 'Premium Transit Shield', insuredValue: 200, surcharge: 2.5 },
    });
    assert.deepEqual(validateAdjustment(adj), adj);
  });

  it('upgrades to premium protection for packages heavier than 10 kg', () => {
    const ctx = makeContext({ subtotal: 250, weightKg: 12, isExpress: false });
    const adj = plugin.apply(ctx);

    assert.deepEqual(adj, {
      pluginId: 'insurance',
      label: 'Insurance (Premium Transit Shield)',
      deltaAmount: 6.25,
      meta: { coveragePlan: 'Premium Transit Shield', insuredValue: 250, surcharge: 2.5 },
    });
    assert.deepEqual(validateAdjustment(adj), adj);

    const justOver = plugin.apply(makeContext({ subtotal: 120, weightKg: 10.01, isExpress: false }));
    assert.equal(justOver.meta.coveragePlan, 'Premium Transit Shield');
    assert.equal(justOver.deltaAmount, 4.3);
    assert.doesNotThrow(() => validateAdjustment(justOver));
  });

  it('rounds fractional express totals to two decimal places', () => {
    const ctx = makeContext({ subtotal: 99.99, weightKg: 2, isExpress: true });
    const adj = plugin.apply(ctx);

    assert.deepEqual(adj, {
      pluginId: 'insurance',
      label: 'Insurance (Premium Transit Shield)',
      deltaAmount: 4,
      meta: { coveragePlan: 'Premium Transit Shield', insuredValue: 99.99, surcharge: 2.5 },
    });
    assert.deepEqual(validateAdjustment(adj), adj);
  });
});

describe('Insurance Widget (renderWidget)', () => {
  it('renders the no-coverage state for a zero subtotal', () => {
    const ctx = makeContext({ subtotal: 0, weightKg: 0, isExpress: false });
    const step = { ...plugin.apply(ctx), status: 'ACTIVE' };

    const widget = renderWidget(step, ctx);
    assert.deepEqual(validateWidgetOutput('insurance', widget), widget);

    assert.equal(widget.pluginId, 'insurance');
    assert.equal(widget.title, 'Transit Protection & Insurance');
    assert.equal(widget.badge, 'NO COVERAGE');
    assert.match(widget.summary, /No transit protection/i);
    assert.deepEqual(widget.metrics, [
      { label: 'Coverage Plan', value: 'No Coverage' },
      { label: 'Insured Value', value: '$0.00' },
      { label: 'Protection Fee', value: '$0.00' },
      { label: 'Handling Surcharge', value: 'Waived' },
      { label: 'Agent Vendor', value: 'OpenCode' },
    ]);
    assert.match(widget.html, /Built by OpenCode/);
    assert.match(widget.html, /width:0%/);
  });

  it('renders standard coverage with base-only fee breakdown', () => {
    const ctx = makeContext({ subtotal: 100, weightKg: 5, isExpress: false });
    const step = { ...plugin.apply(ctx), status: 'ACTIVE' };

    const widget = renderWidget(step, ctx);
    assert.deepEqual(validateWidgetOutput('insurance', widget), widget);

    assert.equal(widget.badge, 'STANDARD SHIELD');
    assert.match(widget.summary, /Standard Transit Shield/);
    assert.match(widget.summary, /\$100\.00/);

    assert.deepEqual(widget.metrics, [
      { label: 'Coverage Plan', value: 'Standard Transit Shield' },
      { label: 'Insured Value', value: '$100.00' },
      { label: 'Protection Fee', value: '$1.50' },
      { label: 'Handling Surcharge', value: 'Waived' },
      { label: 'Agent Vendor', value: 'OpenCode' },
    ]);

    assert.match(widget.html, /Built by OpenCode/);
    assert.match(widget.html, /Base \$1\.50 \+ Handling \$0\.00/);
    assert.match(widget.html, /Base protection \(100%\)/);
    assert.match(widget.html, /width:100%/);
    assert.match(widget.html, /background:#18233f/);
  });

  it('renders premium coverage for express shipping', () => {
    const ctx = makeContext({ subtotal: 200, weightKg: 2, isExpress: true });
    const step = { ...plugin.apply(ctx), status: 'ACTIVE' };

    const widget = renderWidget(step, ctx);
    assert.deepEqual(validateWidgetOutput('insurance', widget), widget);

    assert.equal(widget.badge, 'PREMIUM SHIELD');
    assert.match(widget.summary, /Premium Transit Shield/);
    assert.match(widget.summary, /\$2\.50 heavy\/express handling surcharge/);

    assert.deepEqual(widget.metrics, [
      { label: 'Coverage Plan', value: 'Premium Transit Shield' },
      { label: 'Insured Value', value: '$200.00' },
      { label: 'Protection Fee', value: '$5.50' },
      { label: 'Handling Surcharge', value: '$2.50' },
      { label: 'Agent Vendor', value: 'OpenCode' },
    ]);

    assert.match(widget.html, /Built by OpenCode/);
    assert.match(widget.html, /Express \/ heavy/);
    assert.match(widget.html, /Base protection \(55%\)/);
    assert.match(widget.html, /Handling surcharge \(45%\)/);
  });

  it('renders premium coverage for heavy packages with a 60/40 fee split', () => {
    const ctx = makeContext({ subtotal: 250, weightKg: 12, isExpress: false });
    const step = { ...plugin.apply(ctx), status: 'ACTIVE' };

    const widget = renderWidget(step, ctx);
    assert.deepEqual(validateWidgetOutput('insurance', widget), widget);

    assert.equal(widget.badge, 'PREMIUM SHIELD');
    assert.equal(widget.metrics[2].value, '$6.25');
    assert.equal(widget.metrics[3].value, '$2.50');
    assert.match(widget.html, /Base protection \(60%\)/);
    assert.match(widget.html, /Handling surcharge \(40%\)/);
  });

  it('honours step metadata when it is supplied by the pricing pipeline', () => {
    const ctx = makeContext({ subtotal: 80, weightKg: 1, isExpress: false });
    const step = {
      pluginId: 'insurance',
      status: 'ACTIVE',
      label: 'Insurance (Premium Transit Shield)',
      deltaAmount: 9.99,
      meta: { coveragePlan: 'Premium Transit Shield', insuredValue: 80, surcharge: 2.5 },
    };

    const widget = renderWidget(step, ctx);
    assert.deepEqual(validateWidgetOutput('insurance', widget), widget);

    assert.equal(widget.badge, 'PREMIUM SHIELD');
    assert.deepEqual(widget.metrics, [
      { label: 'Coverage Plan', value: 'Premium Transit Shield' },
      { label: 'Insured Value', value: '$80.00' },
      { label: 'Protection Fee', value: '$9.99' },
      { label: 'Handling Surcharge', value: '$2.50' },
      { label: 'Agent Vendor', value: 'OpenCode' },
    ]);
    assert.match(widget.html, /Built by OpenCode/);
  });

  it('falls back to computed values when step metadata is missing', () => {
    const ctx = makeContext({ subtotal: 50, weightKg: 4, isExpress: false });
    const widget = renderWidget(undefined, ctx);

    assert.deepEqual(validateWidgetOutput('insurance', widget), widget);
    assert.equal(widget.badge, 'STANDARD SHIELD');
    assert.equal(widget.metrics[2].value, '$0.75');
    assert.match(widget.html, /Built by OpenCode/);
  });
});
