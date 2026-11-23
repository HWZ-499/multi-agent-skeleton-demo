import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { plugin } from './index.mjs';
import { validateAdjustment } from '../../types/contracts.mjs';

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
