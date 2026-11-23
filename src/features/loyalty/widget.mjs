import { roundCurrency } from '../../types/contracts.mjs';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatUsd(amount) {
  return `$${roundCurrency(amount).toFixed(2)}`;
}

/**
 * Displays recorded loyalty rewards and progress based on the original subtotal.
 * @param {import('../../types/contracts.mjs').PluginAdjustment} step
 * @param {import('../../types/contracts.mjs').OrderContext} orderContext
 * @returns {import('../../types/contracts.mjs').WidgetOutput}
 */
export function renderWidget(step, orderContext) {
  const { tier, pointsEarned } = step.meta;
  const { subtotal } = orderContext;
  const cashback = formatUsd(Math.abs(step.deltaAmount));
  const nextTier = subtotal < 100 ? { name: 'Gold', threshold: 100 }
    : subtotal < 200 ? { name: 'Platinum', threshold: 200 } : null;
  const progressHint = nextTier
    ? `${formatUsd(nextTier.threshold - subtotal)} more to ${nextTier.name}`
    : 'Highest tier unlocked';
  const progressValue = Math.min(200, Math.max(0, subtotal));
  const progressPercent = progressValue / 200 * 100;

  const tiersHtml = [
    { name: 'Standard', threshold: 0, benefit: '0% cashback' },
    { name: 'Gold', threshold: 100, benefit: '2% cashback' },
    { name: 'Platinum', threshold: 200, benefit: '5% cashback' },
  ].map(({ name, threshold, benefit }) => {
    const unlocked = subtotal >= threshold;
    const color = unlocked ? '#6ee7b7' : '#94a3b8';
    return `<div style="flex:1 1 120px;padding:10px;border:1px solid ${unlocked ? '#34d399' : '#334155'};border-radius:10px;background:#18233f;color:${color};">
      <strong>${name}</strong>
      <div style="font-size:0.78rem;margin-top:4px;">${formatUsd(threshold)} · ${benefit}</div>
      <div style="font-size:0.74rem;margin-top:4px;">${unlocked ? 'Unlocked' : 'Locked'}</div>
    </div>`;
  }).join('');

  const html = `<div style="display:flex;flex-direction:column;gap:12px;color:#e7eefc;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
      <strong>${escapeHtml(tier)}</strong>
      <span style="padding:4px 10px;border:1px solid #34d399;border-radius:999px;background:#12352f;color:#6ee7b7;font-size:0.74rem;font-weight:700;">Built by Codex</span>
    </div>
    <div style="font-size:0.82rem;color:#cbd5e1;">${escapeHtml(progressHint)}</div>
    <div role="progressbar" aria-label="Loyalty tier progress toward Platinum"
      aria-valuemin="0" aria-valuemax="200" aria-valuenow="${progressValue}"
      aria-valuetext="${escapeHtml(`${tier}. ${progressHint}`)}"
      style="height:10px;position:relative;overflow:hidden;border:1px solid #334155;border-radius:999px;background:#0f172a;">
      <div style="height:100%;width:${progressPercent}%;border-radius:999px;background:linear-gradient(90deg,#34d399,#60a5fa);"></div>
      <div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:#cbd5e1;"></div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">${tiersHtml}</div>
  </div>`;

  return {
    pluginId: 'loyalty',
    title: 'Loyalty Points & Cashback',
    badge: tier,
    summary: `${pointsEarned} pts earned with ${cashback} instant cashback. ${progressHint}.`,
    metrics: [
      { label: 'Points Earned', value: `${pointsEarned} pts` },
      { label: 'Cashback', value: cashback },
      { label: 'Agent Vendor', value: 'OpenAI Codex' },
    ],
    html,
  };
}
