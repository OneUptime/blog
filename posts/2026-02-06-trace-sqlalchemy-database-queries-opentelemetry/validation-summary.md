# Validation Summary: How to Trace SQLAlchemy Database Queries with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry SQLAlchemy instrumentation
- OpenTelemetry OTLP gRPC exporter
- SQLAlchemy ORM
- Python
- PostgreSQL and psycopg2

## Sources Consulted
- OpenTelemetry SQLAlchemy Instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry SQLAlchemy instrumentation source/API notes: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/sqlalchemy.html
- OpenTelemetry Python instrumentation guide: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python propagation API: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- SQLAlchemy 2.0 ORM Querying Guide: https://docs.sqlalchemy.org/en/20/orm/queryguide/index.html
- SQLAlchemy 2.0 Relationship Loading Techniques: https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html

## Issues Found
- The SQLAlchemy instrumentation example passed `service="user-service"` to `SQLAlchemyInstrumentor().instrument()`. The official SQLAlchemy instrumentor documents `engine`, `engines`, `tracer_provider`, `meter_provider`, `enable_commenter`, `commenter_options`, and `enable_attribute_commenter`, but not `service`. The service name is already correctly set on the OpenTelemetry `Resource`, so I removed the unsupported argument.
- The SQLAlchemy instrumentation section said the instrumentor automatically wraps engine creation, while the example instruments an already-created engine by passing `engine=engine`. I changed the wording to state that it can instrument an existing engine or wrap engine creation.
- The custom span attributes example described `query.statement.compile()` output as a query explanation plan. That code compiles SQL text; it does not run a database `EXPLAIN`. I changed the comment to "Add the compiled SQL as an event."
- The `typing` import included unused `Optional`. I removed it after confirming the snippet only uses `List`.

## Review Notes
The SQLAlchemy examples use the legacy `session.query()` ORM style. SQLAlchemy 2.x continues to support this as a legacy facade, but new SQLAlchemy 2.x code is generally encouraged to use `select()` with `Session.execute()` or `Session.scalars()`. The examples remain functional as written.
