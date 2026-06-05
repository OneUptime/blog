# Validation Summary: How to Trace Drizzle ORM Queries with OpenTelemetry in Node.js

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK and API
- Drizzle ORM
- postgres.js
- Node.js
- TypeScript
- PostgreSQL

## Sources Consulted
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry NodeSDKConfiguration API docs: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.NodeSDKConfiguration.html
- OpenTelemetry SDK trace-base API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-trace-base.html
- OpenTelemetry semantic conventions package exports, version 1.41.1: https://www.npmjs.com/package/@opentelemetry/semantic-conventions
- Drizzle ORM PostgreSQL / postgres.js connection docs: https://orm.drizzle.team/docs/get-started-postgresql
- Drizzle ORM transactions docs: https://orm.drizzle.team/docs/transactions
- Drizzle ORM 0.45.2 package source for `postgres-js/session.js`, inspected from the npm package
- postgres.js README and API docs: https://github.com/porsager/postgres/blob/master/README.md

## Issues Found
- The install command omitted `@opentelemetry/auto-instrumentations-node`, although the tracing setup imported `getNodeAutoInstrumentations`. Added the package.
- The install command omitted `@opentelemetry/sdk-trace-base`, although later examples imported `BatchSpanProcessor`, `TraceIdRatioBasedSampler`, `BasicTracerProvider`, `InMemorySpanExporter`, and `SimpleSpanProcessor` directly from it. Added the package.
- The OpenTelemetry resource setup used the older `new Resource(...)` and `SemanticResourceAttributes` pattern. Updated it to `resourceFromAttributes` with current semantic convention constants.
- The custom database span attributes used older string names such as `db.statement`, `db.system`, and `db.operation`. Updated the example to use current semantic convention constants for database system, query text, and operation name.
- The postgres.js proxy wrapper assumed Drizzle would call `query` or `execute` methods and treated tagged-template arguments as a string. Drizzle's postgres.js driver executes through `client.unsafe(query, params)`, and postgres.js query calls return a thenable query object that supports methods such as `.values()`. Updated the wrapper to intercept `unsafe`, preserve postgres.js's thenable query shape, trace `.values()` / `.execute()` / awaited queries, and wrap transaction/reserved scoped clients.
- The connection pool monitoring example read `client.options.connection?.count`, which is not a public postgres.js active/idle pool counter. Replaced it with a reserved-connection gauge based on the documented `sql.reserve()` / `reserved.release()` API.
- The prepared statement section claimed prepared statements need special handling even though the corrected wrapper traces the underlying execution path. Reworded it as an optional parent span around prepared query execution.
- The async-context debugging section incorrectly implied that `.then()` inherently breaks OpenTelemetry context. Replaced it with an example showing the real risk: ending the parent span before the query promise settles.
- The production optimization snippet used deprecated `spanProcessor`. Updated it to `spanProcessors`.
- The tracing test snippet imported `BasicTracerProvider` without declaring it and used the removed `addSpanProcessor` method. Updated it to construct `BasicTracerProvider` with `spanProcessors` and register it once for the test suite.

## Review Notes
- The guide is now technically accurate for the current OpenTelemetry JavaScript package APIs and the current Drizzle postgres.js execution path.
- The custom proxy approach is still advanced and should be treated as example instrumentation rather than an officially supported Drizzle plugin.
