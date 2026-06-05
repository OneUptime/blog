# Validation Summary: How to Trace Plagiarism Detection Service Processing Time with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- OpenTelemetry tracing
- OpenTelemetry metrics
- Plagiarism detection pipelines

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/

## Issues Found
- The span status example passed `StatusCode.ERROR` directly with a description. The current OpenTelemetry Python documentation shows setting status with a `Status` object, so the import and call were updated to `Status(StatusCode.ERROR, "...")`.
- The observable gauge example created `plagiarism.queue_depth` without a callback. OpenTelemetry Python asynchronous instruments report observations through callbacks, so a minimal `observe_queue_depth` callback returning an `Observation` was added.

## Review Notes
The examples are illustrative and still assume application-specific helpers such as `get_file_size_kb`, `extract_text_from_pdf`, `query_fingerprint_index`, and `get_queue_depth` exist in the surrounding application code.
