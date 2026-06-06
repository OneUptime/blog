# Validation Summary: How to Build Your First Custom Span in OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry tracing API and semantic conventions
- OpenTelemetry Python API and SDK
- OpenTelemetry JavaScript API
- OpenTelemetry Go API
- OpenTelemetry Java API
- OpenTelemetry Ruby API

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python SDK trace export reference: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.export.html
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Go instrumentation docs: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Go semantic conventions package docs: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry Java API docs: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java Span Javadoc: https://www.javadoc.io/doc/io.opentelemetry/opentelemetry-api/latest/io/opentelemetry/api/trace/Span.html
- OpenTelemetry Ruby instrumentation docs: https://opentelemetry.io/docs/languages/ruby/instrumentation/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- Referenced OneUptime link: https://oneuptime.com/blog/post/2024-11-04-how-to-name-spans-in-opentelemetry/view

## Issues Found
- The first Go example assigned the result of `reserveInventory` to `inventoryResult` but never used it, which would fail Go compilation. Changed it to assign the result to `_` while preserving the error handling.
- The Go semantic-convention example imported `go.opentelemetry.io/otel/semconv/v1.21.0/httpconv` and used `httpconv.ServerRequest`, which is from older HTTP conventions. Updated the example to use the current `semconv` package and stable HTTP attributes.
- The text referenced `http.method`, an older HTTP semantic-convention attribute. Updated it to `http.request.method`.
- The database example used older `db.operation` and `db.statement` attributes. Updated them to `db.operation.name` and `db.query.text` to match current database semantic conventions.
- The JavaScript external API example used the older `http.status_code` attribute and a custom `http.duration_ms` attribute under the HTTP namespace. Updated these to `http.response.status_code` and `api.duration_ms`.
- The Ruby background-job example referenced the block-local span from the method rescue path. Added an outer `span = nil` and assigned the current span inside the block so exception handling can safely record on the span.
- The Ruby example passed a description to `OpenTelemetry::Trace::Status.ok`, while the official docs show `Status.ok` without a message and the OpenTelemetry specification ignores descriptions for OK status. Updated it to `OpenTelemetry::Trace::Status.ok`.
- The Python test example omitted imports for `trace` and `StatusCode`. Added the missing imports.
- The Python test asserted `StatusCode.OK`, but the earlier `process_order` example never explicitly sets OK status; OpenTelemetry spans default to `UNSET` when there is no error. Updated the assertion to `StatusCode.UNSET`.

## Review Notes
The examples are illustrative and still omit application-specific functions and types such as `calculate_total`, `Item`, and `PaymentResult`, which is acceptable for a tutorial. For production instrumentation, prefer setting important sampling attributes at span creation where possible because samplers can only use attributes available when the span is created.
