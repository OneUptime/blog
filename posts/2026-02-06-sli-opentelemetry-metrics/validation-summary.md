# Validation Summary: How to Define and Measure Service Level Indicators Using OpenTelemetry Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Metrics
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OTLP gRPC metrics export
- Prometheus
- PromQL
- Service Level Indicators

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python SDK view API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Prometheus compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- OpenTelemetry Prometheus metrics exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Google SRE book, Service Level Objectives chapter: https://sre.google/sre-book/service-level-objectives/

## Issues Found
- The post said each SLI category maps directly to an OpenTelemetry metric type. This was too strong because throughput is normally derived as a rate over a counter rather than represented by a distinct throughput instrument type. Changed the sentence to say these SLIs can be represented with OpenTelemetry metrics.
- The total request counter was named `http.server.request.total`. OpenTelemetry-to-Prometheus translation appends `_total` for counters, so this would produce an awkward `http_server_request_total_total` Prometheus name. Renamed the counter to `http.server.requests` and updated the PromQL query to `http_server_requests_total`.
- The examples used the older `http.method` attribute. Updated it to the current stable HTTP semantic convention attribute `http.request.method`.
- The examples used `request.path` for `http.route`. OpenTelemetry requires `http.route` to be a low-cardinality route template when available, so the examples now use `request.route_template`.
- The latency histogram used the stable semantic-convention metric name `http.server.request.duration` but recorded milliseconds with unit `ms`. The OpenTelemetry HTTP metric convention defines this metric in seconds with unit `s`. Updated the histogram to record seconds and changed the bucket boundaries accordingly.
- The latency PromQL query used `http_server_request_duration_bucket{le="200"}` and `http_server_request_duration_count`. With OpenTelemetry Prometheus translation and unit `s`, the expected names include the `_seconds` unit suffix and the boundary is `0.2`. Updated the query to use `http_server_request_duration_seconds_bucket{le="0.2"}` and `http_server_request_duration_seconds_count`.

## Review Notes
The Collector configuration fields shown are plausible for the Prometheus exporter, but Prometheus name translation can vary if a deployment changes the exporter translation strategy or disables suffixes. The queries now match the default OpenTelemetry Prometheus translation behavior documented by OpenTelemetry.
