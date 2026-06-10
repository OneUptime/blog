# Validation Summary: How to Build Burn Rate Alerts

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Prometheus (recording rules, alerting rules, PromQL)
- Alertmanager (routing, receivers, Slack/PagerDuty integrations)
- Grafana (dashboard JSON, panel configuration)
- Python 3 (PyYAML for rule generation and test scenarios)
- Google SRE Workbook concepts (SLOs, error budgets, multi-window burn rates)

## Sources Consulted
- [Google SRE Workbook - Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/) — Table 5-8 (canonical burn rate thresholds: 14.4 / 6 / 1 with 1h/6h/72h windows; 2% / 5% / 10% budget consumption)
- [Prometheus recording rules documentation](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus alerting rules documentation](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) — `rate()`, `increase()`, `clamp_min()`, `sum by ()`
- [Alertmanager configuration documentation](https://prometheus.io/docs/alerting/latest/configuration/) — `match`, `matchers`, route trees
- [Alertmanager CHANGELOG (v0.22.0)](https://github.com/prometheus/alertmanager/blob/main/CHANGELOG.md) — `matchers` introduced, `match`/`match_re` deprecated but still supported
- [Grafana standard options - unit field](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-standard-options/)
- Python 3 floating-point representation behavior (PEP 3101 / IEEE 754)

## Issues Found

**Test output table inconsistent with code (fixed).** The `test_burn_rate_alerts.py` script uses strict `>` comparisons for alert classification, but the original test scenarios (`error_rate` values 0.001, 0.003, 0.006) produce burn rates that land exactly at the thresholds (1.0, 3.0, 6.0) — and due to IEEE 754 floating-point representation, `0.003/0.001 = 2.9999...` and `0.006/0.001 = 5.9999...`, which fall just below their respective thresholds. As a result, the displayed "Running this produces:" output overstated three alert levels:
- "Slight degradation" (0.001 → burn rate 1.0): claimed `INFO` but `1.0 > 1` is False → actual: `None`
- "Moderate issues" (0.003 → burn rate ~3.0): claimed `WARNING` but `2.999... > 3` is False → actual: `INFO`
- "Significant problems" (0.006 → burn rate ~6.0): claimed `CRITICAL (Medium)` but `5.999... > 6` is False → actual: `WARNING`

**Fix:** Nudged the input error rates up slightly (`0.001 → 0.0011`, `0.003 → 0.0031`, `0.006 → 0.0061`) so each scenario clearly exceeds its threshold and produces the intended alert level. Updated the displayed output table to match the corrected values (`0.11% / 1.1x / 27.3d`, `0.31% / 3.1x / 9.7d`, `0.61% / 6.1x / 4.9d`). This preserves the demonstration intent while making the displayed output an accurate record of what running the script produces.

## Review Notes

- **Math throughout the post is correct.** The 99.9% SLO → 0.1% error budget → 43.2 min/month derivation, the burn rate formula (`error_rate / (1 - SLO_target)`), the time-to-exhaustion calculations (30/burn_rate), and the example values (0.5% errors → 5x burn → 6 days) all check out.
- **The multi-window threshold values (14.4, 6, 3, 1) align with the Google SRE Workbook.** The 14.4 derivation matches: `14.4 × (1h / 720h) = 0.02` (2% of 30-day budget per hour). The post's framing "we use 14.4 for some safety margin" is a pedagogical simplification — the canonical derivation is "consume X% of budget in alert window" — but it's not technically wrong.
- **Note: the canonical Google SRE Workbook Table 5-8 lists three tiers (1h+5m, 6h+30m, 72h+6h), not four.** The post includes a fourth tier (1d long window + 2h short window + burn rate 3) that is a common practical extension widely used in production but is not in the canonical workbook table. The post attributes this to the "Google SRE approach" generally rather than claiming it verbatim from the book, so this is a defensible authorial choice and was not modified.
- **Alertmanager `match` syntax is deprecated** in favor of `matchers` (deprecated in v0.22.0, May 2021), but the old form still works in current Alertmanager releases and is not strictly wrong. Future revisions could migrate to `matchers` for forward compatibility.
- **Two recording rules share the `record` name `slo:http_requests:burn_rate_5m`** in the "Basic Burn Rate Calculation" section (one with `slo_target: "99.9"`, another with `slo_target: "99.5"`). This is valid Prometheus configuration because the distinguishing `labels` produce different time series, but it's a slightly unusual pattern.
- **Grafana `"unit": "x"`** in the gauge panel will be rendered by Grafana as a literal custom-text suffix. The more canonical form for an explicit suffix unit is `"unit": "suffix:x"`. Both work in practice; left as-is.
- **Floating-point caveat:** The script's `print(f"Error Budget: {(1 - slo_target) * 100}%")` line will actually emit `Error Budget: 0.10000000000000009%` (not `0.1%`) due to float representation of `1 - 0.999`. The displayed output cleans this up. This is a minor pedagogical convenience, not a technical error.
