# Validation Summary: Build a Service Catalog with Automatic Health Scores from OpenTelemetry Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry HTTP server and client metrics
- OpenTelemetry-to-Prometheus metric translation
- Prometheus and PromQL
- Python dataclasses and type hints
- Flask REST APIs

## Sources Consulted
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus guide for using Prometheus as an OpenTelemetry backend: https://prometheus.io/docs/guides/opentelemetry/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/
- Flask JavaScript, fetch, and JSON pattern documentation: https://flask.palletsprojects.com/en/stable/patterns/javascript/
- Python `datetime` documentation: https://docs.python.org/3.12/library/datetime.html

## Issues Found
- The PromQL examples filtered by `service_name`, but OpenTelemetry's `service.name` resource attribute is commonly mapped to Prometheus `job` by the Prometheus OTLP path and is not automatically a `service_name` metric label. Updated the explanatory text and PromQL filters to use `job="{service_name}"`.
- The post referenced the OpenTelemetry metric name `http.server.request.duration` while querying Prometheus-normalized names. Added wording that the examples assume the default OpenTelemetry-to-Prometheus translation strategy, where the metric is exposed as `http_server_request_duration_seconds`.
- The API section claimed the example refreshes and caches scores every minute, but the code computes scores on request and contains no cache. Changed the text to say this is a production option rather than behavior shown by the snippet.
- The Flask example used `datetime.utcnow()`, which is deprecated in Python 3.12 and returns a naive datetime. Updated it to `datetime.now(timezone.utc).isoformat()`.
- Two scoring comments used exclusive thresholds (`>5%` errors and `>50%` throughput drop) while the formulas return zero at exactly those thresholds. Updated the comments to `>=`.

## Review Notes
The PromQL examples are plausible for a Prometheus backend using default OpenTelemetry metric translation and `job` labels derived from `service.name`. Environments that promote resource attributes directly to metric labels, use Prometheus 3.x UTF-8 names without suffix translation, or rely on Collector transforms may need adjusted metric and label names.
