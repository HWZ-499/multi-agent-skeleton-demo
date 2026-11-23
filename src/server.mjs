import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runPricingPipeline } from './core/loader.mjs';

function normalizeOrderContext(raw = {}) {
  const subtotalNum = Number(raw.subtotal);
  const weightNum = Number(raw.weightKg);

  return {
    orderId: typeof raw.orderId === 'string' && raw.orderId.trim() ? raw.orderId.trim() : 'ORD-STUDIO-001',
    subtotal: Number.isFinite(subtotalNum) && subtotalNum >= 0 ? subtotalNum : 120,
    couponCode: typeof raw.couponCode === 'string' ? raw.couponCode.trim() : '',
    region: typeof raw.region === 'string' && raw.region.trim() ? raw.region.trim() : 'US-CA',
    weightKg: Number.isFinite(weightNum) && weightNum >= 0 ? weightNum : 2.5,
    isExpress: raw.isExpress === true || raw.isExpress === 'true' || raw.isExpress === '1',
  };
}

function readJsonBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 64) {
        rejectBody(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolveBody({});
        return;
      }
      try {
        resolveBody(JSON.parse(raw));
      } catch {
        rejectBody(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', rejectBody);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

const APP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Multi-Agent Checkout & Pricing Studio</title>
  <style>
    :root {
      --bg: #0b1020;
      --panel: #131b31;
      --panel-alt: #18233f;
      --border: #263459;
      --text: #e7eefc;
      --muted: #93a4c8;
      --accent: #60a5fa;
      --accent-soft: rgba(96, 165, 250, 0.16);
      --green: #34d399;
      --amber: #fbbf24;
      --purple: #a78bfa;
      --red: #f87171;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(circle at top right, #18254a 0%, var(--bg) 52%);
      color: var(--text);
      min-height: 100vh;
    }
    header {
      padding: 20px 28px;
      border-bottom: 1px solid var(--border);
      background: rgba(11, 16, 32, 0.85);
      backdrop-filter: blur(10px);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .brand h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand p {
      margin: 4px 0 0;
      font-size: 0.85rem;
      color: var(--muted);
    }
    .arch-pill {
      font-size: 0.78rem;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--accent-soft);
      border: 1px solid rgba(96, 165, 250, 0.35);
      color: #bfdbfe;
      font-weight: 600;
    }
    main {
      max-width: 1440px;
      margin: 0 auto;
      padding: 24px;
      display: grid;
      grid-template-columns: 320px minmax(0, 1.55fr) 340px;
      gap: 20px;
      align-items: start;
    }
    @media (max-width: 1180px) {
      main { grid-template-columns: 1fr; }
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      box-shadow: 0 14px 35px rgba(0, 0, 0, 0.25);
    }
    .panel-title {
      margin: 0 0 14px;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .control-group {
      margin-bottom: 16px;
    }
    .control-group label {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: var(--text);
      margin-bottom: 8px;
      font-weight: 600;
    }
    .btn-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    button.chip {
      background: var(--panel-alt);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 7px 11px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    button.chip:hover { border-color: var(--accent); }
    button.chip.active {
      background: var(--accent-soft);
      border-color: var(--accent);
      color: #dbeafe;
    }
    input[type="number"] {
      width: 100%;
      background: var(--panel-alt);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 0.95rem;
      margin-bottom: 8px;
    }
    input[type="range"] {
      width: 100%;
      accent-color: var(--accent);
      cursor: pointer;
    }
    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--panel-alt);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px 12px;
      cursor: pointer;
    }
    .toggle-row span { font-size: 0.88rem; font-weight: 600; }
    .toggle-row input { width: 18px; height: 18px; accent-color: var(--accent); }
    .slots-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .slot-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.22);
    }
    .slot-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 8px;
    }
    .slot-title-wrap h2 {
      margin: 0;
      font-size: 1.05rem;
    }
    .slot-owner {
      font-size: 0.75rem;
      color: var(--muted);
      margin-top: 3px;
    }
    .badge {
      font-size: 0.74rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(52, 211, 153, 0.14);
      border: 1px solid rgba(52, 211, 153, 0.35);
      color: #6ee7b7;
      white-space: nowrap;
    }
    .badge.stub {
      background: rgba(251, 191, 36, 0.14);
      border-color: rgba(251, 191, 36, 0.35);
      color: #fde68a;
    }
    .slot-summary {
      margin: 0 0 12px;
      font-size: 0.88rem;
      color: var(--muted);
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }
    .metric-box {
      background: var(--panel-alt);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 9px 11px;
    }
    .metric-label {
      font-size: 0.72rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .metric-value {
      font-size: 0.96rem;
      font-weight: 700;
      margin-top: 3px;
      color: var(--text);
    }
    .widget-body {
      background: rgba(11, 16, 32, 0.55);
      border: 1px dashed var(--border);
      border-radius: 12px;
      padding: 12px;
      font-size: 0.86rem;
    }
    .stub-placeholder {
      color: var(--amber);
      font-style: italic;
    }
    .receipt-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 9px 0;
      border-bottom: 1px solid rgba(38, 52, 89, 0.7);
      font-size: 0.9rem;
    }
    .receipt-line small {
      display: block;
      font-size: 0.75rem;
      color: var(--muted);
    }
    .delta-neg { color: var(--green); font-weight: 700; }
    .delta-pos { color: #93c5fd; font-weight: 700; }
    .receipt-total {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 2px solid var(--border);
      font-size: 1.25rem;
      font-weight: 800;
    }
    details {
      margin-top: 16px;
      background: var(--panel-alt);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 12px;
    }
    summary {
      cursor: pointer;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--muted);
    }
    pre {
      margin: 10px 0 0;
      font-size: 0.74rem;
      line-height: 1.45;
      overflow-x: auto;
      color: #cbd5e1;
      max-height: 280px;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <h1>Multi-Agent Checkout &amp; Pricing Studio</h1>
      <p>3 Independent Agents (Discount · Tax · Shipping) collaborating via Slot Architecture &amp; Git Worktrees</p>
    </div>
    <span class="arch-pill" id="health-pill">Connecting to pipeline...</span>
  </header>

  <main>
    <section class="panel">
      <h2 class="panel-title">Order Controls</h2>

      <div class="control-group">
        <label>Preset Carts</label>
        <div class="btn-row" id="preset-row">
          <button class="chip" data-preset="starter">Starter \$45</button>
          <button class="chip active" data-preset="pro">Pro Bundle \$120</button>
          <button class="chip" data-preset="enterprise">Enterprise \$240</button>
        </div>
      </div>

      <div class="control-group">
        <label for="subtotal-input">Subtotal (USD) <span id="subtotal-readout">\$120</span></label>
        <input id="subtotal-input" type="number" min="10" max="500" step="1" value="120" />
        <input id="subtotal-range" type="range" min="10" max="500" step="1" value="120" />
      </div>

      <div class="control-group">
        <label>Coupon Code</label>
        <div class="btn-row" id="coupon-row">
          <button class="chip" data-coupon="">None</button>
          <button class="chip" data-coupon="SAVE10">SAVE10</button>
          <button class="chip active" data-coupon="VIP20">VIP20</button>
          <button class="chip" data-coupon="FLASH30">FLASH30</button>
        </div>
      </div>

      <div class="control-group">
        <label>Tax Region</label>
        <div class="btn-row" id="region-row">
          <button class="chip active" data-region="US-CA">US-CA</button>
          <button class="chip" data-region="US-NY">US-NY</button>
          <button class="chip" data-region="EU-DE">EU-DE</button>
          <button class="chip" data-region="CN">CN</button>
          <button class="chip" data-region="JP">JP</button>
        </div>
      </div>

      <div class="control-group">
        <label for="weight-range">Package Weight <span id="weight-readout">2.5 kg</span></label>
        <input id="weight-range" type="range" min="0.5" max="20" step="0.5" value="2.5" />
      </div>

      <label class="toggle-row" for="express-toggle">
        <span>Express Air Shipping (+\$15)</span>
        <input id="express-toggle" type="checkbox" checked />
      </label>
    </section>

    <section class="slots-stack" id="slots-container">
      <div class="slot-card">Loading agent feature slots...</div>
    </section>

    <section class="panel">
      <h2 class="panel-title">Live Receipt</h2>
      <div id="receipt-lines"></div>
      <div class="receipt-total">
        <span>Final Total</span>
        <span id="final-total">\$0.00</span>
      </div>
      <details>
        <summary>Pipeline JSON Inspector (/api/calculate)</summary>
        <pre id="json-inspector">{}</pre>
      </details>
    </section>
  </main>

  <script>
    const state = {
      orderId: 'ORD-STUDIO-001',
      subtotal: 120,
      couponCode: 'VIP20',
      region: 'US-CA',
      weightKg: 2.5,
      isExpress: true,
    };

    const PRESETS = {
      starter: { subtotal: 45, couponCode: 'SAVE10', region: 'US-NY', weightKg: 4, isExpress: false },
      pro: { subtotal: 120, couponCode: 'VIP20', region: 'US-CA', weightKg: 2.5, isExpress: true },
      enterprise: { subtotal: 240, couponCode: 'FLASH30', region: 'EU-DE', weightKg: 12, isExpress: true },
    };

    const OWNER_LABELS = {
      discount: 'Slot 1 · Owned by Agent-Discount (src/features/discount/)',
      tax: 'Slot 2 · Owned by Agent-Tax (src/features/tax/)',
      shipping: 'Slot 3 · Owned by Agent-Shipping (src/features/shipping/)',
    };

    function esc(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function fmtDelta(amount) {
      const sign = amount < 0 ? '-' : '+';
      return sign + '$' + Math.abs(amount).toFixed(2);
    }

    function syncInputs() {
      document.getElementById('subtotal-input').value = state.subtotal;
      document.getElementById('subtotal-range').value = state.subtotal;
      document.getElementById('subtotal-readout').textContent = '$' + state.subtotal;
      document.getElementById('weight-range').value = state.weightKg;
      document.getElementById('weight-readout').textContent = state.weightKg + ' kg';
      document.getElementById('express-toggle').checked = state.isExpress;

      document.querySelectorAll('#coupon-row button').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.coupon === state.couponCode);
      });
      document.querySelectorAll('#region-row button').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.region === state.region);
      });
    }

    async function refreshPipeline() {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
      const data = await res.json();

      const slotsEl = document.getElementById('slots-container');
      slotsEl.innerHTML = data.steps.map((step) => {
        const w = step.widget;
        const isStub = step.status !== 'ACTIVE' || w.badge === 'STUB WIDGET';
        const metricsHtml = w.metrics.map((m) =>
          '<div class="metric-box">' +
            '<div class="metric-label">' + esc(m.label) + '</div>' +
            '<div class="metric-value">' + esc(m.value) + '</div>' +
          '</div>'
        ).join('');

        return (
          '<article class="slot-card">' +
            '<div class="slot-header">' +
              '<div class="slot-title-wrap">' +
                '<h2>' + esc(w.title) + '</h2>' +
                '<div class="slot-owner">' + esc(OWNER_LABELS[step.pluginId] || step.pluginId) + '</div>' +
              '</div>' +
              '<span class="badge ' + (isStub ? 'stub' : '') + '">' + esc(w.badge) + '</span>' +
            '</div>' +
            '<p class="slot-summary">' + esc(w.summary) + '</p>' +
            '<div class="metrics-grid">' + metricsHtml + '</div>' +
            '<div class="widget-body">' + w.html + '</div>' +
          '</article>'
        );
      }).join('');

      const receiptLines = [
        '<div class="receipt-line"><div>Subtotal<small>' + esc(data.orderContext.orderId) + '</small></div><span>$' + data.orderContext.subtotal.toFixed(2) + '</span></div>'
      ];
      for (const step of data.steps) {
        const cls = step.deltaAmount < 0 ? 'delta-neg' : 'delta-pos';
        receiptLines.push(
          '<div class="receipt-line">' +
            '<div>' + esc(step.pluginId.toUpperCase()) + '<small>' + esc(step.label) + '</small></div>' +
            '<span class="' + cls + '">' + fmtDelta(step.deltaAmount) + '</span>' +
          '</div>'
        );
      }

      document.getElementById('receipt-lines').innerHTML = receiptLines.join('');
      document.getElementById('final-total').textContent = '$' + data.finalTotal.toFixed(2);
      document.getElementById('json-inspector').textContent = JSON.stringify(data, null, 2);
    }

    document.getElementById('preset-row').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-preset]');
      if (!btn) return;
      document.querySelectorAll('#preset-row button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      Object.assign(state, PRESETS[btn.dataset.preset]);
      syncInputs();
      refreshPipeline();
    });

    document.getElementById('subtotal-input').addEventListener('input', (e) => {
      const val = Math.max(0, Number(e.target.value) || 0);
      state.subtotal = val;
      syncInputs();
      refreshPipeline();
    });

    document.getElementById('subtotal-range').addEventListener('input', (e) => {
      state.subtotal = Number(e.target.value);
      syncInputs();
      refreshPipeline();
    });

    document.getElementById('coupon-row').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-coupon]');
      if (!btn) return;
      state.couponCode = btn.dataset.coupon;
      syncInputs();
      refreshPipeline();
    });

    document.getElementById('region-row').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-region]');
      if (!btn) return;
      state.region = btn.dataset.region;
      syncInputs();
      refreshPipeline();
    });

    document.getElementById('weight-range').addEventListener('input', (e) => {
      state.weightKg = Number(e.target.value);
      syncInputs();
      refreshPipeline();
    });

    document.getElementById('express-toggle').addEventListener('change', (e) => {
      state.isExpress = e.target.checked;
      refreshPipeline();
    });

    fetch('/api/health')
      .then((r) => r.json())
      .then((h) => {
        document.getElementById('health-pill').textContent = h.ok ? 'Pipeline Online · Auto-Discovery Active' : 'Offline';
      })
      .catch(() => {
        document.getElementById('health-pill').textContent = 'Offline';
      });

    syncInputs();
    refreshPipeline();
  </script>
