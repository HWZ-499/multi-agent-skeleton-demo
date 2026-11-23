import { readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { roundCurrency, validateAdjustment } from '../types/contracts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEATURES_DIR = join(__dirname, '..', 'features');

/**
 * Automatically discovers and loads all feature slot plugins under src/features/<slot>/index.mjs.
 * Sorted ascending by plugin.order.
 * @returns {Promise<Array<{id: string, order: number, implemented: boolean, apply: Function}>>}
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

    plugins.push(mod.plugin);
  }

  return plugins.sort((a, b) => a.order - b.order);
}

/**
 * Executes the pricing pipeline across all discovered feature slots.
 * Unimplemented stubs are reported cleanly without crashing the pipeline.
 *
 * @param {import('../types/contracts.mjs').OrderContext} orderContext
 */
export async function runPricingPipeline(orderContext) {
  const plugins = await loadFeaturePlugins();
  const steps = [];
  let totalDelta = 0;

  for (const plugin of plugins) {
    if (!plugin.implemented) {
      steps.push({
        pluginId: plugin.id,
        status: 'STUB',
        label: 'Pending agent implementation',
        deltaAmount: 0,
        meta: {},
      });
      continue;
    }

    const rawAdj = await plugin.apply(orderContext);
    const adj = validateAdjustment(rawAdj);

    if (adj.pluginId !== plugin.id) {
      throw new Error(`Plugin "${plugin.id}" returned mismatched pluginId "${adj.pluginId}"`);
    }

    totalDelta += adj.deltaAmount;
    steps.push({
      pluginId: adj.pluginId,
      status: 'ACTIVE',
      label: adj.label,
      deltaAmount: adj.deltaAmount,
      meta: adj.meta,
    });
  }

  return {
    orderContext,
    steps,
    finalTotal: roundCurrency(orderContext.subtotal + totalDelta),
  };
}
