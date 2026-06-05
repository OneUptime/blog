# Validation Summary: How to Monitor Tenant Data Migration and Import/Export Pipeline Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- Python async data import/export pipelines
- SaaS tenant data migration workflows

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry semantic conventions documentation: https://opentelemetry.io/docs/concepts/semantic-conventions/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/

## Issues Found
- The import pipeline snippet used `time.time()` without importing `time`. Added `import time` so the example is executable.
- The import pipeline snippet called `val_span.set_status(StatusCode.ERROR, ...)`. Current OpenTelemetry Python examples use `Status(StatusCode.ERROR, ...)` for status values. Added the `Status` import and updated the call.
- The export pipeline snippet used `trace`, `metrics`, `meter`, and `time` without defining or importing them in the shown file. Added the required imports and meter initialization.
- The export pipeline created an `export_duration` histogram but never recorded to it. Added duration measurement and `export_duration.record(...)` so the metric behaves as described.
- The migration snippet said verification failure should stop the migration before traffic cutover, but the code continued to cutover even when integrity verification failed. Added an error status and raised `RuntimeError` when verification fails.

## Review Notes
The custom attribute names are technically valid because OpenTelemetry allows application-specific attributes, but production systems should keep metric attributes low-cardinality. In particular, using `tenant.id` on metrics may be expensive or restricted in some telemetry backends.