</body>
</html>`;

export function createAppServer() {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://127.0.0.1');

      if (req.method === 'GET' && url.pathname === '/api/health') {
        sendJson(res, 200, { ok: true, app: 'Multi-Agent Checkout & Pricing Studio' });
        return;
      }

      if (url.pathname === '/api/calculate' && (req.method === 'POST' || req.method === 'GET')) {
        let rawInput = {};
        if (req.method === 'POST') {
          rawInput = await readJsonBody(req);
        } else {
          rawInput = {
            orderId: url.searchParams.get('orderId') || undefined,
            subtotal: url.searchParams.get('subtotal') ?? undefined,
            couponCode: url.searchParams.get('couponCode') ?? '',
            region: url.searchParams.get('region') ?? undefined,
            weightKg: url.searchParams.get('weightKg') ?? undefined,
            isExpress: url.searchParams.get('isExpress') ?? undefined,
          };
        }

        const orderContext = normalizeOrderContext(rawInput);
        const result = await runPricingPipeline(orderContext);
        sendJson(res, 200, result);
        return;
      }

      if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(APP_HTML);
        return;
      }

      sendJson(res, 404, { error: 'Not Found' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sendJson(res, 400, { error: message });
    }
  });
}

const isMainModule =
  typeof process.argv[1] === 'string' &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMainModule) {
  const port = Number(process.env.PORT) || 3090;
  const server = createAppServer();
  server.listen(port, () => {
    console.log(`Multi-Agent Checkout & Pricing Studio running at http://localhost:${port}`);
  });
}
