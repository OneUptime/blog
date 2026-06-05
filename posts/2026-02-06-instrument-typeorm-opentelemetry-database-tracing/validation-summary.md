# Validation Summary: How to Instrument TypeORM with OpenTelemetry for Database Tracing

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK and API
- OpenTelemetry semantic conventions
- TypeORM DataSource and QueryRunner
- Node.js
- TypeScript
- PostgreSQL connection pooling through TypeORM driver options

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry semantic conventions for database client spans: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry semantic conventions package API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- TypeORM QueryRunner documentation: https://typeorm.io/docs/query-runner/
- TypeORM transactions documentation: https://typeorm.io/docs/advanced-topics/transactions/
- TypeORM multiple data sources and replication documentation: https://typeorm.io/docs/data-source/multiple-data-sources/
- Current npm package metadata and TypeScript declarations for `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, `@opentelemetry/sdk-node`, `@opentelemetry/sdk-trace-base`, and `typeorm`

## Issues Found
- The install command omitted packages used by examples. Added `@opentelemetry/auto-instrumentations-node` and `@opentelemetry/sdk-trace-base` so the shown imports resolve from direct project dependencies.
- The tracing initialization used `new Resource()` from `@opentelemetry/resources`, which is not exported by the current package. Replaced it with the documented `resourceFromAttributes()` helper.
- The tracing initialization used the older `SemanticResourceAttributes` constants. Updated the examples to use current `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and `ATTR_DEPLOYMENT_ENVIRONMENT_NAME` constants.
- The QueryRunner wrapper claimed to implement `QueryRunner` while only defining a small subset of the required interface. Updated the example to proxy unknown properties and methods to the original QueryRunner so TypeORM operations not shown in the excerpt still delegate correctly.
- The query wrapper did not preserve TypeORM's `query(query, parameters, useStructuredResult)` overload. Added the optional third argument and delegated it when true.
- The query wrapper assumed `parameters.length`, but TypeORM query parameters may be an array or an object. Updated the code to count both forms correctly.
- The database span attributes used deprecated database semantic convention names such as `db.system`, `db.statement`, `db.operation`, and `db.name`. Replaced them with current constants for `db.system.name`, `db.query.text`, `db.operation.name`, and `db.namespace`.
- TypeORM's `postgres` driver name does not match OpenTelemetry's database system name. Added a small mapping from TypeORM driver names to OpenTelemetry database system names for PostgreSQL and SQL Server.
- The pool monitoring snippet created a waiting-connection gauge but never registered a callback for it. Added a callback that observes `driver.master.waitingCount` when available.
- The production SDK snippet used the deprecated singular `spanProcessor` option and also configured `traceExporter` redundantly. Updated it to use `spanProcessors: [...]`.
- The conclusion overstated that the shown QueryRunner wrapper captures connection operations. Revised it to say it captures SQL queries and transaction operations without changes at every query call site.

## Review Notes
The tutorial is technically sound after the fixes. Future improvements could mention that collecting full SQL in `db.query.text` should be done only when queries are parameterized or sanitized, because OpenTelemetry's database semantic conventions warn against collecting unsanitized query text by default.
