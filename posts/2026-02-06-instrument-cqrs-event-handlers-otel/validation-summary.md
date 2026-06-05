# Validation Summary: How to Instrument CQRS Event Handlers with OpenTelemetry for Separate Read

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- CQRS command, query, and projection handlers
- Prometheus / PromQL dashboard queries
- Distributed tracing span links and error status recording

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Prometheus client compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/

## Issues Found
- The post claimed the `cqrs.side` attribute was present on every span and metric, but the metric recordings did not include it. Added `cqrs.side` attributes to command, event, query, result-size, and projection-lag metric points.
- The query handler recorded exceptions but did not set span status to `ERROR`, unlike the command handler and OpenTelemetry Python's recommended pattern. Added `span.set_status(trace.Status(trace.StatusCode.ERROR))` in the query error path.
- The projection snippet used the write-side `meter` variable instead of defining a projection-specific meter. Added `projection_meter = metrics.get_meter("cqrs.projection")` and used it for `cqrs.projection.lag`.
- The projection handler did not record exceptions or mark failed projection spans as errors. Wrapped `self.apply(event)` in a `try` / `except` block that records the exception, sets `ERROR` status, and preserves the original exception.
- The PromQL histogram examples omitted the default Prometheus unit suffix added for OpenTelemetry histograms with `unit="ms"`. Updated the query and projection histogram metric names to `cqrs_query_duration_milliseconds_bucket` and `cqrs_projection_lag_milliseconds_bucket`.

## Review Notes
The Python snippets compile after the edits. The PromQL metric names assume the default OpenTelemetry Prometheus translation strategy, which escapes dots to underscores and appends unit/type suffixes; deployments configured with a different translation strategy may expose different names.
