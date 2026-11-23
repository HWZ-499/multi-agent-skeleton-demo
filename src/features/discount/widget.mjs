import { roundCurrency } from '../../types/contracts.mjs';

const PROMO_TIERS = [
  { code: 'SAVE10', minSubtotal: 50, benefit: '$10 Off', requirement: 'SAVE10 >= $50' },
  { code: 'VIP20', minSubtotal: 100, benefit: '20% Off', requirement: 'VIP20 >= $100' },
  { code: 'FLASH30', minSubtotal: 200, benefit: '30% Off', requirement: 'FLASH30 >= $200' },
];

const MAX_TIER_SUBTOTAL = 200;

/**
 * Escapes HTML special characters for safe interpolation inside widget HTML.
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Formats a USD amount with two decimals.
 * @param {number} amount
 * @returns {string}
 */
function formatUsd(amount) {
  return `$${roundCurrency(amount).toFixed(2)}`;
}

/**
 * Builds status badge and one-line summary for the discount slot card.
 */
function buildStatusCopy({ subtotal, savings, savingsPct, appliedCoupon, requestedCoupon, tierStates, nextTier }) {
  const highestUnlocked = [...tierStates].reverse().find((t) => t.unlocked) || null;
  const requestedTier = tierStates.find((t) => t.code === requestedCoupon) || null;

  if (appliedCoupon) {
    const nextHint = nextTier
      ? `Add ${formatUsd(nextTier.needed)} more to unlock ${nextTier.code} (${nextTier.benefit}).`
      : 'All promo tiers unlocked.';
    return {
      badge: `${appliedCoupon} ACTIVE`,
      summary: `Applied ${appliedCoupon} (-${formatUsd(savings)}, ${savingsPct.toFixed(1)}% saved). ${nextHint}`,
    };
  }

  if (requestedTier && !requestedTier.unlocked) {
    return {
      badge: `${requestedTier.code} LOCKED`,
      summary: `Coupon ${requestedTier.code} requires ${formatUsd(requestedTier.minSubtotal)} subtotal — add ${formatUsd(requestedTier.needed)} more to unlock ${requestedTier.benefit}.`,
    };
  }

  if (requestedCoupon && !requestedTier) {
    const eligibilityHint = highestUnlocked
      ? `Subtotal ${formatUsd(subtotal)} qualifies for ${highestUnlocked.code} (${highestUnlocked.benefit})`
      : `Add ${formatUsd(tierStates[0].needed)} more to unlock ${tierStates[0].code}`;
    const nextHint = highestUnlocked && nextTier ? `; add ${formatUsd(nextTier.needed)} more for ${nextTier.code}.` : '.';
    return {
      badge: 'INVALID COUPON',
      summary: `Coupon "${requestedCoupon}" is not recognized. ${eligibilityHint}${nextHint}`,
    };
  }

  if (highestUnlocked) {
    const nextHint = nextTier
      ? `add ${formatUsd(nextTier.needed)} more for ${nextTier.code}.`
      : 'all promo tiers including FLASH30 are unlocked.';
    return {
      badge: 'TIER ELIGIBLE',
      summary: `No coupon selected. Subtotal ${formatUsd(subtotal)} qualifies for ${highestUnlocked.code} (${highestUnlocked.benefit}); ${nextHint}`,
    };
  }

  return {
    badge: 'NO DISCOUNT',
    summary: `No discount applied. Add ${formatUsd(tierStates[0].needed)} more to unlock ${tierStates[0].code} (${tierStates[0].benefit}).`,
  };
}

/**
 * Renders the Discount slot UI widget for the Checkout & Pricing Studio.
 *
 * @param {{ pluginId: string, status?: string, label?: string, deltaAmount?: number, meta?: { appliedCoupon?: string | null } }} step
 * @param {import('../../types/contracts.mjs').OrderContext} orderContext
 * @returns {import('../../types/contracts.mjs').WidgetOutput}
 */
