import { roundCurrency, validateWidgetOutput } from '../../types/contracts.mjs';
import { DEFAULT_TAX_REGIME, TAX_REGIMES, resolveTaxRegime } from './index.mjs';

const MAX_METER_RATE = 0.2;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRatePercent(rate) {
  return `${Number((rate * 100).toFixed(4))}%`;
}

function formatUsd(amount) {
  return `$${amount.toFixed(2)}`;
}

function buildRateMeterHtml({ taxType, region, ratePercent, meterWidthPct, deltaAmount }) {
  return (
    `<div style="background: rgba(24, 35, 63, 0.72); border: 1px solid #263459; border-radius: 10px; padding: 12px;">` +
      `<div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px;">` +
        `<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">` +
          `<span style="font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.05em; color: #93a4c8; font-weight: 700;">Tax Rate Meter</span>` +
          `<span style="font-size: 0.82rem; color: #e7eefc; font-weight: 600;">${escapeHtml(taxType)}</span>` +
          `<span style="font-size: 0.72rem; padding: 2px 7px; border-radius: 999px; background: rgba(96, 165, 250, 0.16); border: 1px solid rgba(96, 165, 250, 0.35); color: #bfdbfe; font-weight: 700;">${escapeHtml(region)}</span>` +
        `</div>` +
        `<div style="font-size: 0.9rem; font-weight: 800; color: #93c5fd; white-space: nowrap;">${escapeHtml(ratePercent)} · +${escapeHtml(formatUsd(deltaAmount))}</div>` +
      `</div>` +
      `<div role="progressbar" aria-label="Effective tax rate" aria-valuemin="0" aria-valuemax="20" aria-valuenow="${escapeHtml(ratePercent.replace('%', ''))}" style="height: 10px; background: #0b1020; border: 1px solid #263459; border-radius: 999px; overflow: hidden;">` +
        `<div style="width: ${meterWidthPct}%; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #34d399 0%, #60a5fa 55%, #a78bfa 100%); box-shadow: 0 0 10px rgba(96, 165, 250, 0.45);"></div>` +
      `</div>` +
      `<div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.7rem; color: #93a4c8;">` +
        `<span>0%</span><span>5%</span><span>10%</span><span>15%</span><span>20%+</span>` +
      `</div>` +
    `</div>`
  );
}

function buildComparisonTableHtml({ activeRegime, activeRegion, effectiveRate, comparisonBase, hasSubtotal }) {
  const rows = [...TAX_REGIMES, DEFAULT_TAX_REGIME].map((entry) => {
    const isActive = entry.isFallback ? activeRegime.isFallback : entry.code === activeRegime.code;
    const rowRate = isActive ? effectiveRate : entry.rate;
    const rowTax = roundCurrency(comparisonBase * rowRate);
    const rowStyle = isActive
      ? 'background: rgba(96, 165, 250, 0.16); color: #f8fafc; box-shadow: inset 3px 0 0 #60a5fa;'
      : 'background: transparent; color: #cbd5e1;';
    const regionLabel =
      entry.isFallback && isActive && activeRegion !== 'Other'
        ? `${escapeHtml(entry.code)} <span style="font-size: 0.72rem; color: #93c5fd;">(${escapeHtml(activeRegion)})</span>`
        : escapeHtml(entry.code);
    const statusBadge = isActive
      ? '<span style="display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 0.68rem; font-weight: 700; background: rgba(52, 211, 153, 0.16); color: #6ee7b7; border: 1px solid rgba(52, 211, 153, 0.35);">ACTIVE</span>'
      : '<span style="color: #64748b;">—</span>';

    return (
      `<tr data-region="${escapeHtml(entry.code)}" data-active="${isActive ? 'true' : 'false'}" style="${rowStyle}">` +
        `<td style="padding: 8px 10px; border-top: 1px solid rgba(38, 52, 89, 0.75); font-weight: ${isActive ? '700' : '600'}; white-space: nowrap;">${regionLabel}</td>` +
        `<td style="padding: 8px 10px; border-top: 1px solid rgba(38, 52, 89, 0.75);">${escapeHtml(entry.taxType)}</td>` +
        `<td style="padding: 8px 10px; border-top: 1px solid rgba(38, 52, 89, 0.75); font-weight: 600; color: ${isActive ? '#93c5fd' : '#cbd5e1'};">${escapeHtml(formatRatePercent(rowRate))}</td>` +
        `<td style="padding: 8px 10px; border-top: 1px solid rgba(38, 52, 89, 0.75); font-variant-numeric: tabular-nums;">${escapeHtml(formatUsd(rowTax))}</td>` +
        `<td style="padding: 8px 10px; border-top: 1px solid rgba(38, 52, 89, 0.75); text-align: right;">${statusBadge}</td>` +
      `</tr>`
    );
  }).join('');

  const amountHeader = hasSubtotal ? `Est. Tax (${formatUsd(comparisonBase)})` : 'Tax / $100';

  return (
    `<div style="border: 1px solid #263459; border-radius: 10px; overflow: hidden; background: rgba(15, 23, 42, 0.55);">` +
      `<table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; text-align: left;">` +
        `<thead>` +
          `<tr style="background: #18233f; color: #93a4c8; text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.7rem;">` +
            `<th style="padding: 8px 10px;">Region</th>` +
            `<th style="padding: 8px 10px;">Tax Type</th>` +
            `<th style="padding: 8px 10px;">Rate</th>` +
            `<th style="padding: 8px 10px;">${escapeHtml(amountHeader)}</th>` +
            `<th style="padding: 8px 10px; text-align: right;">Status</th>` +
          `</tr>` +
        `</thead>` +
        `<tbody>${rows}</tbody>` +
      `</table>` +
    `</div>`
  );
}

