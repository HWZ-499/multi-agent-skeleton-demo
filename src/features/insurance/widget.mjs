import { roundCurrency, validateWidgetOutput } from '../../types/contracts.mjs';

const BASE_PROTECTION_RATE = 0.015;
const PREMIUM_SURCHARGE = 2.5;
const HEAVY_WEIGHT_THRESHOLD_KG = 10;

const PLAN_STYLES = {
  'Premium Transit Shield': {
    badge: 'PREMIUM SHIELD',
    accent: '#fbbf24',
    chipBg: 'rgba(251,191,36,0.16)',
    chipBorder: 'rgba(251,191,36,0.45)',
    chipText: '#fde68a',
    barGradient: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
  },
  'Standard Transit Shield': {
    badge: 'STANDARD SHIELD',
    accent: '#60a5fa',
    chipBg: 'rgba(96,165,250,0.16)',
    chipBorder: 'rgba(96,165,250,0.45)',
    chipText: '#bfdbfe',
    barGradient: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
  },
  'No Coverage': {
    badge: 'NO COVERAGE',
    accent: '#94a3b8',
    chipBg: 'rgba(148,163,184,0.16)',
    chipBorder: 'rgba(148,163,184,0.45)',
    chipText: '#cbd5e1',
    barGradient: 'linear-gradient(90deg, #475569, #94a3b8)',
  },
};

function formatUsd(amount) {
  return `$${amount.toFixed(2)}`;
}

/**
 * Resolves the coverage plan for an order context using the same rules as `plugin.apply`.
 * @param {{ subtotal: number, weightKg: number, isExpress: boolean }} order
 * @returns {'Premium Transit Shield' | 'Standard Transit Shield' | 'No Coverage'}
 */
function resolveCoveragePlan(order) {
  if (order.subtotal === 0) return 'No Coverage';
  return order.isExpress || order.weightKg > HEAVY_WEIGHT_THRESHOLD_KG
    ? 'Premium Transit Shield'
    : 'Standard Transit Shield';
}

/**
 * Renders the Transit Protection & Insurance slot UI widget for the Checkout & Pricing Studio.
 *
 * @param {{ pluginId?: string, status?: string, label?: string, deltaAmount?: number, meta?: { coveragePlan?: string, insuredValue?: number, surcharge?: number } }} step
 * @param {import('../../types/contracts.mjs').OrderContext} orderContext
 * @returns {import('../../types/contracts.mjs').WidgetOutput}
 */
