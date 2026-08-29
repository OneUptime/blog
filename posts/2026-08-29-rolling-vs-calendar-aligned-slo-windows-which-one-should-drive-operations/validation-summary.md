# Validation Summary: Rolling vs Calendar-Aligned SLO Windows: Which One Should Drive Operations?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Service level objectives (SLOs), service level indicators (SLIs), error budgets, and service level agreements (SLAs)
- Rolling and calendar-aligned compliance windows
- Multiwindow, multi-burn-rate alerting
- Prometheus and PromQL counter queries
- OpenSLO v1
- Google Cloud Observability

## Sources Consulted
- Google SRE Workbook, “Choosing an Appropriate Time Window”: https://sre.google/workbook/implementing-slos/#choosing-an-appropriate-time-window
- Google SRE Workbook, “Alerting on SLOs”: https://sre.google/workbook/alerting-on-slos/
- Google SRE Workbook, example error-budget policy: https://sre.google/workbook/error-budget-policy/
- Google Cloud Observability, “Compliance periods”: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring#compliance-period
- Prometheus query functions, `increase()`: https://prometheus.io/docs/prometheus/latest/querying/functions/#increase
- Prometheus querying basics, duration syntax and range-vector selectors: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query operators, aggregation and vector arithmetic: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus metric types, counter semantics: https://prometheus.io/docs/concepts/metric_types/#counter
- Prometheus instrumentation guidance: https://prometheus.io/docs/practices/instrumentation/
- OpenSLO v1 SLO schema: https://github.com/OpenSLO/OpenSLO#slo

## Issues Found
No technical issues found.

## Review Notes
- The PromQL expression is syntactically valid and correctly computes good eligible events divided by all eligible events when `api_requests_total` is a monotonically increasing counter and each eligible event increments exactly one outcome series.
- Prometheus defines `d` as exactly 24 hours, so `[28d]` is a rolling 672-hour range rather than a calendar-aware month. This is consistent with the post's distinction between rolling and calendar-aligned windows.
- The query assumes expected label combinations are initialized and eligible traffic exists. A missing numerator series can yield no result, while a zero denominator yields `NaN`; production SLO tooling should define an explicit missing-data and no-traffic policy.
- Prometheus documents `increase()` as suitable for readable ad hoc queries and recommends `rate()` for recording rules. The post presents a query rather than a recording rule, so the use of `increase()` is appropriate.
- OpenSLO v1 allows exactly one rolling or calendar-aligned `timeWindow` entry per SLO. Maintaining both views therefore requires separate SLO definitions, which can share the same SLI through `indicatorRef`; this is consistent with the post's canonical-SLI guidance.
- All external links in the post resolved to the intended authoritative resources. No change to `README.md` was required.
