# Validation Summary: How to Use OpenTelemetry Metrics for Automated Performance Regression Detection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript metrics API and SDK
- OTLP/HTTP metrics exporter
- OpenTelemetry HTTP metric semantic conventions
- OpenTelemetry-to-Prometheus metric translation
- Prometheus PromQL histogram queries
- GitHub Actions
- Docker Compose
- Node.js
- Python

## Sources Consulted
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Prometheus client library compatibility guidance: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Prometheus histogram and `histogram_quantile()` documentation: https://prometheus.io/docs/practices/histograms/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The latency histogram used `http.request.duration` with `unit: "ms"`, but current OpenTelemetry HTTP metric semantic conventions define server request duration as `http.server.request.duration` with unit `s`. Updated the metric name, unit, description, and recording code to record seconds while still returning milliseconds from the helper for local test results.
- The Prometheus query used `http_request_duration_bucket`, which did not match OpenTelemetry-to-Prometheus translation for the corrected metric and unit. Updated the query to use `http_server_request_duration_seconds_bucket`.
- The baseline comparison treated `BASELINE_BRANCH="main"` as if it were a `git_commit_sha` label value, but the emitted metric only had a commit SHA attribute. Added a `git.ref` attribute and changed the Python script to compare configurable Prometheus label selectors, defaulting the current selector to the commit SHA and the baseline selector to `git_ref="main"`.
- The OTLP exporter example read `OTEL_EXPORTER_OTLP_ENDPOINT` as a full metrics endpoint URL. Updated it to use the signal-specific `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, which the OTLP specification defines as the metrics endpoint used as-is.
- The GitHub Actions example used the legacy standalone `docker-compose` invocation. Updated it to the current Docker Compose V2 `docker compose` command.
- The workflow used `python compare_perf_metrics.py`, which depends on a `python` alias. Updated it to `python3 compare_perf_metrics.py` to match current Ubuntu runner conventions and the local validation environment.

## Review Notes
The JavaScript snippets were checked with `node --check`, and the Python comparison script was checked with `python3 -m py_compile` after extracting the code block. The workflow remains illustrative: in a real CI environment, the collector and Prometheus configuration must ensure both current test metrics and baseline metrics are available in the queried Prometheus-compatible backend.
