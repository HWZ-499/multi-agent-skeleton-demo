import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { plugin } from './index.mjs';
import { renderWidget } from './widget.mjs';
import { validateAdjustment, validateWidgetOutput } from '../../types/contracts.mjs';

function makeOrder(overrides = {}) {
  return {
    orderId: 'ORD-TEST-001',
    subtotal: 100,
    couponCode: '',
    region: 'US-CA',
    weightKg: 1,
    isExpress: false,
    ...overrides,
  };
}

describe('Tax Plugin (Slot 2)', () => {
  it('preserves slot metadata and marks plugin as implemented', () => {
    assert.equal(plugin.id, 'tax');
    assert.equal(plugin.order, 20);
    assert.equal(plugin.implemented, true);
    assert.equal(typeof plugin.apply, 'function');
  });

  const regionCases = [
    { region: 'US-CA', subtotal: 100, expectedRate: 0.0825, expectedDelta: 8.25 },
    { region: 'US-NY', subtotal: 100, expectedRate: 0.08, expectedDelta: 8 },
    { region: 'EU-DE', subtotal: 100, expectedRate: 0.19, expectedDelta: 19 },
    { region: 'CN', subtotal: 100, expectedRate: 0.13, expectedDelta: 13 },
    { region: 'UK', subtotal: 100, expectedRate: 0.05, expectedDelta: 5 },
    { region: 'JP', subtotal: 200, expectedRate: 0.05, expectedDelta: 10 },
  ];

  for (const { region, subtotal, expectedRate, expectedDelta } of regionCases) {
    it(`computes tax for region ${region} (rate ${expectedRate}) and passes validateAdjustment`, () => {
      const ctx = makeOrder({ region, subtotal });
      const adj = plugin.apply(ctx);

      assert.deepEqual(adj, {
        pluginId: 'tax',
        label: `Tax (${region})`,
        deltaAmount: expectedDelta,
        meta: {
          region,
          rate: expectedRate,
        },
      });
      assert.deepEqual(validateAdjustment(adj), adj);
    });
  }

  it('rounds currency to 2 decimal places and handles zero subtotal', () => {
    const roundedAdj = plugin.apply(makeOrder({ region: 'US-CA', subtotal: 19.99 }));
    assert.equal(roundedAdj.deltaAmount, 1.65);
    assert.deepEqual(validateAdjustment(roundedAdj), roundedAdj);

    const halfUpAdj = plugin.apply(makeOrder({ region: 'US-CA', subtotal: 10 }));
    assert.equal(halfUpAdj.deltaAmount, 0.83);
    assert.deepEqual(validateAdjustment(halfUpAdj), halfUpAdj);

    const zeroAdj = plugin.apply(makeOrder({ region: 'EU-DE', subtotal: 0 }));
    assert.equal(zeroAdj.deltaAmount, 0);
    assert.deepEqual(validateAdjustment(zeroAdj), zeroAdj);
  });

  it('rejects invalid order contexts and negative or non-finite subtotals', () => {
    assert.throws(() => plugin.apply(null), TypeError);
    assert.throws(() => plugin.apply(makeOrder({ subtotal: -10 })), RangeError);
    assert.throws(() => plugin.apply(makeOrder({ subtotal: Number.NaN })), RangeError);
  });
});

describe('Tax Widget (Slot 2)', () => {
  const widgetCases = [
    {
      region: 'US-CA',
      subtotal: 120,
      expectedTaxType: 'California Sales Tax',
      expectedRatePct: '8.25%',
      expectedTableRegion: 'US-CA',
    },
    {
      region: 'US-NY',
      subtotal: 100,
      expectedTaxType: 'New York Sales Tax',
      expectedRatePct: '8%',
      expectedTableRegion: 'US-NY',
    },
    {
      region: 'EU-DE',
      subtotal: 240,
      expectedTaxType: 'Germany EU VAT',
      expectedRatePct: '19%',
      expectedTableRegion: 'EU-DE',
    },
    {
      region: 'CN',
      subtotal: 150,
      expectedTaxType: 'China VAT',
      expectedRatePct: '13%',
      expectedTableRegion: 'CN',
    },
    {
      region: 'JP',
      subtotal: 100,
      expectedTaxType: 'Standard International Tax',
      expectedRatePct: '5%',
      expectedTableRegion: 'Other',
    },
    {
      region: 'UK',
      subtotal: 80,
      expectedTaxType: 'Standard International Tax',
      expectedRatePct: '5%',
      expectedTableRegion: 'Other',
    },
  ];

  for (const { region, subtotal, expectedTaxType, expectedRatePct, expectedTableRegion } of widgetCases) {
    it(`renders valid widget for ${region} (${expectedTaxType} @ ${expectedRatePct})`, () => {
      const ctx = makeOrder({ region, subtotal });
      const adj = plugin.apply(ctx);
      const step = { ...adj, status: 'ACTIVE' };
      const widget = renderWidget(step, ctx);

      assert.deepEqual(validateWidgetOutput('tax', widget), widget);
      assert.equal(widget.pluginId, 'tax');
      assert.equal(widget.title, 'Global Tax & VAT Compliance');
      assert.match(widget.badge, new RegExp(expectedRatePct.replace('.', '\\.')));
      assert.match(widget.summary, new RegExp(expectedTaxType));
      assert.match(widget.summary, new RegExp(expectedRatePct.replace('.', '\\.')));

      const metricValues = widget.metrics.map((m) => `${m.label}:${m.value}`);
      assert.ok(metricValues.some((entry) => entry.includes(expectedTaxType)));
      assert.ok(metricValues.some((entry) => entry.includes(expectedRatePct)));

      assert.match(widget.html, /role="progressbar"/);
      assert.match(widget.html, /style="/);
      for (const tableRegion of ['US-CA', 'US-NY', 'EU-DE', 'CN', 'Other']) {
        assert.match(widget.html, new RegExp(`data-region="${tableRegion}"`));
      }

      assert.match(
        widget.html,
        new RegExp(`data-region="${expectedTableRegion}" data-active="true"`),
      );
      const activeMatches = widget.html.match(/data-active="true"/g) ?? [];
      assert.equal(activeMatches.length, 1);
    });
  }

  it('handles missing orderContext and escapes untrusted region strings in HTML', () => {
    const widget = renderWidget({
      pluginId: 'tax',
      status: 'ACTIVE',
      label: 'Tax (<script>alert(1)</script>)',
      deltaAmount: 5,
      meta: { region: '<script>alert(1)</script>', rate: 0.05 },
    });

    assert.deepEqual(validateWidgetOutput('tax', widget), widget);
    assert.doesNotMatch(widget.html, /<script>/);
    assert.match(widget.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(widget.html, /data-region="Other" data-active="true"/);
  });
});
