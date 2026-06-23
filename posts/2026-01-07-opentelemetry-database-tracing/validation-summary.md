# Validation Summary: How to Trace Database Queries with OpenTelemetry (PostgreSQL, MySQL, MongoDB)

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry JavaScript SDK and auto-instrumentation
- OpenTelemetry Python SDK
- OpenTelemetry database semantic conventions
- PostgreSQL with `pg` and `psycopg2`
- MySQL with `mysql2`
- MongoDB Node.js driver
- OTLP HTTP trace export

## Sources Consulted
- OpenTelemetry JavaScript Node SDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript resource documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK 2.0 announcement: https://opentelemetry.io/blog/2025/otel-js-sdk-2-0/
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry SQL database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/sql/
- OpenTelemetry MongoDB semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/mongodb/
- OpenTelemetry deployment environment resource conventions: https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/
- OpenTelemetry JavaScript PostgreSQL instrumentation README: https://www.npmjs.com/package/@opentelemetry/instrumentation-pg
- OpenTelemetry JavaScript MySQL and MySQL2 instrumentation READMEs: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-mysql and https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-mysql2
- OpenTelemetry JavaScript MongoDB instrumentation README: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-mongodb
- OpenTelemetry Python SDK resource and trace export API docs: https://opentelemetry-python.readthedocs.io/en/latest/sdk/resources.html and https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html

## Issues Found
- The Node.js setup used `new Resource(...)` and `spanProcessor`, which are outdated for current OpenTelemetry JS SDK examples. Updated it to `resourceFromAttributes(...)` and `spanProcessors`.
- The Node.js setup used deprecated resource constants and the old `deployment.environment` resource attribute. Updated it to stable constants including `deployment.environment.name`.
- The OTLP examples used `OTEL_EXPORTER_OTLP_ENDPOINT` as if it were always a trace-specific `/v1/traces` endpoint. Updated explicit HTTP exporter examples to use `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`.
- The auto-instrumentation config used `@opentelemetry/instrumentation-mysql` while the MySQL code uses `mysql2/promise`. Updated the config to `@opentelemetry/instrumentation-mysql2` and its `maskStatement` option.
- The setup enabled enhanced database reporting by default, which can expose query parameters or result details depending on instrumentation. Updated the defaults to keep enhanced reporting disabled unless reviewed.
- Manual spans used older database semantic attributes such as `db.system`, `db.name`, `db.operation`, `db.statement`, `db.mongodb.collection`, and `db.connection_string`. Updated examples to stable attributes such as `db.system.name`, `db.namespace`, `db.operation.name`, `db.query.text`, `db.collection.name`, `server.address`, and `server.port`.
- Python examples had unused imports (`sitecustomize`, `SpanAttributes`, and `re`). Removed them.
- The MongoDB sanitizer used global regex objects with `.test()`, which can produce stateful false negatives. Updated it to test with a non-global RegExp copy.

## Review Notes
All JavaScript and Python fenced code blocks were extracted and syntax-checked with `node --check` and `python3 -m py_compile`. The examples still include some application-specific custom attributes such as `db.query_duration_ms` and `db.slow_query`; those are not OpenTelemetry semantic convention attributes and should be documented as custom attributes if reused in production.
