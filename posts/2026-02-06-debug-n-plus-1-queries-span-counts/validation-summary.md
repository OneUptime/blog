# Validation Summary: How to Debug N+1 Database Query Problems Using OpenTelemetry Span Counts per

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python SDK
- OpenTelemetry database semantic conventions
- Python
- PostgreSQL / psycopg2
- SQL query patterns and N+1 query detection

## Sources Consulted
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry database attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/db/
- OpenTelemetry Python instrumentation guide: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python SDK SpanProcessor source documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- Psycopg 2 parameter usage documentation: https://www.psycopg.org/docs/usage

## Issues Found
- The manual instrumentation example used older database semantic convention attributes: `db.system`, `db.statement`, and `db.operation`. Updated the example to use the current stable names `db.system.name`, `db.query.text`, and `db.operation.name`.
- The row count example used `db.row_count`, which is not the current OpenTelemetry database attribute name. Updated it to `db.response.returned_rows`.
- The trace analysis example only detected database spans using the older `db.system` key and only grouped statements from `db.statement`. Updated it to support both current and legacy keys so the detector works with stable semantic conventions and older instrumentation output.
- The real-time detector attempted to mutate the current span from an `on_span_end` callback. In the OpenTelemetry Python SDK, `SpanProcessor.on_end` receives a read-only `ReadableSpan`, and `trace.get_current_span()` is not a reliable way to access the ended span's parent. Reworked the example as a `SpanProcessor` that tracks active spans from `on_start`, reads ended child spans in `on_end`, and mutates the active parent span when available.
- The batch-query example used `defaultdict` without importing it in that code block. Added the import so the example is syntactically complete.

## Review Notes
- The article's detection approach is technically sound, but real-world backends vary in trace JSON field names and attribute encoding. The example remains intentionally backend-neutral.
- `db.response.returned_rows` is listed in the OpenTelemetry database registry as a development/opt-in attribute. It is acceptable for the illustrative example, but production instrumentation should confirm backend support and cardinality limits.
