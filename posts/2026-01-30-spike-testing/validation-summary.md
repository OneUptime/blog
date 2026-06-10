# Validation Summary: How to Create Spike Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- k6 (load/performance testing tool from Grafana Labs)
- JavaScript (k6 test scripts)
- GitHub Actions (CI/CD integration)
- Mermaid (diagrams)
- Slack webhook notifications (via slackapi/slack-github-action)

## Sources Consulted
- k6 execution context variables: https://grafana.com/docs/k6/latest/using-k6/execution-context-variables/
- k6 metrics — Gauge: https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/gauge/
- k6 execution module (`k6/execution`): https://grafana.com/docs/k6/latest/javascript-api/k6-execution/
- k6 thresholds: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- k6 install (Linux): https://grafana.com/docs/k6/latest/set-up/install-k6/
- k6 executors: https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/

## Issues Found

1. **Duplicate `http_req_duration` key in `thresholds` (basic-spike.js)** — The original object listed `http_req_duration` twice (`['p(95)<2000']` then later `['p(99)<5000']`). In JavaScript object literals, the second key silently overrides the first, so the `p(95)` threshold would never be evaluated. Merged into a single array: `http_req_duration: ['p(95)<2000', 'p(99)<5000']`. k6 evaluates each array entry independently.

2. **`isInSpike()` misuses `__VU` (multi-spike.js)** — The original code read `__VU` and compared it to 100 to decide whether the test was in a spike phase. `__VU` is the *current VU's unique ID*, not the active VU count, so `__VU > 100` only flagged VUs whose ID happened to exceed 100 — not the load level. Replaced with `exec.instance.vusActive > 100` via `import exec from 'k6/execution'`, which is the documented way to read the live VU count.

3. **`Gauge` misuse for in-flight tracking (autoscale-validation.js)** — The original code did `requestsInFlight.add(1)` before the request and `requestsInFlight.add(-1)` after. k6's `Gauge` does not increment/decrement; it stores the latest value added, so the metric would simply oscillate between 1 and -1 rather than tracking concurrent requests. Replaced with a Gauge named `active_vus` that records `exec.instance.vusActive` each iteration, which is what the surrounding "correlate with infrastructure scaling" intent actually wanted.

4. **Outdated `apt-key` Linux install** — The first install snippet used `sudo apt-key adv ...`, which is deprecated on modern Debian/Ubuntu. Replaced with the current `signed-by` keyring approach (the GitHub Actions workflow already used the correct approach, so the post is now consistent).

## Review Notes

- The `recoveryTime` Trend declared in `multi-spike.js` is never written to. Left as-is because removing it would be a stylistic cleanup rather than a correctness fix.
- Variable names `preSpikLatency` and `duringSpikLatency` (recovery-test.js) are misspelled (`Spik` instead of `Spike`) but used consistently throughout the script, so the code is functional. Not changed to keep edits limited to technical correctness.
- The `testStartTime` variables declared at module scope in `autoscale-validation.js` and `recovery-test.js` are unused (the timestamp is carried via `setup()` return data). Harmless; left alone.
- `slackapi/slack-github-action@v1` is still supported, though v2 is also available. Not changed since v1 is not deprecated.
- The Linux install instructions assume `gpg` is already installed; on minimal Debian/Ubuntu images you may need `sudo apt-get install -y gnupg` first. Not added because the original tutorial style is concise and most readers will already have it.