export function renderWidget(step, orderContext) {
  const subtotal = Number.isFinite(orderContext?.subtotal)
    ? Math.max(0, orderContext.subtotal)
    : 0;
  const weightKg = Number.isFinite(orderContext?.weightKg)
    ? Math.max(0, orderContext.weightKg)
    : 0;
  const isExpress = orderContext?.isExpress === true;

  const computedPlan = resolveCoveragePlan({ subtotal, weightKg, isExpress });
  const metaPlan = step?.meta?.coveragePlan;
  const coveragePlan =
    typeof metaPlan === 'string' && metaPlan.trim().length > 0 ? metaPlan : computedPlan;

  const computedSurcharge =
    subtotal === 0 ? 0 : isExpress || weightKg > HEAVY_WEIGHT_THRESHOLD_KG ? PREMIUM_SURCHARGE : 0;
  const surcharge =
    typeof step?.meta?.surcharge === 'number' && Number.isFinite(step.meta.surcharge)
      ? Math.max(0, roundCurrency(step.meta.surcharge))
      : computedSurcharge;

  const totalFee =
    typeof step?.deltaAmount === 'number' && Number.isFinite(step.deltaAmount)
      ? Math.max(0, roundCurrency(step.deltaAmount))
      : Math.max(0, roundCurrency(subtotal * BASE_PROTECTION_RATE + computedSurcharge));

  const baseFee = Math.max(0, roundCurrency(totalFee - surcharge));
  const style = PLAN_STYLES[coveragePlan] ?? PLAN_STYLES['Standard Transit Shield'];

  const baseSharePct = totalFee > 0 ? Math.round((baseFee / totalFee) * 100) : 0;
  const surchargeSharePct = totalFee > 0 ? Math.max(0, 100 - baseSharePct) : 0;

  let summary;
  if (coveragePlan === 'No Coverage') {
    summary = `No transit protection added — the ${formatUsd(subtotal)} order subtotal leaves nothing to insure.`;
  } else if (coveragePlan === 'Premium Transit Shield') {
    summary = `Premium Transit Shield covers ${formatUsd(subtotal)} of goods: 1.5% base protection plus a ${formatUsd(surcharge)} heavy/express handling surcharge.`;
  } else {
    summary = `Standard Transit Shield covers ${formatUsd(subtotal)} of goods at 1.5% base protection, with no handling surcharge.`;
  }

  const metrics = [
    { label: 'Coverage Plan', value: coveragePlan },
    { label: 'Insured Value', value: formatUsd(subtotal) },
    { label: 'Protection Fee', value: formatUsd(totalFee) },
    {
      label: 'Handling Surcharge',
      value: surcharge > 0 ? formatUsd(surcharge) : 'Waived',
    },
    { label: 'Agent Vendor', value: 'OpenCode' },
  ];

  const feeCaption = `Base ${formatUsd(baseFee)} + Handling ${formatUsd(surcharge)}`;

  const html = [
    '<div style="display:flex;flex-direction:column;gap:12px;color:#e7eefc;">',
    '  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;">',
    `    <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:0.76rem;font-weight:700;letter-spacing:0.02em;background:${style.chipBg};border:1px solid ${style.chipBorder};color:${style.chipText};">${coveragePlan}</span>`,
    `    <span style="font-size:0.78rem;color:#93a4c8;">${feeCaption} = <strong style="color:${style.accent};">${formatUsd(totalFee)}</strong></span>`,
    '  </div>',
    '  <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">',
    '    <div style="background:#18233f;border:1px solid #263459;border-radius:10px;padding:8px 10px;">',
    '      <div style="font-size:0.68rem;letter-spacing:0.04em;text-transform:uppercase;color:#93a4c8;">Base Protection</div>',
    `      <div style="font-size:0.95rem;font-weight:700;color:#e7eefc;">${formatUsd(baseFee)}</div>`,
    '      <div style="font-size:0.68rem;color:#6f82a8;">1.5% of subtotal</div>',
    '    </div>',
    '    <div style="background:#18233f;border:1px solid #263459;border-radius:10px;padding:8px 10px;">',
    '      <div style="font-size:0.68rem;letter-spacing:0.04em;text-transform:uppercase;color:#93a4c8;">Handling Surcharge</div>',
    `      <div style="font-size:0.95rem;font-weight:700;color:#e7eefc;">${formatUsd(surcharge)}</div>`,
    `      <div style="font-size:0.68rem;color:#6f82a8;">${surcharge > 0 ? 'Express / heavy (> 10 kg)' : 'Not applicable'}</div>`,
    '    </div>',
    '    <div style="background:#18233f;border:1px solid #263459;border-radius:10px;padding:8px 10px;">',
    '      <div style="font-size:0.68rem;letter-spacing:0.04em;text-transform:uppercase;color:#93a4c8;">Insured Value</div>',
    `      <div style="font-size:0.95rem;font-weight:700;color:#e7eefc;">${formatUsd(subtotal)}</div>`,
    '      <div style="font-size:0.68rem;color:#6f82a8;">Full goods coverage</div>',
    '    </div>',
    '  </div>',
    '  <div style="background:#18233f;border:1px solid #263459;border-radius:10px;padding:10px 12px;">',
    '    <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;margin-bottom:7px;">',
    '      <span style="color:#93a4c8;font-weight:600;">Protection fee breakdown</span>',
    `      <span style="color:${style.accent};font-weight:700;">${formatUsd(totalFee)} total</span>`,
    '    </div>',
    '    <div style="display:flex;width:100%;height:10px;background:#0b1020;border:1px solid #263459;border-radius:999px;overflow:hidden;">',
    `      <div style="width:${baseSharePct}%;height:100%;background:${style.barGradient};"></div>`,
    `      <div style="width:${surchargeSharePct}%;height:100%;background:#8b5cf6;"></div>`,
    '    </div>',
    '    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:7px;font-size:0.7rem;color:#93a4c8;">',
    `      <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${style.accent};margin-right:5px;"></span>Base protection (${baseSharePct}%)</span>`,
    `      <span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:#8b5cf6;margin-right:5px;"></span>Handling surcharge (${surchargeSharePct}%)</span>`,
    '    </div>',
    '  </div>',
    '  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;">',
    `    <span style="font-size:0.72rem;color:#6f82a8;">Coverage tier: ${coveragePlan}</span>`,
    '    <span style="display:inline-flex;align-items:center;gap:5px;font-size:0.72rem;color:#818cf8;background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);border-radius:999px;padding:2px 8px;font-weight:600;">Built by OpenCode</span>',
    '  </div>',
    '</div>',
  ].join('\n');

  return validateWidgetOutput('insurance', {
    pluginId: 'insurance',
    title: 'Transit Protection & Insurance',
    badge: style.badge,
    summary,
    metrics,
    html,
  });
}
