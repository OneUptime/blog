# Validation Summary: How to Build Warning Thresholds

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- TypeScript (Node.js, EventEmitter)
- Prometheus / Alertmanager (alerting rules, PromQL, `histogram_quantile`, `humanizeDuration`)
- Mermaid diagrams (flowchart, stateDiagram-v2, gantt, graph TD)
- General SRE concepts: warning vs critical thresholds, hysteresis, alert flapping, SLOs/error budgets, burn rate

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions (`histogram_quantile`, `rate`): https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus template functions (`humanizeDuration`): https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Google SRE workbook on alerting / burn rate: https://sre.google/workbook/alerting-on-slos/
- TypeScript / Node.js docs for `events.EventEmitter`: https://nodejs.org/api/events.html
- MDN: `Date.prototype.getDay()` (0 = Sunday, 6 = Saturday): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getDay
- Mermaid diagram syntax (state, flowchart, gantt): https://mermaid.js.org/intro/

## Issues Found
1. **Typo `estimatedTimeToClirical` → `estimatedTimeToCritical`.** The `WarningAlert` TypeScript interface, the template literal in `formatWarningAlert`, and the example alert object all used `estimatedTimeToClirical`. This would still compile (TypeScript wouldn't flag it because the misspelling is consistent within the file), but the property is clearly meant to be `estimatedTimeToCritical`. Fixed all three occurrences so the code is correct and not embarrassing if reader copy-pastes it.

## Review Notes
- Math in all worked examples was verified:
  - Disk lead-time calculation (warning at 75% / critical at 90%, current 300GB, 5GB/hour → 15h/30h/15h lead): correct.
  - Fixed-percentage example (90 × 0.8 = 72): correct.
  - Statistical thresholds (mean 200ms, stddev 50ms → 300ms / 350ms): correct.
  - Response-time-based example (1000 − 10 × 30 = 700 connections): correct.
  - SLO-based latency example (500 × 0.8 = 400ms): correct.
  - Required lead time ((15 + 30 + 45) × 1.25 = 112.5 minutes): correct.
  - Disk-fill table at 2GB/day (50/100/150 GB remaining → 25/50/75 days): correct.
- The comments labeling `mean + 2σ` as "~95th percentile" and `mean + 3σ` as "~99.7th percentile" are loose — for a one-sided threshold, `mean + 2σ` is actually ≈97.7th percentile and `mean + 3σ` is ≈99.87th percentile. The author is referring to the well-known two-sided 68/95/99.7 rule for normal distributions, which is a common simplification in SRE writing. Left as-is because the intent is clear and the numerical thresholds (300ms, 350ms) are computed correctly.
- The Prometheus alerting example is valid: `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` is the canonical p99 query, and `> 0.35` / `> 0.5` correctly express 350 ms / 500 ms because the metric is in seconds. `humanizeDuration` is a real Prometheus template function.
- The `WarningThresholdEvaluator` state machine intentionally never demotes `critical` back to `warning` when the value falls between the two thresholds — it can only clear back to `ok` via `clearThreshold`. That is a deliberate design choice (avoids paging churn during a critical incident) rather than a bug, so no change needed.
- The hysteresis state diagram (`Alerting --> Alerting : Value >= Clear (70%)`) matches the code, which only clears when `currentValue < clearThreshold`.
- All external links in "Related Reading" follow the standard `oneuptime.com/blog/post/.../view` pattern; not independently verified that each slug exists, but format is correct.
