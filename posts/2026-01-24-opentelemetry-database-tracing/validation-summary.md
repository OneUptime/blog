# Validation Summary: How to Configure OpenTelemetry for Database Tracing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK and instrumentation packages
- OpenTelemetry Python SDK and instrumentation packages
- PostgreSQL `pg` and `psycopg2`
- MySQL `mysql2`
- MongoDB Node.js driver
- Redis Node.js client
- SQLAlchemy
- OpenTelemetry Collector processors and OTLP exporter

## Sources Consulted
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- `@opentelemetry/instrumentation-pg` 0.71.0 README and published TypeScript definitions: https://www.npmjs.com/package/@opentelemetry/instrumentation-pg
- `@opentelemetry/instrumentation-mysql2` 0.65.0 README and published TypeScript definitions: https://www.npmjs.com/package/@opentelemetry/instrumentation-mysql2
- `@opentelemetry/instrumentation-mongodb` 0.72.0 README and published TypeScript definitions: https://www.npmjs.com/package/@opentelemetry/instrumentation-mongodb
- `@opentelemetry/instrumentation-redis-4` 0.49.0 README and published TypeScript definitions: https://www.npmjs.com/package/@opentelemetry/instrumentation-redis-4
- `@opentelemetry/resources` 2.8.0 published TypeScript definitions: https://www.npmjs.com/package/@opentelemetry/resources
- `@opentelemetry/sdk-trace-base` 2.8.0 published TypeScript definitions: https://www.npmjs.com/package/@opentelemetry/sdk-trace-base
- OpenTelemetry JavaScript NodeSDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry Python psycopg2 instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/psycopg2/psycopg2.html
- OpenTelemetry Python SQLAlchemy instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/sqlalchemy/sqlalchemy.html
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/

## Issues Found
- The database span attribute table used older semantic convention names as if they were the current standard. Updated the table to stable names such as `db.system.name`, `db.namespace`, `db.operation.name`, and `db.query.text`, with a note about instrumentation migration behavior.
- The PostgreSQL setup used `new Resource(...)`, which is not exported as a constructible class by current `@opentelemetry/resources`. Changed it to `resourceFromAttributes(...)`.
- The PostgreSQL install command omitted packages imported by the example. Added the OpenTelemetry API, SDK, exporter, resources, and semantic conventions packages.
- The PostgreSQL sqlcommenter option was described as controlling query text capture. Corrected the comments to state that it adds sqlcommenter trace context to queries.
- The MySQL2 example used an unsupported `enhancedDatabaseReporting` option and an incorrect response hook field. Replaced it with `maskStatement: true` and `responseInfo.queryResults`.
- The MongoDB and Redis install commands omitted SDK packages needed by the shown instrumentation snippets. Updated the commands.
- The Redis example called `redis.connect()` without awaiting it. Changed it to `await redis.connect()` so commands do not race connection setup.
- The query sanitizer produced quoted placeholders for string literals and only set the legacy `db.statement` attribute. Updated it to produce a normal placeholder and set both `db.statement` and `db.query.text` during semantic convention migration.
- The custom sampler attempted to sample slow or errored spans using duration and error attributes at span start. Reworked the example to explain that head samplers cannot inspect final duration or errors, and removed the impossible logic.
- The custom sampler signature was missing the current `links` parameter required by `Sampler.shouldSample`. Added it and forwarded it to the wrapped sampler.
- The Collector attributes processor example attempted to derive a latency category from span duration with `from_context`, which is not valid for that processor. Replaced it with a valid static attribute insertion.
- The Collector filter processor example used an outdated `spans.exclude` shape. Updated it to OTTL-based `traces.span` conditions.

## Review Notes
Some OpenTelemetry JavaScript database instrumentations still emit legacy database semantic convention attributes by default while supporting opt-in migration to stable attributes through `OTEL_SEMCONV_STABILITY_OPT_IN`. The post now calls this out, but readers should still verify emitted attributes for the exact instrumentation versions deployed in their applications.
