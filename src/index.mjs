import { runPricingPipeline } from './core/loader.mjs';

const sampleOrder = {
  orderId: 'ORD-2026-001',
  subtotal: 120,
  couponCode: 'VIP20',
  region: 'US-CA',
  weightKg: 2.5,
  isExpress: true,
};

const result = await runPricingPipeline(sampleOrder);

console.log('=== Multi-Agent Pricing Pipeline ===');
console.log(`Order: ${result.orderContext.orderId} | Subtotal: $${result.orderContext.subtotal.toFixed(2)}`);
console.log('--------------------------------------------------------------------------------');

for (const step of result.steps) {
  const sign = step.deltaAmount >= 0 ? '+' : '-';
  const formattedDelta = `${sign}$${Math.abs(step.deltaAmount).toFixed(2)}`;
  const statusTag = `[${step.status}]`.padEnd(8);
  const idCol = step.pluginId.padEnd(10);
  const labelCol = step.label.padEnd(28);
  const widgetBadge = step.widget ? `[Widget: ${step.widget.badge}]` : '[No Widget]';
  console.log(`${statusTag} ${idCol} | ${labelCol} | ${formattedDelta.padEnd(9)} | ${widgetBadge}`);
}

console.log('--------------------------------------------------------------------------------');
console.log(`Final Total: $${result.finalTotal.toFixed(2)}`);
