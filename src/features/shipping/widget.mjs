import { roundCurrency } from '../../types/contracts.mjs';

const FREE_SHIPPING_THRESHOLD = 100;
const BASE_HANDLING_FEE = 5;
const PER_KG_RATE = 2;
const EXPRESS_SURCHARGE = 15;

/**
 * Renders the Shipping slot UI widget for the Checkout & Pricing Studio.
 *
 * @param {{ pluginId?: string, status?: string, label?: string, deltaAmount?: number, meta?: { baseShipping?: number, expressSurcharge?: number } }} step
 * @param {import('../../types/contracts.mjs').OrderContext} orderContext
 * @returns {import('../../types/contracts.mjs').WidgetOutput}
 */
export function renderWidget(step, orderContext) {
  const subtotal = Number.isFinite(orderContext?.subtotal) ? Math.max(0, orderContext.subtotal) : 0;
  const weightKg = Number.isFinite(orderContext?.weightKg) ? Math.max(0, orderContext.weightKg) : 0;
  const isExpress = Boolean(orderContext?.isExpress);

  const isFreeGroundUnlocked = subtotal >= FREE_SHIPPING_THRESHOLD;
  const weightTierCost = roundCurrency(BASE_HANDLING_FEE + weightKg * PER_KG_RATE);

  const baseShipping =
    typeof step?.meta?.baseShipping === 'number' && Number.isFinite(step.meta.baseShipping)
      ? roundCurrency(step.meta.baseShipping)
      : isFreeGroundUnlocked
        ? 0
        : weightTierCost;

  const expressSurcharge =
    typeof step?.meta?.expressSurcharge === 'number' && Number.isFinite(step.meta.expressSurcharge)
      ? roundCurrency(step.meta.expressSurcharge)
      : isExpress
        ? EXPRESS_SURCHARGE
        : 0;

  const totalShipping =
    typeof step?.deltaAmount === 'number' && Number.isFinite(step.deltaAmount)
      ? roundCurrency(step.deltaAmount)
      : roundCurrency(baseShipping + expressSurcharge);

  const unlockProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const remainingForFree = isFreeGroundUnlocked
    ? 0
    : roundCurrency(Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal));

  const deliveryWindow = isExpress ? '1-2 Business Days (Air)' : '5-7 Business Days (Ground)';

  const badge = isExpress
    ? 'EXPRESS AIR'
    : isFreeGroundUnlocked
      ? 'FREE GROUND'
      : 'STANDARD GROUND';

  let summary;
  if (isExpress) {
    summary = isFreeGroundUnlocked
      ? `Express Air (${deliveryWindow}) — base ground fee waived, $${expressSurcharge.toFixed(2)} air surcharge applied.`
      : `Express Air (${deliveryWindow}) — $${baseShipping.toFixed(2)} weight tier (${weightKg} kg) + $${expressSurcharge.toFixed(2)} air surcharge.`;
  } else if (isFreeGroundUnlocked) {
    summary = `Free Standard Ground unlocked (${deliveryWindow}) — $${weightTierCost.toFixed(2)} weight tier waived for orders ≥ $${FREE_SHIPPING_THRESHOLD}.`;
  } else {
    summary = `Standard Ground (${deliveryWindow}) — add $${remainingForFree.toFixed(2)} more to unlock free standard shipping.`;
  }

  const metrics = [
    {
      label: 'Shipping Total',
      value: totalShipping === 0 ? '$0.00 (FREE)' : `$${totalShipping.toFixed(2)}`,
    },
    {
      label: 'Delivery Window',
      value: deliveryWindow,
    },
    {
      label: 'Weight Tier Cost',
      value: isFreeGroundUnlocked
        ? `$0.00 ($${weightTierCost.toFixed(2)} waived)`
        : `$${weightTierCost.toFixed(2)} (${weightKg} kg)`,
    },
    {
      label: 'Free Ground Unlock',
      value: `${unlockProgress}%`,
    },
  ];

  const speedBadgeStyle = isExpress
    ? 'background:rgba(251,191,36,0.16);border:1px solid rgba(251,191,36,0.45);color:#fde68a;'
    : isFreeGroundUnlocked
      ? 'background:rgba(52,211,153,0.16);border:1px solid rgba(52,211,153,0.45);color:#6ee7b7;'
      : 'background:rgba(96,165,250,0.16);border:1px solid rgba(96,165,250,0.45);color:#bfdbfe;';

  const speedBadgeText = isExpress
    ? `Express Air · ${deliveryWindow}`
    : isFreeGroundUnlocked
      ? `Free Ground · ${deliveryWindow}`
      : `Standard Ground · ${deliveryWindow}`;

  const progressBarGradient = isFreeGroundUnlocked
    ? 'linear-gradient(90deg, #10b981, #34d399)'
    : 'linear-gradient(90deg, #3b82f6, #60a5fa)';

  const progressStatusHtml = isFreeGroundUnlocked
    ? `<span style="color:#34d399;font-weight:700;">Unlocked (${unlockProgress}%)</span>`
    : `<span style="color:#93c5fd;font-weight:700;">${unlockProgress}% · $${remainingForFree.toFixed(2)} left</span>`;

  const feeBreakdownText = isExpress
    ? `Base $${baseShipping.toFixed(2)} + Air $${expressSurcharge.toFixed(2)}`
    : `Rate: $${BASE_HANDLING_FEE.toFixed(2)} + ${weightKg} kg × $${PER_KG_RATE.toFixed(2)}/kg`;

  const html = [
    '<div style="display:flex;flex-direction:column;gap:12px;color:#e7eefc;">',
    '  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;">',
    `    <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:0.76rem;font-weight:700;letter-spacing:0.02em;${speedBadgeStyle}">${speedBadgeText}</span>`,
    `    <span style="font-size:0.78rem;color:#93a4c8;">${feeBreakdownText}</span>`,
    '  </div>',
    '  <div style="background:#18233f;border:1px solid #263459;border-radius:10px;padding:10px 12px;">',
    '    <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.78rem;margin-bottom:7px;">',
    `      <span style="color:#93a4c8;font-weight:600;">Free Standard Shipping ($${FREE_SHIPPING_THRESHOLD} threshold)</span>`,
    `      ${progressStatusHtml}`,
    '    </div>',
    '    <div style="width:100%;height:10px;background:#0b1020;border:1px solid #263459;border-radius:999px;overflow:hidden;">',
    `      <div style="width:${unlockProgress}%;height:100%;background:${progressBarGradient};border-radius:999px;transition:width 0.25s ease;"></div>`,
    '    </div>',
    '  </div>',
    '</div>',
  ].join('\n');

  return {
    pluginId: 'shipping',
    title: 'Logistics & Fulfillment Estimator',
    badge,
    summary,
    metrics,
    html,
  };
}
