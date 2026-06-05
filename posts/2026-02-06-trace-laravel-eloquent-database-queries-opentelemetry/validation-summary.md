# Validation Summary: How to Trace Laravel Eloquent Database Queries with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry PHP SDK and tracing API
- OpenTelemetry PHP Laravel auto-instrumentation package
- OpenTelemetry database semantic conventions
- PHP
- Laravel database query listeners
- Laravel Eloquent ORM, eager loading, query builder, raw queries, transactions, and caching

## Sources Consulted
- OpenTelemetry PHP instrumentation documentation: https://opentelemetry.io/docs/languages/php/instrumentation/
- OpenTelemetry database span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/db/
- OpenTelemetry Laravel auto-instrumentation README: https://github.com/opentelemetry-php/contrib-auto-laravel
- Laravel database documentation: https://laravel.com/docs/13.x/database
- Laravel Eloquent relationships and eager loading documentation: https://laravel.com/docs/13.x/eloquent-relationships

## Issues Found
- The OpenTelemetry PHP snippets used `StatusCode::ERROR`, which is not the current PHP API constant. Changed those calls to `StatusCode::STATUS_ERROR`.
- The database span examples used older database semantic convention attributes such as `db.system`, `db.name`, `db.statement`, and `db.operation`. Updated them to current names such as `db.system.name`, `db.namespace`, `db.query.text`, and `db.operation.name`.
- The primary query tracing example recorded serialized binding values after a weak length-based redaction pass. Since query parameters may contain sensitive data, changed the example to record only a custom parameter count by default.
- `DatabaseTracing::traceQuery()` was declared `private`, but the later `EnrichedDatabaseTracing` example overrides it and calls `parent::traceQuery($query)`. Changed the base method to `protected` so the subclass example is valid PHP.
- The eager-loading section said the resulting queries execute "in parallel where possible." Laravel eager loading batches related records into fewer queries, but it does not make those database calls parallel in the shown code. Reworded the sentence to describe batched eager-loading queries.

## Review Notes
The tutorial remains an illustrative instrumentation guide. The production `config/opentelemetry.php` snippet is application-level pseudoconfiguration; a real Laravel application would still need to wire those settings into the OpenTelemetry SDK/exporter and custom query listener behavior.
