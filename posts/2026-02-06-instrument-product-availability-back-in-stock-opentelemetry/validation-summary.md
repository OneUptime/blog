# Validation Summary: How to Instrument Product Availability and Back-in-Stock Notification Systems

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OpenTelemetry database semantic conventions
- Python inventory and notification workflow instrumentation

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python SDK metrics instrument implementation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/metrics/_internal/instrument.html
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/

## Issues Found
- The stock level metric used `create_observable_gauge` without a callback. Observable gauges only emit values through callbacks, so the snippet would not report stock levels as written. Changed it to a synchronous gauge with `create_gauge` and added `stock_level_gauge.set(...)` calls when stock is read from cache or database.
- The database span used older semantic convention attributes `db.system` and `db.operation`. Current stable OpenTelemetry database conventions use `db.system.name` and `db.operation.name`. Updated the attribute names.

## Review Notes
The snippets are illustrative and depend on application-provided services such as `cache`, `db`, `sub_repo`, `catalog`, `email_service`, and `push_service`. The Python syntax is valid, and the OpenTelemetry tracing and metric calls now match current documented APIs and semantic conventions.
