# Validation Summary: How to Use SRE Golden Signals with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry semantic conventions for HTTP and system metrics
- OpenTelemetry OTLP exporter
- OpenTelemetry Collector configuration
- Flask middleware instrumentation
- Python psutil resource measurements
- Google SRE four golden signals

## Sources Consulted
- OpenTelemetry Python metrics SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP span status guidance: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry general metric naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry system metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/filterprocessor
- Google SRE Book, Monitoring Distributed Systems: https://sre.google/sre-book/monitoring-distributed-systems/

## Issues Found
- The HTTP duration histogram used `unit="ms"` and recorded millisecond values while using the semantic-convention metric name `http.server.request.duration`, which is defined in seconds. Updated the helper and Flask middleware to record seconds, set `unit="s"`, and added the recommended explicit bucket boundaries.
- The HTTP duration metric omitted the required `url.scheme` attribute. Updated the latency, traffic, and error helpers to include the request scheme from Flask.
- The HTTP duration metric did not set `error.type` for failed server requests. Added `error.type` for 5xx responses while leaving it unset for successful requests.
- The resource example used `deployment.environment`, while current OpenTelemetry documentation uses `deployment.environment.name`. Updated the resource attribute.
- The counter metric names used Prometheus-style `_total` suffixes. Updated them to OpenTelemetry-style `.count` names and adjusted dashboard query references.
- The counter units used `1` for countable request/message/error measurements. Updated them to UCUM annotation units such as `{request}`, `{message}`, and `{error}`.
- The saturation gauges used percent values and `unit="%"` with semantic-convention utilization metric names. Updated them to ratio values in the `[0, 1]` range with `unit="1"` and adjusted dashboard thresholds to `0.80` and `0.95`.
- The Collector filter processor comment and component name described dropping high-cardinality attributes, but the shown config filters metrics by metric name. Updated the wording and processor name to describe dropping temporary metrics by name.

## Review Notes
The examples are now technically aligned with current OpenTelemetry documentation. The Collector YAML was structurally parsed locally, but `otelcol` was not installed in the environment, so runtime Collector validation could not be executed.
