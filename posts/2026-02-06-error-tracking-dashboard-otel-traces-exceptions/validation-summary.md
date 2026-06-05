# Validation Summary: How to Build an Error Tracking Dashboard That Correlates OpenTelemetry Traces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing and semantic conventions
- OpenTelemetry Python API
- OpenTelemetry Collector Span Metrics Connector
- Prometheus / PromQL
- Grafana Explore and data links
- Grafana Tempo / TraceQL
- Jaeger

## Sources Consulted
- OpenTelemetry trace exception specification: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry recording errors semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Collector Contrib Span Metrics Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- Grafana Tempo TraceQL Search documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/query-editor/traceql-search/
- Grafana Explore URL documentation: https://grafana.com/docs/grafana/latest/explore/get-started-with-explore/
- Grafana data links documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/configure-data-links/

## Issues Found
- The Python example used `trace.StatusCode.ERROR`, but the current documented Python examples import `Status` and `StatusCode` from `opentelemetry.trace` and pass a `Status` object. Updated the import and `span.set_status(...)` call.
- The Python example manually recorded an exception and then re-raised it inside a `start_as_current_span` context manager. Because that context manager records and sets status for uncaught exceptions by default, updated the snippet to disable automatic exception handling and avoid duplicate exception events.
- The post attempted to group span metrics by `exception.type`, but the Span Metrics Connector dimensions are read from span or resource attributes, while `exception.type` is an exception event attribute. Updated the example to set `error.type` on the span and configured the connector to use `error.type`.
- The collector configuration used `spanmetrics`; current collector documentation says the component type has been renamed to `span_metrics`, with `spanmetrics` deprecated. Updated the connector name and pipeline references.
- The PromQL examples filtered `status_code="STATUS_CODE_ERROR"`, but the Span Metrics Connector documents the status dimension value as `Error` for error spans. Updated the PromQL filters to `status_code="Error"`.
- The PromQL examples rely on `duration_milliseconds_*` metric names. The Span Metrics Connector documentation notes that the default duration unit is changing, so the collector snippet now explicitly sets `histogram.unit: ms`.
- The Grafana Explore link used the older `left=` URL parameter and a query-builder JSON shape. Updated it to the current `panes` and `schemaVersion=1` Explore URL format with a TraceQL query using `resource.service.name` and `status = error`.

## Review Notes
- The Prometheus metric and label names shown assume the OpenTelemetry-to-Prometheus translation that normalizes dots to underscores, so `status.code` appears as `status_code` and `error.type` appears as `error_type`.
- The Tempo data link assumes the Tempo data source UID is `Tempo`; deployments with a different UID should adjust the URL template.
