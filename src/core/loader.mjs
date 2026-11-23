import { readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { roundCurrency, validateAdjustment, validateWidgetOutput } from '../types/contracts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEATURES_DIR = join(__dirname, '..', 'features');

/**
 * Automatically discovers and loads all feature slot plugins under src/features/<slot>/index.mjs
 * along with optional UI widget renderers under src/features/<slot>/widget.mjs.
 * Sorted ascending by plugin.order.
 * @returns {Promise<Array<{id: string, order: number, implemented: boolean, apply: Function, renderWidget?: Function}>>}
 */
export async function loadFeaturePlugins() {
  const entries = readdirSync(FEATURES_DIR, { withFileTypes: true });
  const plugins = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const modulePath = join(FEATURES_DIR, entry.name, 'index.mjs');
    if (!existsSync(modulePath)) continue;

    const mod = await import(pathToFileURL(modulePath).href);
    if (!mod.plugin || typeof mod.plugin !== 'object') {
      throw new Error(`Feature module "${entry.name}/index.mjs" must export a "plugin" object`);
    }

    const descriptor = { ...mod.plugin };
    const widgetPath = join(FEATURES_DIR, entry.name, 'widget.mjs');
    if (existsSync(widgetPath)) {
      const widgetMod = await import(pathToFileURL(widgetPath).href);
      if (typeof widgetMod.renderWidget !== 'function') {
        throw new Error(`Feature widget "${entry.name}/widget.mjs" must export a "renderWidget" function`);
      }
      descriptor.renderWidget = widgetMod.renderWidget;
    }

    plugins.push(descriptor);
  }

  return plugins.sort((a, b) => a.order - b.order);
}

/**
 * Executes the pricing pipeline across all discovered feature slots and renders slot widgets.
 * Unimplemented stubs are reported cleanly without crashing the pipeline.
 *
 * @param {import('../types/contracts.mjs').OrderContext} orderContext
 */
export async function runPricingPipeline(orderContext) {
  const plugins = await loadFeaturePlugins();
  const steps = [];
  let totalDelta = 0;

  for (const plugin of plugins) {
    let step;

    if (!plugin.implemented) {
      step = {
        pluginId: plugin.id,
        status: 'STUB',
        label: 'Pending agent implementation',
        deltaAmount: 0,
        meta: {},
      };
    } else {
      const rawAdj = await plugin.apply(orderContext);
      const adj = validateAdjustment(rawAdj);

      if (adj.pluginId !== plugin.id) {
        throw new Error(`Plugin "${plugin.id}" returned mismatched pluginId "${adj.pluginId}"`);
      }

      totalDelta += adj.deltaAmount;
      step = {
        pluginId: adj.pluginId,
        status: 'ACTIVE',
        label: adj.label,
        deltaAmount: adj.deltaAmount,
        meta: adj.meta,
      };
    }

    if (typeof plugin.renderWidget === 'function') {
      const rawWidget = await plugin.renderWidget(step, orderContext);
      step.widget = validateWidgetOutput(plugin.id, rawWidget);
    } else {
      step.widget = {
        pluginId: plugin.id,
        title: `${plugin.id.toUpperCase()} Slot`,
        badge: 'STUB WIDGET',
        summary: 'Waiting for agent widget.mjs implementation',
        metrics: [
          { label: 'Status', value: step.status },
          { label: 'Delta', value: `$${step.deltaAmount.toFixed(2)}` },
        ],
        html: '<div class="stub-placeholder">Pending agent widget.mjs</div>',
      };
    }

    steps.push(step);
  }

  return {
    orderContext,
    steps,
    finalTotal: roundCurrency(orderContext.subtotal + totalDelta),
  };
}
