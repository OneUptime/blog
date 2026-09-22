# Validation Summary: How to Query Counter Deltas in Legacy New Relic OpenMetrics

## Status
validated

## Post Type
Technical guide with NRQL query examples and a Prometheus text exposition example for the legacy collector.

## Technologies Covered
- New Relic dimensional metrics and NRQL
- Legacy New Relic Prometheus OpenMetrics integration (`nri-prometheus`)
- Prometheus counters, text 0.0.4 exposition, and OpenMetrics 1.0 parser compatibility
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
- New Relic, nri-prometheus v2.30.4 decoder: https://github.com/newrelic/nri-prometheus/blob/v2.30.4/internal/pkg/prometheus/prometheus.go
- New Relic, nri-prometheus v2.30.4 metric conversion: https://github.com/newrelic/nri-prometheus/blob/v2.30.4/internal/integration/fetcher.go
- New Relic, nri-prometheus v2.30.4 dependency versions: https://github.com/newrelic/nri-prometheus/blob/v2.30.4/go.mod
- Prometheus, exposition formats: https://prometheus.io/docs/instrumenting/exposition_formats/

## Issues Found
1. **Counter fixture incompatible with the legacy collector's text parser.** The original fixture was valid OpenMetrics 1.0 but declared `worker_jobs` as the counter family while emitting `worker_jobs_total`. In nri-prometheus v2.30.4, the hard-coded Prometheus text decoder parses that sample as untyped, which the collector converts to a gauge. Replaced it with a Prometheus text 0.0.4 fixture whose `TYPE` declaration names `worker_jobs_total`, removed the OpenMetrics EOF marker, and documented the version-specific limitation with pinned source. NRQL query semantics remain unchanged.

## Review Notes
- Verified the legacy cumulative-counter-to-delta-count mapping and use of `sum` for stored count metrics. The arithmetic is correct: 130 - 100 = 30, 175 - 130 = 45, and 30 + 45 = 75; adding the two cumulative observations gives 305.
- Reviewed all three NRQL examples against documented aggregation, filtering, faceting, time-window, and timeseries syntax. The throughput example matches New Relic's documented rate-of-sum pattern. One-minute buckets with one-second normalization express jobs per second.
- The derivative warning is mathematically sound: differentiating interval counts measures their change, rather than recovering the original work volume. The prose does not offer nested derivative syntax as an executable query.
- Reproduced the parser behavior locally using `github.com/prometheus/common v0.70.1`, the dependency pinned by nri-prometheus v2.30.4, and `expfmt.NewDecoder(..., expfmt.FmtText)`. The original fixture returned `worker_jobs_total` with type `UNTYPED`; the corrected fixture returned the same family with type `COUNTER`. The collector's pinned conversion source maps untyped metrics to gauges and counters to counter handling.
- The migration documentation confirms that legacy collection uses scraped type metadata and that collector migration can change labels and type handling. The article appropriately scopes its advice to legacy collection and points Kubernetes users to migration guidance.
- The count/cumulativeCount distinction for remote write and OpenTelemetry is supported by the metric type reference. The post appropriately avoids treating every ingestion path as identical.
- Reset and scrape-gap cautions are appropriate: a reset can discard unobserved increments, and missing observations do not prove inactivity. Exact first-sample and restart behavior remains explicitly dependent on the installed integration version; no historical recovery guarantee is made.
- Duplicate ingestion and producer identity checks are valid operational diagnostics. Exporter-provided labels are clearly stated assumptions, rather than universal integration attributes.
- The original four documentation links and the added pinned decoder link resolve to their intended official resources. No CLI commands or integration configuration snippets required validation.
- Validation included official documentation and source review plus the local parser reproduction above. Queries were not executed against a live New Relic account, and no deployed collector or exporter was used for an end-to-end ingestion test.
