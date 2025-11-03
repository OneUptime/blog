# Synthetic Monitoring in OneUptime: Simulating Real User Journeys with Playwright

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Synthetic Monitoring, Monitoring, Reliability, Performance, Customer Experience, Playwright, Uptime Monitoring, DevOps

Description: How OneUptime implements synthetic monitoring using real browsers, sandboxed user scripts, multi-device/multi-browser matrices, and rich artifacts (logs, screenshots) to proactively validate user journeys before your customers do.

---

When customers say “the checkout button doesn’t work on mobile,” you need proof, not guesses. Synthetic monitoring makes this proactive: it runs scripted user flows on a schedule (and from your probes/regions), capturing screenshots, logs, and timings across different browsers and screen sizes.

This post explains how synthetic monitoring works in OneUptime -  under the hood and in practice -  so you can simulate real user experiences with confidence.

## What “synthetic” means here

OneUptime executes your Playwright script in a real browser (Chromium or Firefox), with a chosen viewport (Mobile, Tablet, Desktop). The script navigates your app, clicks buttons, validates UI, and can take screenshots. These runs are executed in a sandboxed environment with strict timeouts, and the results are sent back to OneUptime for visualization and alerting.

## What is Playwright?

[Playwright](https://playwright.dev/) is a modern end-to-end testing and automation framework that supports multiple browsers (Chromium, Firefox, WebKit) and platforms. It provides a high-level API to control browsers, interact with web pages, and capture screenshots, making it ideal for simulating real user journeys.

## Writing your synthetic script

Your script runs with a context that includes Playwright’s `browser` and `page`, plus metadata like `browserType` and `screenSizeType`.

Return shape expected by OneUptime:
- `data`: Any JSON-serializable object you want to return
- `screenshots`: A map of name -> Buffer (OneUptime converts these to base64 automatically)
- Console output is captured as `logMessages`


## Easier way to write a playwright script by using browser extensions

1. Install the [Playwright Recorder extension](https://chromewebstore.google.com/detail/playwright-chrome-recorde/bfnbgoehgplaehdceponclakmhlgjlpd) for Chrome or Firefox.
2. Navigate to your web application and start recording your user journey.
3. Stop the recording and copy the generated Playwright script.
4. Paste the script into your OneUptime synthetic monitor script editor.

### Minimal example

```js
// This code is executed in a sandbox. You can use Playwright APIs via the provided page/browser.
// You may return { data, screenshots } where screenshots are Buffers.
await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });

// 2) Validate title text exists
const title = await page.textContent('h1');
if (!title || !title.toLowerCase().includes('example')) {
  throw new Error('Expected title to contain "example"');
}

// 3) Take a screenshot
screenshots.home = await page.screenshot({ fullPage: true });

// 4) Return any structured data
return {
  data: { ok: true, title },
  screenshots,
};
```

### Multi-step flow with assertions

```ts
console.log(`Running on ${browserType} at ${screenSizeType} size`);

await page.goto('https://your-app.example/login', { waitUntil: 'domcontentloaded' });
await page.fill('input[name=email]', 'synthetic+bot@example.com');
await page.fill('input[name=password]', 'not-a-real-password');
await page.click('button[type=submit]');

// Wait for dashboard
await page.waitForSelector('[data-test="dashboard"]', { timeout: 15000 });

// Verify a key widget is present
const widgetText = await page.textContent('[data-test="kpi-revenue"]');
if (!widgetText) {
  throw new Error('Revenue KPI widget missing');
}

return {
  data: { ok: true, widgetText },
  screenshots: {
    dashboard: await page.screenshot({ fullPage: true })
  },
};
```

## Browser and device matrix

OneUptime will execute your script across all combinations you select in the monitor step:

- Browsers: Chromium, Firefox
- Screen sizes: Desktop (1920×1080), Tablet (1024×768), Mobile (360×640)

Results (including screenshots) are returned per combination, so you can spot device-specific regressions quickly.

## Timeouts and reliability

- If a script times out or throws, the error is captured as `scriptError` with logs included.
- Browsers are always closed after execution to avoid resource leaks.

## Network and proxy support

If your probes run behind corporate egress or you require specific routing, OneUptime auto-applies HTTPS/HTTP proxy settings (including basic auth parsed from the proxy URL) when launching Playwright.

## Artifact-rich results: logs, data, screenshots

Your script can `console.log()` and return named screenshots. OneUptime captures:

- `logMessages`: everything you log
- `executionTimeInMS`: precise runtime
- `result`: the `data` you return
- `screenshots`: base64-encoded images you return as Buffers

These are shown in the Dashboard under the monitor’s summary view.

## How results flow through the system

```mermaid
flowchart LR
  subgraph OneUptime Cloud
    A[Monitor Config] -->|fetch job| B[Probe]
    B -->|launches| C[Playwright Browser]
    C -->|runs in| D[Sandboxed VM]
    D -->|returns| E[Logs + Screenshots + Data]
    E -->|ingest| F[OneUptime API]
    F --> G[Dashboard & Alerts]
  end

  classDef node fill:#111827,stroke:#4B5563,color:#E5E7EB
  class A,B,C,D,E,F,G node
```

## When to use synthetic monitoring vs. APM tracing

- Synthetic monitoring: proactively tests critical flows even when traffic is low or absent. Great for catching broken buttons, auth regressions, or CDN misconfigurations.
- APM tracing: shows real user journeys and performance in production under real load.

They’re complementary. For deeper end-to-end tracing of real journeys, see: https://oneuptime.com/blog/post/2025-10-01-mastering-apm-tracing-user-journeys-in-distributed-systems/view

## Quick checklist for effective synthetic monitors

- Cover your golden paths: sign-up, login, checkout, search, upload, etc.
- Run across at least Desktop + Mobile, and Chromium + Firefox.
- Take named screenshots on key steps; assert critical UI exists.
- Use timeouts intentionally and fail fast with helpful messages.
- Keep secrets out of scripts; use non-production accounts and data.
- Add alerts on failures and rising execution times.

Proactive reliability means testing what matters most: the user’s experience. With OneUptime’s synthetic monitoring, you’ll know when critical flows break- before your customers do.
