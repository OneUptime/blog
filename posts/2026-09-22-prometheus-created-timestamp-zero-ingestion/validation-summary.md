# Validation Summary: How to Enable Created-Timestamp Zero Ingestion Without Polluting Prometheus with `_created` Series

## Status
validated

## Post Type
Technical configuration guide with Bash, YAML, Go, OpenMetrics exposition, and PromQL examples.

## Technologies Covered
- Prometheus feature flags, scrape negotiation, and TSDB storage
- OpenMetrics 1.0 text exposition and counter creation timestamps
- Prometheus protobuf exposition
- Go Prometheus client library and `promhttp`
- PromQL

## Sources Consulted
- Prometheus feature flags: https://prometheus.io/docs/prometheus/latest/feature_flags/#start-created-timestamps-zero-injection
- Prometheus command-line reference: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- OpenMetrics 1.0 specification: https://prometheus.io/docs/specs/om/open_metrics_spec/
- Go client `promhttp.HandlerOpts` API documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp#HandlerOpts
- Prometheus scrape implementation: https://github.com/prometheus/prometheus/blob/main/scrape/scrape.go
- Prometheus OpenMetrics parser: https://github.com/prometheus/prometheus/blob/main/model/textparse/openmetricsparse.go
- Prometheus feature-flag processing: https://github.com/prometheus/prometheus/blob/main/cmd/prometheus/main.go
- Prometheus TSDB appender: https://github.com/prometheus/prometheus/blob/main/tsdb/head_append.go
- PromQL querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/

## Issues Found
- **Incomplete OpenMetrics response content type.** The endpoint-verification instruction omitted `charset=utf-8`. Updated it to `application/openmetrics-text; version=1.0.0; charset=utf-8`, as required by the OpenMetrics 1.0 specification. Prometheus may accept the shorter header, but it is not the complete standards-required value.

## Review Notes
- Confirmed that the historical `created-timestamp-zero-ingestion` flag remains documented and implemented. The Bash command uses valid configuration, storage, and feature flag options. Enabling a process flag requires a process restart rather than a YAML reload.
- The YAML example uses supported, case-sensitive protocol names and valid scrape/static-target structure. The documented flag changes protocol defaults; an explicit job-level list controls that job's preference. Exporter support remains necessary.
- The OpenMetrics counter family correctly uses the base name in TYPE/HELP metadata, `_total` for the cumulative value, matching labels for `_created`, a Unix timestamp in seconds, and the EOF terminator. Creation time must describe the counter lifecycle rather than each scrape or an unrelated intermediary's startup.
- Both Go handler options exist in the current API. The snippet is valid inside an existing Go function with the `promhttp` import and a compatible registry; it is intentionally not a standalone program. The created-sample option concerns OpenMetrics text exposition.
- Source inspection confirms that the zero-ingestion scrape path supplies `OpenMetricsSkipSTSeries` to the parser. The parser's skip logic considers metric type as well as the suffix, supporting the distinction between creation components and ordinary gauges named with `_created`.
- Zero insertion is conditional. The TSDB rejects a start timestamp at or after the observed sample timestamp, and existing series history can prevent insertion. The post appropriately avoids promising a zero on every scrape.
- The PromQL selector is valid. To inspect actual stored timestamps during rollout, evaluate a range-vector selector such as `worker_jobs_total{job="workers"}[5m]` as an instant query. A graph range query evaluates expressions at steps and is not a raw-sample dump.
- Existing stored creation series are not retroactively deleted by enabling this feature; historical samples remain subject to retention. Absence of newly stored `_created` samples should be checked separately from successful zero insertion.
- Feature flags are experimental and behavior can vary by release. The linked latest documentation and main-branch source are moving references. The current docs also describe separate start-timestamp storage/query features; these do not invalidate this guide's zero-ingestion workflow.
- Review used official documentation and implementation inspection. No live exporter, Prometheus ingestion test, or Go compilation was performed. Only the content-type correction was needed in the post.
