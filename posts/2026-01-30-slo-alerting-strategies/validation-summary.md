# Validation Summary: How to Build SLO Alerting Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Service Level Objectives (SLOs) and error budgets
- Prometheus (PromQL, recording rules, alerting rules)
- Alertmanager (routing, receivers, PagerDuty/Slack integrations)
- Google SRE multi-window, multi-burn-rate alerting methodology
- Mermaid diagrams

## Sources Consulted
- Google SRE Workbook, Chapter 5: "Alerting on SLOs" — https://sre.google/workbook/alerting-on-slos/
- Prometheus documentation on alerting rules — https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus documentation on recording rules — https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus query functions (`rate`, `sum`) — https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histogram bucket queries — https://prometheus.io/docs/practices/histograms/
- Alertmanager configuration — https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager PagerDuty receiver (`service_key`/`routing_key`) — https://prometheus.io/docs/alerting/latest/configuration/#pagerduty_config
- Alertmanager Slack receiver — https://prometheus.io/docs/alerting/latest/configuration/#slack_config

## Issues Found
- **Burn rate math in the Mermaid diagram (line 34)**: The diagram claimed a 14.4x burn rate exhausts the error budget in "5% of window." The correct value is 1/14.4 ≈ 6.94%, i.e., ~7% of the window. (5% would correspond to a 20x burn rate.) Updated the diagram to read "Budget exhausts in ~7% of window" to remain consistent with the other entries (1x → 100%, 2x → 50%, 10x → 10%).

## Review Notes
- The burn rate values used in the four-alert framework (14.4x for 2% budget / 1h, 6x for 5% budget / 6h, 1x for 10% budget / 3d) match the Google SRE Workbook's recommendations and are mathematically correct: e.g., 0.02 / (1/720) = 14.4 for a 30-day window.
- The error-budget arithmetic in the intro ("0.1% errors over 30 days = ~43 minutes of downtime") is correct: 30 × 24 × 60 × 0.001 = 43.2 minutes.
- The Prometheus PromQL queries (`rate`, `sum by`, label matchers like `status!~"5.."`, histogram `_bucket{le="0.2"}`) are syntactically correct and follow current best practices.
- The `slo:error_budget:remaining` recording rule references `slo:error_ratio:30d`, which is not defined in the shown snippet. This is illustrative — a real deployment would need to compute the 30-day error ratio (often via subqueries or a downsampled series). Left as-is since the omission is clearly pedagogical.
- The Alertmanager config uses the legacy `match:` matcher syntax. Newer Alertmanager (≥ 0.22) prefers `matchers: [...]`, but `match:` is still supported and widely seen in tutorials, so no change was made.
- The PagerDuty receiver uses `service_key` (Events API v1). Both `service_key` and `routing_key` (Events API v2) remain supported in current Alertmanager, so this is acceptable.
- `${PAGERDUTY_KEY}` env-style interpolation isn't natively expanded by Alertmanager — readers would need a templating step (envsubst, Helm, etc.). This is a common shorthand in examples and is clear from context.
- The `for: 2m` duration on the critical alert is slightly longer than the ~1/12-of-short-window heuristic some operators use (which would suggest ~25s for a 5m short window) but is well within the range of reasonable values; not flagged.
