# Validation Summary: How to Build Automated Incident Severity Classification from OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry metrics and semantic conventions
- OpenTelemetry Python metrics API
- OpenTelemetry Collector OTLP receiver, resource processor, batch processor, and OTLP exporter
- Prometheus / PromQL
- Python
- YAML

## Sources Consulted
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The post used `http.server.request.count` / `http_server_request_count_total` and `status_code` in examples. Current OpenTelemetry HTTP server metrics define `http.server.request.duration` as the stable request duration histogram and use `http.response.status_code`; Prometheus translation commonly exposes the histogram count and buckets as `http_server_request_duration_seconds_count` and `http_server_request_duration_seconds_bucket`, with labels such as `http_response_status_code`. Updated the severity rule and PromQL examples accordingly.
- The p99 latency PromQL used `histogram_quantile` directly over bucket rates without preserving the `le` label. Updated the query to use `sum by (le) (...)`, which matches Prometheus guidance for classic histograms.
- The Python classifier referenced `_query_metric` and `_check_condition` but did not define them, so the example would fail at runtime. Added concise implementations for querying Prometheus and evaluating the rule conditions shown in the post.
- The example used `datetime.utcnow()`, which is discouraged in modern Python because it returns a naive datetime. Replaced it with `datetime.now(timezone.utc)`.
- The OpenTelemetry counter was named `incident.classification.total`, which can conflict with Prometheus counter suffix translation. Renamed it to `incident.classification` so the Prometheus query naturally uses `incident_classification_total`.
- The Collector OTLP exporters targeted local gRPC endpoints without TLS configuration. Added `tls.insecure: true` for the example endpoints, consistent with Collector exporter TLS configuration for non-TLS local service traffic.

## Review Notes
The examples are still illustrative and assume the backend exposes OpenTelemetry resource attributes as Prometheus labels such as `service_name`. Different Prometheus exporters, remote-write paths, or backend translation settings can change metric and label names, so production users should confirm the exact names in their own metrics store.
