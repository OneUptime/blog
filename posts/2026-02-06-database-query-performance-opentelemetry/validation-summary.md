# Validation Summary: How to Use OpenTelemetry for Database Query Performance Optimization

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry tracing and metrics
- OpenTelemetry Python SDK and SQLAlchemy instrumentation
- OpenTelemetry JavaScript SDK
- Prisma OpenTelemetry instrumentation
- SQLAlchemy connection pool events
- OpenTelemetry database semantic conventions

## Sources Consulted
- OpenTelemetry SQLAlchemy Instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry Python Metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry JavaScript resources API: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- Prisma OpenTelemetry tracing documentation: https://www.prisma.io/docs/orm/prisma-client/observability-and-logging/opentelemetry-tracing
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database client metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-metrics/
- SQLAlchemy Core events documentation: https://docs.sqlalchemy.org/en/20/core/events.html

## Issues Found
- The Node.js Prisma example imported and instantiated `Resource` directly. Current OpenTelemetry JavaScript resource examples use `resourceFromAttributes`, so the import and SDK resource configuration were updated.
- The custom Python metrics example used deprecated database semantic convention attributes such as `db.operation`, `db.sql.table`, and `db.system`. These were updated to `db.operation.name`, `db.collection.name`, and `db.system.name`.
- The custom Python duration and returned-row metrics used non-standard database metric names and units. They were updated to `db.client.operation.duration` with seconds and `db.client.response.returned_rows` with `{row}`.
- Several custom metric units used plain words such as `queries` and `connections`. They were changed to UCUM-compatible annotated units such as `{query}` and `{connection}`.
- The `track_query` helper was described as a decorator but accepted the wrapped function as a positional argument. It was changed to a proper decorator factory and now preserves the wrapped function metadata.
- Error handling in the custom span example recorded exceptions but did not set span status or `error.type`. It now records the exception, sets `error.type`, and marks the span status as error.
- The connection pool example said it measured time spent waiting for a connection, but SQLAlchemy `checkout` and `checkin` events as used there measure how long a connection is held after checkout. The metric name, description, and comment were corrected to track checkout duration.
- The pool metrics snippet used `time` and `engine` without importing them. The example now imports `time` and imports `engine` from the setup module.
- The N+1 detector used the legacy `db.statement` span attribute. It now prefers current `db.query.text` and falls back to `db.statement` for older telemetry.

## Review Notes
The post is technically relevant and valid after the fixes. The example OneUptime OTLP endpoint is plausible as a vendor-specific endpoint, but readers still need to configure authentication and deployment-specific exporter settings for production use.
