# Validation Summary: How to Create Quality SLOs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Service Level Objectives (SLOs) and Service Level Indicators (SLIs)
- TypeScript with Zod schema validation
- Python with `prometheus_client`
- Prometheus alerting rules / PromQL
- Mermaid diagrams (flowchart, sequenceDiagram, graph)
- YAML SLO configuration
- NumPy / `collections.deque` for statistical validation
- Python `asyncio` for concurrent service calls
- Multi-window burn-rate alerting (Google SRE Workbook)

## Sources Consulted
- Zod documentation: https://zod.dev (verified `safeParse`, `z.string().uuid()`, `z.string().datetime()`, `ZodError.issues[].code` API surface)
- prometheus_client Python library: https://github.com/prometheus/client_python (verified `Counter` and `.labels(...).inc()` API)
- Prometheus query and alerting docs: https://prometheus.io/docs/prometheus/latest/querying/basics/ and https://prometheus.io/docs/practices/alerting/
- Google SRE Workbook, Chapter 5 "Alerting on SLOs": https://sre.google/workbook/alerting-on-slos/ (verified multi-window burn-rate thresholds: 14.4x / 1h and 3x / 6h, and the 30-day budget exhaustion math: 30/14.4 ≈ 2.08 days, 30/3 = 10 days)
- Python datetime docs: https://docs.python.org/3/library/datetime.html (verified `datetime.utcnow()` deprecation in Python 3.12+)
- NumPy docs for `np.mean` / `np.std`
- Python typing: PEP 604 union syntax (`GoldenRecord | None`) requires Python 3.10+

## Issues Found

1. **Incorrect Prometheus expression in `QualityBudgetLow` alert.** The original expression `(1 - bad_rate) / 0.0005 < 0.25` evaluates to `good_rate / 0.0005 < 0.25`, i.e. `good_rate < 0.000125`, which is essentially never true and would mean the alert never fires. The intended semantics ("remaining error budget < 25%") requires `1 - (bad_rate / 0.0005) < 0.25`. Fixed the parenthesization so the division by the error-budget fraction happens inside the `1 - …` subtraction.

2. **Deprecated `datetime.utcnow()`.** Deprecated since Python 3.12; recommended replacement is `datetime.now(timezone.utc)`. Updated the import to add `timezone` and replaced the call site in `calculate_error_budget`.

## Review Notes

- The Zod, prometheus_client, asyncio, and NumPy code is syntactically correct and uses current APIs.
- The Python code uses PEP 604 union syntax (`GoldenRecord | None`) which requires Python 3.10+. Not flagged because the post implicitly targets modern Python and uses other 3.10+ features consistently.
- `prometheus_client` `Histogram`, `typing.Optional`, and `time` are imported in the combined-metrics example but unused. Stylistic only; left as-is to avoid changing more than necessary.
- The availability SLI definition `200 <= status_code < 500` treats 4xx as "available". This is a design choice — many shops exclude 4xx (client errors) from availability accounting. Not incorrect, just worth noting.
- The YAML SLO config shape (`objectives: [...]`) does not exactly match the dict access pattern used by `calculate_error_budget` (`slo_config['availability']['target']`). The two snippets are illustrative rather than a working pair; not flagged as a technical error.
- `np.std` defaults to population standard deviation (ddof=0); for a rolling-window anomaly detector either choice is defensible.
- Burn-rate thresholds (14.4x/1h, 3x/6h) and the stated "exhaust 30-day budget in 2 days / 10 days" math are consistent with the Google SRE Workbook recommendations.
