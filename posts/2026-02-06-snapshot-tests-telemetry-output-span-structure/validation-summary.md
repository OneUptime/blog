# Validation Summary: How to Build Snapshot Tests for Telemetry Output to Catch Unexpected Span

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- pytest
- pytest-snapshot
- OpenTelemetry Python SDK
- OpenTelemetry semantic conventions
- DeepDiff
- GitHub Actions

## Sources Consulted
- OpenTelemetry Python SDK source for `InMemorySpanExporter`: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/export/in_memory_span_exporter.py
- OpenTelemetry Python SDK trace export API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python `trace.set_tracer_provider` source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/trace.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry HTTP semantic convention migration notes: https://opentelemetry.io/blog/2023/http-conventions-declared-stable/
- pytest-snapshot documentation: https://github.com/joseph-roitman/pytest-snapshot
- DeepDiff documentation for `ignore_order`: https://zepworks.com/deepdiff/current/ignore_order.html
- GitHub Actions Python build and test documentation: https://docs.github.com/en/actions/tutorials/build-and-test-code/python

## Issues Found
- The OpenTelemetry Python import path for `InMemorySpanExporter` was incorrect. Changed `opentelemetry.sdk.trace.export.in_memory` to `opentelemetry.sdk.trace.export.in_memory_span_exporter`, which matches the current SDK module.
- The `install()` docstring said the global tracer provider was replaced. Updated it to say the provider is set before application instrumentation initializes, because `trace.set_tracer_provider` is intended to set the global provider and cannot reliably replace an already initialized provider.
- The example snapshot used older HTTP semantic convention keys. Changed `http.method` to `http.request.method` and `http.status_code` to `http.response.status_code`.
- The example snapshot used older database semantic convention keys. Changed `db.operation`, `db.sql.table`, and `db.system` to `db.operation.name`, `db.collection.name`, and `db.system.name`.
- The example snapshot used the older `messaging.operation` key. Changed it to `messaging.operation.type`.
- The HTTP server span showed status code `OK` for a successful 201 response. Changed it to `UNSET`, matching OpenTelemetry HTTP semantic convention guidance for successful HTTP spans.
- The example root span had `child_count` set to 3 while only two child spans were shown. Changed it to 2.
- Updated the illustrative snapshot diff so it uses the corrected HTTP attribute names.

## Review Notes
The examples are syntactically valid Python and the pytest-snapshot command syntax is valid for the referenced plugin. In real test suites, the global tracer provider should be installed before application code or auto-instrumentation creates tracers; otherwise existing instrumentation may keep using the earlier provider.
