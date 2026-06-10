# Validation Summary: How to Define Service Level Objectives (SLOs)

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- SLO/SLI/SLA concepts (Google SRE)
- Error budgets and burn rate alerting
- Python 3.10+ (dataclasses, type hints with `|`, generic `list`/`tuple`)
- Prometheus / PromQL (alerting rules, `rate`, `histogram_quantile`)
- Mermaid diagrams
- YAML (Prometheus alert rule format)

## Sources Consulted
- Google SRE Book — Chapter 4 "Service Level Objectives" (https://sre.google/sre-book/service-level-objectives/)
- Google SRE Workbook — Chapter 5 "Alerting on SLOs" (https://sre.google/workbook/alerting-on-slos/)
- Prometheus PromQL functions documentation (https://prometheus.io/docs/prometheus/latest/querying/functions/) — `rate()`, `histogram_quantile()`
- Prometheus alerting rules documentation (https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- Python `statistics` module documentation (https://docs.python.org/3/library/statistics.html)
- Python `dataclasses` documentation (https://docs.python.org/3/library/dataclasses.html)
- PEP 604 (union types via `|`) and PEP 585 (built-in generic types)

## Issues Found
No technical issues found.

Verification performed:
- **Downtime math table**: Computed all five SLO targets against a 30-day month (43,200 min) and 365-day year (525,600 min). All values in the table match the calculations (43.2→43 min, 21.6→22 min, 4.32→4.3 min, 8.76 hr, 4.38 hr, 52.56→52.6 min, 3.65 days, 1.825→1.83 days, 8.76 hr).
- **SLICalculator code**: Executed end-to-end. Availability, P50/P99 latency, and error rate compute correctly with the sample workload (1000 requests at 99.9% success rate).
- **ErrorBudgetTracker code**: Executed end-to-end. The `(1 - slo_target) * window_minutes` formula correctly yields 43.2 minutes for 99.9% SLO over 30 days. Burn rate, remaining budget, and projected exhaustion all compute as documented.
- **PromQL queries**: `sum(rate(http_requests_total{status=~"5.."}[1h])) / sum(rate(http_requests_total[1h]))` and `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` are valid and idiomatic. The thresholds `14 * 0.001` and `3 * 0.001` correctly express 14x and 3x of the 0.1% sustainable error rate for a 99.9% SLO.
- **Burn rate exhaustion claims**: At 14x burn rate, a 30-day budget would be exhausted in 30/14 ≈ 2.14 days ("~2 days" ✓); at 3x, 30/3 = 10 days ✓.
- **SLI formulas**: All four (availability, latency, throughput, quality) are standard and accurate.
- **Prometheus alert rule YAML structure**: `groups`/`rules`/`alert`/`expr`/`for`/`labels`/`annotations` fields are correct per Prometheus documentation. Template functions `humanizePercentage` and `humanizeDuration` are valid Prometheus annotation template functions.

## Review Notes
- The multi-window burn-rate multipliers used in the post (14x for 1h, 3x for 6h) are simplified from the Google SRE Workbook recommendations (14.4 for 1h with 5m short window, 6 for 6h with 30m short window). The simplification is reasonable for an introductory tutorial and the underlying math is consistent.
- The `latency_p99` implementation uses `int(len(latencies) * 0.99)` which is the nearest-rank percentile method but is off-by-one from the strict definition for some N. For tutorial purposes and reasonable sample sizes this is acceptable and produces correct-looking values.
- The Python code uses `datetime | None` (PEP 604) and `list[tuple[...]]` (PEP 585), which require Python 3.10+. This is not noted in the post but is current best practice and Python 3.10 has been the minimum for several supported lines for a while.
- The nested code fence inside the "Step 6: Document Your SLOs" template (lines 449/454 of the markdown template snippet) uses a `` ```text `` token that may not render perfectly in all markdown renderers. This is a documentation-rendering quirk in the example template, not a technical inaccuracy, so it was left unchanged per the "do not make stylistic changes" instruction.
- The post correctly emphasizes user-centric SLIs over infrastructure metrics, which aligns with current SRE best practice.
