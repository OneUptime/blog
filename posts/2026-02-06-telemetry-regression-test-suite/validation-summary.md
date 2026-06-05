# Validation Summary: How to Build a Telemetry Regression Test Suite That Validates Span Names,

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python SDK
- OpenTelemetry semantic conventions
- Python
- pytest
- YAML
- GitHub Actions

## Sources Consulted
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python SDK source for InMemorySpanExporter: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/export/in_memory_span_exporter.py
- OpenTelemetry Python Status API documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/trace/status.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- pytest command-line option reference: https://docs.pytest.org/en/latest/reference/reference.html
- pytest skip documentation: https://docs.pytest.org/latest/skipping.html

## Issues Found
- The OpenTelemetry Python import path for the in-memory exporter was incorrect. Changed `opentelemetry.sdk.trace.export.in_memory` to `opentelemetry.sdk.trace.export.in_memory_span_exporter`, matching the current OpenTelemetry Python SDK source.
- Several example semantic attribute names used older OpenTelemetry conventions. Updated HTTP attributes to `http.request.method` and `http.response.status_code`, database attributes to `db.system.name`, `db.operation.name`, and `db.namespace`, and messaging destination to `messaging.destination.name`. Added `messaging.operation.name` because the current messaging span conventions require the operation name.
- The YAML spec declared span kind and attribute types, but the test runner did not validate them. Added span kind validation and basic type validation for the declared `string` and `int` attributes.
- The status-code test used `status.is_ok`, which treats both `OK` and `UNSET` as non-error in OpenTelemetry Python. Changed the test to compare the actual `StatusCode` enum value against the expected spec value.
- The snapshot test snippet used `pytest.skip`, `exercise_api`, and `exporter` without importing them. Added the missing imports.

## Review Notes
The example now validates an exact `OK` status. In OpenTelemetry, successful spans are often left as `UNSET` unless the application or instrumentation explicitly sets `OK`, so teams should set the expected status in the YAML file to match the instrumentation they actually emit.
