# Validation Summary: How to Manage Metric Cardinality in Prometheus

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus configuration and metric relabeling
- Prometheus HTTP API
- Prometheus recording and alerting rules
- Python prometheus-client
- Go prometheus/client_golang
- Grafana dashboard queries

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus PromQL querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus PromQL operators and aggregation documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus metric and label naming best practices: https://prometheus.io/docs/practices/naming/
- Prometheus Python client Counter documentation: https://prometheus.github.io/client_python/instrumenting/counter/
- Prometheus Go client package documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Python re module documentation: https://docs.python.org/3/library/re.html

## Issues Found
- The exploding-label-combinations examples used invalid label syntax without label values. Updated them to valid Prometheus-style label sets while preserving the intended bad/good comparison.
- The Python and Go path normalization examples replaced numeric IDs before UUIDs, which could corrupt UUID paths before the UUID pattern matched. Reordered the replacement and tightened numeric ID matching to path segments.
- The Go example used `string(status)`, which converts an integer to a Unicode code point rather than a decimal status-code string. Replaced it with `strconv.Itoa(status)`.
- The label-drop relabeling example included `action: keep`, which filters/drops entire metrics rather than dropping labels. Replaced it with a `labeldrop` pattern example.
- The standalone `metric_relabel_configs` snippets were shown as if they were top-level `prometheus.yml` fields. Wrapped them in `scrape_configs` context.
- The status-code relabeling comment said it bucketed status codes. Since the snippet adds a `status_class` label without removing or aggregating `status_code`, changed the wording to say it adds a status class for aggregation.
- The recording-rule section claimed aggregation happened before storage. Prometheus recording rules save the result as new time series after evaluating PromQL over ingested data, so the section was corrected to "Aggregate After Ingestion" and the misleading drop-original comments were removed.

## Review Notes
Prometheus configuration validation with `promtool` and Go compilation could not be run because `promtool` and `go` are not installed in this environment. Static review was completed against the official documentation, and the Python path normalization logic was locally tested with representative paths.
