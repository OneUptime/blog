# Validation Summary: How to Fix Metric Type Conflicts When Two Instruments Register the Same Metric

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Metrics SDK
- OpenTelemetry Python metrics API and SDK Views
- OpenTelemetry Go metrics SDK Views
- OpenTelemetry Java metrics logging behavior
- OpenTelemetry Collector metrics transform processor
- OpenTelemetry semantic conventions
- Prometheus metrics export

## Sources Consulted
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Metrics Data Model specification: https://opentelemetry.io/docs/specs/otel/metrics/data-model/
- OpenTelemetry Python metrics instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python SDK View API docs: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.view.html
- OpenTelemetry Go SDK metric package docs: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Collector metrics transform processor docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/metricstransformprocessor
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry RPC metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/rpc-metrics/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/

## Issues Found
- The post described metric-name conflicts as global across all metric names. Updated the explanation to match the SDK specification: duplicate instrument registration is scoped to identical Meters from the same MeterProvider, and distinct Meters are separate namespaces for duplicate detection.
- The post said one conflicting instrument would be dropped or ignored and that SDKs typically return the first registered instrument. Updated this to say SDKs should return functional instruments and warn unless a View resolves the conflict; exporter/backend behavior may still surface semantic errors.
- The library/application and module examples used different Meter names while claiming an SDK conflict. Updated the examples to use the same Meter and added a note that distinct Meters are separate namespaces.
- The Go error handler snippet imported only `go.opentelemetry.io/otel` while using `log.Printf`. Added the missing `log` import.
- The Python View example used `metrics.Histogram` from the API import. Updated it to import and use `Histogram` from `opentelemetry.sdk.metrics`, matching the Python SDK View API.
- The custom request duration example used `unit="ms"`. Updated it to `unit="s"` to align with OpenTelemetry semantic convention guidance for duration metrics.
- The Collector processor snippet used the older `metricstransform` component name. Updated it to the current `metrics_transform` name and clarified that Collector renaming happens after SDK registration warnings.
- The auto-instrumentation metric list included the older RPC metric name `rpc.server.duration`. Updated it to `rpc.server.call.duration`.
- The closing statement described conflicts as silent data loss. Updated it to a more accurate warning that conflicts can become data quality issues if SDK warnings or backend errors are missed.

## Review Notes
The post is technically relevant and validated after corrections. The warning text examples are intentionally approximate because exact log messages vary by language SDK and version.
