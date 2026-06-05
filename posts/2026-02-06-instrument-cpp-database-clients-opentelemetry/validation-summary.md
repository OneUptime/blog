# Validation Summary: How to Instrument C++ Database Clients with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry C++ API
- OpenTelemetry tracing spans and context propagation
- OpenTelemetry database semantic conventions
- C++ database client instrumentation
- SQL query, prepared statement, connection pool, async, and transaction tracing patterns

## Sources Consulted
- OpenTelemetry C++ instrumentation documentation: https://opentelemetry.io/docs/languages/cpp/instrumentation/
- OpenTelemetry C++ API reference for `Tracer`, `StartSpan`, `WithActiveSpan`, `Span`, and `StartSpanOptions`: https://opentelemetry-cpp.readthedocs.io/_/downloads/en/latest/pdf/
- OpenTelemetry C++ source for `StartSpanOptions`: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/api/include/opentelemetry/trace/span_startoptions.h
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry SQL database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/sql/
- OpenTelemetry recording errors semantic convention: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/

## Issues Found
- Updated older database semantic attributes (`db.system`, `db.name`, `db.statement`, `db.operation`, `net.peer.name`, `net.peer.port`) to current stable names such as `db.system.name`, `db.namespace`, `db.query.text`, `db.operation.name`, `server.address`, and `server.port`.
- Removed successful `SetStatus(trace::StatusCode::kOk)` calls. Current OpenTelemetry guidance says span status must be left unset for successful operations and set to error only for failed operations.
- Added explicit `span->End()` calls in query execution success and error paths; `WithActiveSpan` controls active context and does not replace explicit span lifecycle management.
- Replaced the invalid transaction child span call `StartSpan(..., {}, transaction_span_->GetContext())` with `StartSpanOptions::parent`, which is the supported C++ API for explicit parent selection.
- Changed custom connection pool, timing, parameter count, and transaction attributes from reserved-looking `db.*` names to `app.db.*` names.
- Sanitized free-form SQL before storing it in `db.query.text`, matching current guidance that non-parameterized query text should not be collected by default unless sensitive literal values are redacted.
- Updated tracer member and parameter types to `opentelemetry::nostd::shared_ptr<trace::Tracer>`, matching the OpenTelemetry C++ API return type.
- Made the scoped connection wrapper move-only so copied objects cannot double-release the same pooled connection.
- Adjusted async context handling so the worker thread restores the caller context and makes the database span active while the query runs.
- Fixed transaction finalization tracking so the destructor does not try to mutate an already-ended span after a commit failure path.

## Review Notes
The database client, connection pool, prepared statement, and transaction classes are illustrative placeholders rather than directly compilable code against a named SQL library. The OpenTelemetry API usage and semantic convention names have been corrected, but a production implementation should map row counts, error codes, and query summaries to the exact database driver behavior.
