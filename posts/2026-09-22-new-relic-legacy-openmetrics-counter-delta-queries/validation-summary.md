# Validation Summary: How to Query OpenMetrics Counter Deltas Correctly in the Legacy New Relic Integration

## Status
validated

## Post Type
Technical guide with NRQL query examples and an OpenMetrics exposition example.

## Technologies Covered
- New Relic dimensional metrics and NRQL
- Legacy New Relic Prometheus OpenMetrics integration (`nri-prometheus`)
- Prometheus counters and OpenMetrics 1.0 exposition
- Prometheus remote write, OpenTelemetry, and Kubernetes collector migration

## Sources Consulted
- New Relic, Translate PromQL queries to NRQL: https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/view-query-data/translate-promql-queries-nrql/
- New Relic, Metric data structure: https://docs.newrelic.com/docs/data-apis/understand-data/metric-data/metric-data-type/
- New Relic, Supported PromQL features: https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/view-query-data/supported-promql-features/
- New Relic, Migrate from the Prometheus OpenMetrics integration: https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-prometheus-agent/migration-guide/
- New Relic, Use rate() to visualize time periods: https://docs.newrelic.com/docs/nrql/using-nrql/rate-function/
- New Relic, NRQL reference: https://docs.newrelic.com/docs/nrql/nrql-syntax-clauses-functions/
- Prometheus, OpenMetrics 1.0 specification: https://prometheus.io/docs/specs/om/open_metrics_spec/
- New Relic, official nri-prometheus repository: https://github.com/newrelic/nri-prometheus

## Issues Found
No technical issues found.

## Review Notes
- Verified the legacy cumulative-counter-to-delta-count mapping and use of `sum` for stored count metrics. The arithmetic is correct: 130 - 100 = 30, 175 - 130 = 45, and 30 + 45 = 75; adding the two cumulative observations gives 305.
- Reviewed all three NRQL examples against documented aggregation, filtering, faceting, time-window, and timeseries syntax. The throughput example matches New Relic's documented rate-of-sum pattern. One-minute buckets with one-second normalization express jobs per second.
- The derivative warning is mathematically sound: differentiating interval counts measures their change, rather than recovering the original work volume. The prose does not offer nested derivative syntax as an executable query.
- The exposition is valid OpenMetrics 1.0: the family name in TYPE omits the counter sample's `_total` suffix, the labels are valid, and the EOF marker terminates the exposition. This is not an assertion that every legacy parser supports this representation; the post explicitly requires checking compatibility and the detected type in the deployed collector.
- The migration documentation confirms that legacy collection uses scraped type metadata and that collector migration can change labels and type handling. The article appropriately scopes its advice to legacy collection and points Kubernetes users to migration guidance.
- The count/cumulativeCount distinction for remote write and OpenTelemetry is supported by the metric type reference. The post appropriately avoids treating every ingestion path as identical.
- Reset and scrape-gap cautions are appropriate: a reset can discard unobserved increments, and missing observations do not prove inactivity. Exact first-sample and restart behavior remains explicitly dependent on the installed integration version; no historical recovery guarantee is made.
- Duplicate ingestion and producer identity checks are valid operational diagnostics. Exporter-provided labels are clearly stated assumptions, rather than universal integration attributes.
- All four documentation links in the article resolved to their intended official resources. No CLI commands or integration configuration snippets required validation.
- This was a documentation and semantic review. Queries were not executed against a live New Relic account, and no deployed collector or exporter was available for runtime compatibility testing. README.md required no changes.
