# Validation Summary: How to Create Custom Span Attributes for Business Domain Modeling

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry span attributes and events
- OpenTelemetry semantic conventions
- Python OpenTelemetry API
- Java OpenTelemetry API

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python Span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry common specification concepts: https://opentelemetry.io/docs/specs/otel/common/
- OpenTelemetry semantic convention naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry HTTP semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry database semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/db/

## Issues Found
- Deprecated HTTP semantic convention attribute names were used in examples. Changed `http.status_code` to `http.response.status_code` and `http.method` to `http.request.method` because current OpenTelemetry HTTP semantic conventions mark the older names as deprecated.
- Deprecated database semantic convention attribute name was used in examples. Changed `db.system` to `db.system.name` because current OpenTelemetry database semantic conventions mark `db.system` as deprecated.
- The naming guidance recommended `app.` as a generic custom prefix. Changed this to recommend an application name, organization prefix, or reverse domain name, matching OpenTelemetry's guidance to avoid collisions with existing or future semantic convention namespaces.
- The Java snippet used `StatusCode.ERROR` without importing `StatusCode` and included an unused `Attributes` import. Added the missing `StatusCode` import and removed the unused import.
- The Java snippet declared two public top-level classes in one code block. Made the attribute holder package-private so the block is valid when used as a single Java file.
- The Python helper snippet used `datetime.now()` without importing `datetime`. Added `from datetime import datetime`.
- The Python error-handling snippet used status setting in a form that was less aligned with official Python examples. Updated it to construct a `trace.Status` with `trace.StatusCode.ERROR`.

## Review Notes
The trace query examples are intentionally backend-specific pseudocode rather than a portable OpenTelemetry query language. They are acceptable as illustrative examples, but a future post could label them explicitly as pseudocode or adapt them to a specific backend.