export function renderWidget(step, orderContext) {
  const rawSubtotal = Number(orderContext?.subtotal);
  const subtotal = Number.isFinite(rawSubtotal) && rawSubtotal >= 0 ? roundCurrency(rawSubtotal) : 0;

  const requestedCoupon = typeof orderContext?.couponCode === 'string' ? orderContext.couponCode.trim() : '';
  const appliedCoupon =
    typeof step?.meta?.appliedCoupon === 'string' && step.meta.appliedCoupon.trim()
      ? step.meta.appliedCoupon.trim()
      : null;

  const rawDelta = Number(step?.deltaAmount);
  const savings = Number.isFinite(rawDelta) && rawDelta < 0 ? roundCurrency(-rawDelta) : 0;
  const savingsPct = subtotal > 0 && savings > 0 ? roundCurrency((savings / subtotal) * 100) : 0;

  const tierStates = PROMO_TIERS.map((tier) => {
    const unlocked = subtotal >= tier.minSubtotal;
    const needed = unlocked ? 0 : roundCurrency(tier.minSubtotal - subtotal);
    return {
      ...tier,
      unlocked,
      needed,
      isApplied: appliedCoupon === tier.code,
      isRequested: requestedCoupon === tier.code,
    };
  });

  const nextTier = tierStates.find((t) => !t.unlocked) || null;
  const requestedTier = tierStates.find((t) => t.code === requestedCoupon) || null;
  const progressPct = Math.min(100, Math.max(0, roundCurrency((subtotal / MAX_TIER_SUBTOTAL) * 100)));

  const { badge, summary } = buildStatusCopy({
    subtotal,
    savings,
    savingsPct,
    appliedCoupon,
    requestedCoupon,
    tierStates,
    nextTier,
  });

  let nextTierMetricValue = 'All Tiers Unlocked';
  if (requestedTier && !requestedTier.unlocked) {
    nextTierMetricValue = `${formatUsd(requestedTier.needed)} to ${requestedTier.code}`;
  } else if (nextTier) {
    nextTierMetricValue = `${formatUsd(nextTier.needed)} to ${nextTier.code}`;
  }

  const metrics = [
    { label: 'Savings', value: savings > 0 ? `-${formatUsd(savings)}` : '$0.00' },
    { label: 'Savings Rate', value: `${savingsPct.toFixed(1)}%` },
    {
      label: 'Active Coupon',
      value: appliedCoupon || (requestedCoupon ? `${requestedCoupon} (Unapplied)` : 'None'),
    },
    { label: 'Next Tier Gap', value: nextTierMetricValue },
    { label: 'Agent Vendor', value: 'Anthropic Claude 5.5' },
  ];

  const headerGoalText = nextTier
    ? `${formatUsd(nextTier.needed)} more to unlock ${nextTier.code}`
    : 'Max tier FLASH30 unlocked';

  const tierPillsHtml = tierStates
    .map((tier) => {
      let borderColor = '#263459';
      let bgColor = 'rgba(24, 35, 63, 0.72)';
      let titleColor = '#cbd5e1';
      let statusColor = '#93a4c8';
      let statusText = `Need ${formatUsd(tier.needed)} more`;

      if (tier.isApplied) {
        borderColor = 'rgba(52, 211, 153, 0.65)';
        bgColor = 'rgba(52, 211, 153, 0.14)';
        titleColor = '#6ee7b7';
        statusColor = '#34d399';
        statusText = `Applied · ${tier.benefit}`;
      } else if (tier.unlocked) {
        borderColor = 'rgba(96, 165, 250, 0.55)';
        bgColor = 'rgba(96, 165, 250, 0.12)';
        titleColor = '#bfdbfe';
        statusColor = '#93c5fd';
        statusText = `Unlocked · ${tier.benefit}`;
      } else if (tier.isRequested) {
        borderColor = 'rgba(251, 191, 36, 0.55)';
        bgColor = 'rgba(251, 191, 36, 0.12)';
        titleColor = '#fde68a';
        statusColor = '#fbbf24';
        statusText = `Need ${formatUsd(tier.needed)} more`;
      }

      return [
        `<div style="flex:1 1 155px;padding:9px 11px;border-radius:10px;border:1px solid ${borderColor};background:${bgColor};display:flex;flex-direction:column;gap:3px;">`,
        `<div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">`,
        `<span style="font-size:0.78rem;font-weight:700;color:${titleColor};">${escapeHtml(tier.requirement)}</span>`,
        `<span style="font-size:0.7rem;color:#93a4c8;font-weight:600;">${escapeHtml(tier.benefit)}</span>`,
        `</div>`,
        `<div style="font-size:0.74rem;font-weight:600;color:${statusColor};">${escapeHtml(statusText)}</div>`,
        `</div>`,
      ].join('');
    })
    .join('');

  const barGradient =
    appliedCoupon === 'FLASH30'
      ? 'linear-gradient(90deg, #34d399 0%, #60a5fa 55%, #a78bfa 100%)'
      : 'linear-gradient(90deg, #60a5fa 0%, #34d399 100%)';

  const html = [
    `<div style="display:flex;flex-direction:column;gap:10px;">`,
    `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:0.78rem;">`,
    `<span style="color:#cbd5e1;font-weight:600;">Subtotal Tier Progress: <strong style="color:#e7eefc;">${escapeHtml(formatUsd(subtotal))}</strong> / $200.00</span>`,
    `<span style="color:${nextTier ? '#93c5fd' : '#6ee7b7'};font-weight:600;">${escapeHtml(headerGoalText)}</span>`,
    `</div>`,
    `<div style="position:relative;height:10px;border-radius:999px;background:#0f172a;border:1px solid #263459;overflow:hidden;">`,
    `<div style="height:100%;width:${progressPct}%;border-radius:999px;background:${barGradient};transition:width 0.25s ease;"></div>`,
    `<div style="position:absolute;top:0;bottom:0;left:25%;width:1px;background:rgba(147,164,200,0.45);"></div>`,
    `<div style="position:absolute;top:0;bottom:0;left:50%;width:1px;background:rgba(147,164,200,0.45);"></div>`,
    `</div>`,
    `<div style="display:flex;flex-wrap:wrap;gap:8px;">`,
    tierPillsHtml,
    `</div>`,
    `<div style="align-self:flex-start;padding:3px 10px;border-radius:999px;border:1px solid rgba(167,139,250,0.55);background:rgba(167,139,250,0.14);color:#c4b5fd;font-size:0.7rem;font-weight:700;">Built by Anthropic Claude Sonnet 5.5</div>`,
    `</div>`,
  ].join('');

  return {
    pluginId: 'discount',
    title: 'Smart Promo & Coupon Engine',
    badge,
    summary,
    metrics,
    html,
  };
}
