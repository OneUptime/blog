# Validation Summary: How to Build Traffic Forecasting Models from OpenTelemetry Request Rate Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- Prometheus Remote Write
- PromQL
- Prometheus recording rules
- Python
- NumPy
- Kubernetes
- `kubectl scale`

## Sources Consulted
- OpenTelemetry Semantic Conventions: HTTP metrics: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Collector Contrib: Prometheus Remote Write Exporter: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector Contrib: Attributes Processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- Prometheus: HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus: command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus: querying basics and subqueries: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus: query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus: recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Kubernetes: `kubectl scale`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/

## Issues Found
- Added a note that Prometheus must be started with the remote write receiver enabled when the Collector writes directly to `http://prometheus:9090/api/v1/write`. The Prometheus flag is disabled by default, so the original configuration could fail against a default Prometheus server.
- Corrected the PromQL comment that said the 4-week query was grouped by day of week. The expression computes an average over a subquery range; the day/hour decomposition is performed later in Python.
- Wrapped the aggregated PromQL expression in parentheses before applying the subquery range to make the subquery syntax explicit.
- Removed an unused Python import.
- Changed the daily peak loop to anchor days to the first forecast timestamp instead of `datetime.now()`, so the output remains correct when the latest Prometheus sample is delayed or the historical range does not end exactly at wall-clock time.
- Corrected the pre-scaling description. The script prints scheduled `kubectl scale` commands; it does not generate Kubernetes CronJob manifests.
- Removed the unused `cron` variable from the scaling schedule example.

## Review Notes
- The current OpenTelemetry HTTP semantic convention defines `http.server.request.duration` as a stable HTTP server histogram with unit seconds. With Prometheus translation suffixes, querying the `_seconds_count` series for request rate is consistent with the post's examples.
- The Collector configuration was validated with `otelcol-contrib v0.153.0`.
- Local checks: YAML snippets parsed with PyYAML, Python snippets parsed with Python `ast`, PromQL expressions parsed with `promtool v3.12.0`, the recording-rule file passed `promtool check rules`, and `validation.json` parsed with `jq`.
