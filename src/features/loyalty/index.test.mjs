import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { plugin } from './index.mjs';
import { renderWidget } from './widget.mjs';
import { validateAdjustment, validateWidgetOutput } from '../../types/contracts.mjs';

function makeOrder(subtotal, overrides = {}) {
  return {
    orderId: 'loyalty-test',
    subtotal,
    couponCode: '',
    region: 'US-CA',
    weightKg: 1,
    isExpress: false,
    ...overrides,
  };
}

const STANDARD = 'Standard Member (0% Cashback)';
const GOLD = 'Gold (2% Cashback)';
const PLATINUM = 'Platinum (5% Cashback)';

// Expected values are explicit to check thresholds, flooring and currency rounding.
const scenarios = [
  { subtotal: 0, tier: STANDARD, points: 0, delta: 0 },
  { subtotal: 45, tier: STANDARD, points: 450, delta: 0 },
  { subtotal: 99.99, tier: STANDARD, points: 999, delta: 0 },
  { subtotal: 99.999, tier: STANDARD, points: 999, delta: 0 },
  { subtotal: 100, tier: GOLD, points: 1000, delta: -2 },
  { subtotal: 101.29, tier: GOLD, points: 1012, delta: -2.03 },
  { subtotal: 199.99, tier: GOLD, points: 1999, delta: -4 },
  { subtotal: 199.999, tier: GOLD, points: 1999, delta: -4 },
  { subtotal: 200, tier: PLATINUM, points: 2000, delta: -10 },
  { subtotal: 233.35, tier: PLATINUM, points: 2333, delta: -11.67 },
  { subtotal: 500, tier: PLATINUM, points: 5000, delta: -25 },
];

describe('loyalty plugin', () => {
  it('preserves the slot identity and enables implementation', () => {
    assert.equal(plugin.id, 'loyalty');
    assert.equal(plugin.order, 15);
    assert.equal(plugin.implemented, true);
  });

  for (const { subtotal, tier, points, delta } of scenarios) {
    it(`returns the contracted adjustment for subtotal ${subtotal}`, () => {
      const result = plugin.apply(makeOrder(subtotal));
      assert.deepEqual(result, {
        pluginId: 'loyalty',
        label: `Loyalty: ${tier}`,
        deltaAmount: delta,
        meta: { tier, pointsEarned: points },
      });
      assert.equal(validateAdjustment(result), result);
    });
  }

  it('uses the original subtotal independently of other order options and leaves context intact', () => {
    const order = Object.freeze(makeOrder(200, {
      couponCode: 'FLASH30', region: 'EU-DE', weightKg: 20, isExpress: true,
    }));
    assert.deepEqual(plugin.apply(order), plugin.apply(makeOrder(200)));
  });
});

describe('loyalty widget', () => {
  for (const { subtotal, tier, points, delta } of scenarios) {
    it(`renders accurate, contracted tier and reward output for subtotal ${subtotal}`, () => {
      const order = makeOrder(subtotal);
      const step = { ...plugin.apply(order), status: 'ACTIVE' };
      const widget = renderWidget(step, order);
      assert.equal(validateWidgetOutput('loyalty', widget), widget);
      assert.equal(widget.pluginId, 'loyalty');
      assert.equal(widget.title, 'Loyalty Points & Cashback');
      assert.equal(widget.badge, tier);
      assert.ok(widget.summary.includes(`${points} pts`));
      assert.ok(widget.summary.includes(`$${Math.abs(delta).toFixed(2)}`));
      assert.ok(widget.metrics.some((m) => m.label === 'Points Earned' && m.value === `${points} pts`));
      assert.ok(widget.metrics.some((m) => m.label === 'Cashback' && m.value === `$${Math.abs(delta).toFixed(2)}`));
      assert.ok(widget.metrics.some((m) => m.label === 'Agent Vendor' && m.value === 'OpenAI Codex'));
      assert.match(widget.html, />Built by Codex<\/span>/);
      assert.match(widget.html, /role="progressbar"/);
      assert.match(widget.html, /aria-valuemin="0" aria-valuemax="200"/);
      assert.ok(widget.html.includes(`aria-valuenow="${Math.min(200, subtotal)}"`));
      assert.match(widget.html, /Standard/);
      assert.match(widget.html, /Gold/);
      assert.match(widget.html, /Platinum/);
    });
  }

  for (const { subtotal, expected } of [
    { subtotal: 0, expected: '$100.00 more to Gold' },
    { subtotal: 45, expected: '$55.00 more to Gold' },
    { subtotal: 100, expected: '$100.00 more to Platinum' },
    { subtotal: 199.99, expected: '$0.01 more to Platinum' },
    { subtotal: 200, expected: 'Highest tier unlocked' },
    { subtotal: 500, expected: 'Highest tier unlocked' },
  ]) {
    it(`shows the next tier or completion for subtotal ${subtotal}`, () => {
      const order = makeOrder(subtotal);
      const widget = renderWidget(plugin.apply(order), order);
      assert.ok(widget.summary.includes(expected));
      assert.ok(widget.html.includes(expected));
    });
  }

  it('caps the visual progress at Platinum', () => {
    const order = makeOrder(500);
    assert.match(renderWidget(plugin.apply(order), order).html, /width:100%/);
  });

  it('renders recorded rewards without mutating the pipeline step or context', () => {
    const order = Object.freeze(makeOrder(120));
    const step = Object.freeze({
      pluginId: 'loyalty', deltaAmount: -1.23,
      meta: Object.freeze({ tier: GOLD, pointsEarned: 456 }),
    });
    const widget = renderWidget(step, order);
    assert.ok(widget.metrics.some((m) => m.label === 'Points Earned' && m.value === '456 pts'));
    assert.ok(widget.metrics.some((m) => m.label === 'Cashback' && m.value === '$1.23'));
  });

  it('escapes tier metadata interpolated into HTML', () => {
    const order = makeOrder(120);
    const step = plugin.apply(order);
    step.meta.tier = '<img src=x onerror="alert(1)"> & \'tier\'';
    const widget = renderWidget(step, order);
    assert.doesNotMatch(widget.html, /<img/);
    assert.match(widget.html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; &#39;tier&#39;/);
  });
});
