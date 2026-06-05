# Validation Summary: How to Monitor Media Asset Management Workflow Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OpenTelemetry trace exception/status semantics
- Media Asset Management / Digital Asset Management workflow observability

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python trace API source documentation for `start_as_current_span`: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/trace.html
- OpenTelemetry Python span API documentation for `record_exception` and `set_status`: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry trace exception semantic conventions: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry trace API specification for span status: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Python metrics SDK documentation for UCUM units: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html

## Issues Found
- The storage byte histogram used `unit="bytes"`. OpenTelemetry recommends UCUM units for metric metadata, and the Python metrics SDK documentation gives `By` as the byte unit. Changed it to `unit="By"`.
- The ingest workflow manually called `span.record_exception(e)` but did not explicitly set the OpenTelemetry span status to error. Added `span.set_status(Status(StatusCode.ERROR, str(e)))`, and imported `Status` and `StatusCode`.
- Because `start_as_current_span` records exceptions automatically by default, the outer ingest span could record the same exception twice after the manual `span.record_exception(e)` and re-raise. Changed the outer ingest span to `record_exception=False` so the manually recorded exception remains the single outer exception event.

## Review Notes
The examples are illustrative and depend on application-specific helper functions such as `generate_asset_id`, `validate_file`, and `search_engine.query`. The snippets are syntactically valid Python after review, and the OpenTelemetry API calls use current documented APIs. A real application still needs SDK/exporter setup for telemetry to be emitted; this post focuses on instrumentation points rather than collector or exporter configuration.