/**
 * Renders the Slot 2 tax widget for the Checkout & Pricing Studio UI.
 * @param {Partial<import('../../types/contracts.mjs').PluginAdjustment & { status?: string }>} step
 * @param {Partial<import('../../types/contracts.mjs').OrderContext>} [orderContext]
 * @returns {import('../../types/contracts.mjs').WidgetOutput}
 */
export function renderWidget(step, orderContext = {}) {
  const rawRegion = step?.meta?.region ?? orderContext?.region ?? 'Other';
  const region = typeof rawRegion === 'string' && rawRegion.trim().length > 0 ? rawRegion.trim() : 'Other';
  const regime = resolveTaxRegime(region);

  const effectiveRate =
    typeof step?.meta?.rate === 'number' && Number.isFinite(step.meta.rate) && step.meta.rate >= 0
      ? step.meta.rate
      : regime.rate;

  const hasSubtotal =
    typeof orderContext?.subtotal === 'number' &&
    Number.isFinite(orderContext.subtotal) &&
    orderContext.subtotal >= 0;
  const subtotal = hasSubtotal ? orderContext.subtotal : 0;
  const deltaAmount =
    typeof step?.deltaAmount === 'number' && Number.isFinite(step.deltaAmount) && step.deltaAmount >= 0
      ? step.deltaAmount
      : roundCurrency(subtotal * effectiveRate);

  const ratePercent = formatRatePercent(effectiveRate);
  const meterWidthPct = Math.min(100, Math.max(0, Number(((effectiveRate / MAX_METER_RATE) * 100).toFixed(2))));
  const comparisonBase = hasSubtotal ? subtotal : 100;

  const summary = hasSubtotal
    ? `${regime.taxType} applied at ${ratePercent} on ${formatUsd(subtotal)} subtotal (${region}) for +${formatUsd(deltaAmount)}.`
    : `${regime.taxType} applied at ${ratePercent} (${region}) for +${formatUsd(deltaAmount)}.`;

  const html =
    `<div style="display: flex; flex-direction: column; gap: 12px; color: #e7eefc;">` +
      buildRateMeterHtml({
        taxType: regime.taxType,
        region,
        ratePercent,
        meterWidthPct,
        deltaAmount,
      }) +
      buildComparisonTableHtml({
        activeRegime: regime,
        activeRegion: region,
        effectiveRate,
        comparisonBase,
        hasSubtotal,
      }) +
    `</div>`;

  return validateWidgetOutput('tax', {
    pluginId: 'tax',
    title: 'Global Tax & VAT Compliance',
    badge: `${region} · ${ratePercent}`,
    summary,
    metrics: [
      { label: 'Tax Type', value: regime.taxType },
      { label: 'Active Region', value: regime.isFallback && region !== 'Other' ? `${region} (Other)` : region },
      { label: 'Effective Rate', value: ratePercent },
      { label: 'Tax Amount', value: `+${formatUsd(deltaAmount)}` },
    ],
    html,
  });
}
