# Validation Summary: How to Implement Tempo Trace Discovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Tempo (distributed tracing backend)
- TraceQL query language
- Grafana Explore (trace UI)
- OpenTelemetry (Python and Go SDKs)
- Tempo Helm charts
- Parquet block storage (vParquet3)
- OTLP/gRPC trace export

## Sources Consulted
- Grafana Tempo configuration docs: https://grafana.com/docs/tempo/latest/configuration/
- TraceQL reference: https://grafana.com/docs/tempo/latest/traceql/
- TraceQL metrics: https://grafana.com/docs/tempo/latest/traceql/metrics-queries/
- Tempo dedicated attribute columns: https://grafana.com/docs/tempo/latest/operations/dedicated_columns/
- Grafana Tempo data source provisioning: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Go SDK (`go.opentelemetry.io/otel`) and semconv v1.17.0 package
- Tempo Helm charts (`grafana/tempo`, `grafana/tempo-distributed`): https://github.com/grafana/helm-charts

## Issues Found
1. **Invalid Tempo `overrides.defaults.search.resource_attributes`/`span_attributes` block.** Tempo overrides do not contain a `search` section with explicit attribute index lists. With vParquet blocks all attributes are searchable by default; attribute search performance is improved by promoting attributes to dedicated columns. Replaced with the correct `storage.trace.block.parquet_dedicated_columns` configuration and moved the search tunables under `query_frontend.search`, where they actually live.

2. **Invalid top-level `search:` config in `tempo.yaml`.** Settings such as `concurrent_jobs` and `max_result_limit` are not under a top-level `search:` block. They belong under `query_frontend.search`. Restructured accordingly and used realistic defaults (`concurrent_jobs: 1000`, `default_result_limit: 20`, `max_result_limit: 0`).

3. **Helm chart used a fictitious `tempo.searchEnabled` and mirrored the bogus overrides.** The Grafana Tempo Helm charts have no `searchEnabled` toggle (search is always available in modern Tempo) and the `overrides.search.*_attributes` keys do not exist. Rewrote the snippet to use `tempo.structuredConfig`, which is the canonical way to pass Tempo configuration through both `grafana/tempo` and `grafana/tempo-distributed` charts.

4. **Dashboard panel used invalid TraceQL `count() by (...)`.** `count()` in TraceQL is a span-set filter (e.g. `{ ... } | count() > 5`), not a grouping aggregator. Grouping requires TraceQL metrics functions such as `count_over_time() by (...)`. Since the panel is configured as a regular `traceql` search (not a metrics query), simplified the query to `{ status = error && duration > 500ms }`.

## Review Notes
- The post pins `semconv v1.17.0` in the Go example. That works, but the OpenTelemetry Go semantic-conventions package now ships v1.26.0+; readers on newer stacks should pick the version closest to their SDK release.
- `db.statement` is still supported but has been superseded by `db.query.text` in newer OpenTelemetry semantic conventions. Not changed because `db.statement` still works and matches what most current code emits.
- `vParquet3` is correct and widely deployed; Tempo 2.6+ added `vParquet4` (the current default in recent releases). Either is valid.
- Grafana data source field `jsonData.tracesToLogs` is deprecated in favor of `tracesToLogsV2`, but the legacy field still works. Left as-is since the example is otherwise valid and replacing it would require restructuring.
- The Grafana data source `search.hide: false` field is a long-standing legacy toggle that still works; no change needed.
- Python OTLP gRPC endpoint accepts URLs with scheme; Go OTLP gRPC `WithEndpoint` expects `host:port` only — both code examples follow the correct conventions for their respective SDKs.
