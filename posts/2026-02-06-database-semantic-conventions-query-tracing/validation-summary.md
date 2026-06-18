# Validation Summary: How to Use Database Semantic Conventions for Consistent Query Tracing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry tracing
- OpenTelemetry Python SDK and psycopg2 instrumentation
- OpenTelemetry JavaScript SDK and MongoDB instrumentation
- OpenTelemetry Redis instrumentation
- PostgreSQL
- MongoDB
- Redis
- SQL dashboard queries

## Sources Consulted
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database semantic convention stability migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry SQL database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/sql/
- OpenTelemetry PostgreSQL semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/postgresql/
- OpenTelemetry MongoDB semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/mongodb/
- OpenTelemetry Redis semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/redis/
- OpenTelemetry Python psycopg2 instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/psycopg2/psycopg2.html
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript MongoDB instrumentation README: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-mongodb

## Issues Found
- The post used the older experimental `db.system` attribute throughout. Updated examples and prose to use the current stable `db.system.name` attribute, and added a compatibility note explaining `OTEL_SEMCONV_STABILITY_OPT_IN=database` and `database/dup` for instrumentations that still emit older names by default.
- The PostgreSQL namespace explanation treated `db.namespace` as only the database name. Updated the manual example and prose to reflect the current PostgreSQL convention where the namespace is database and schema when available.
- The JavaScript MongoDB setup used `new Resource(...)`, which is not the current documented OpenTelemetry JS resource creation pattern. Replaced it with `resourceFromAttributes(...)`.
- The manual MongoDB error example used a magic numeric status code. Imported `SpanStatusCode` and changed the status call to use `SpanStatusCode.ERROR`.
- The MongoDB manual example recorded a query filter in `db.query.text`, but the current MongoDB semantic convention does not list `db.query.text` as a MongoDB span attribute and the official example leaves it unset. Removed that attribute from the manual example and softened the auto-instrumentation claim to say enhanced reporting may attach additional query details.
- The Redis manual example used a templated key string in `db.query.text`. Updated it to a redacted Redis CLI-style command, `GET session:?`, matching the sanitization guidance.
- The dashboard examples used dotted attribute names as SQL identifiers. Quoted them with backticks to make the ClickHouse-style snippets more technically plausible.
- The query text sanitization guidance was too broad about auto-instrumentation behavior. Updated it to match the OpenTelemetry guidance that query text should only be recorded by default when sensitive data is sanitized.

## Review Notes
The post is now aligned with the stable OpenTelemetry database semantic conventions. Some OpenTelemetry language instrumentations may still emit older experimental attributes by default during the semconv migration window, so production dashboards may need either the stable opt-in environment variable or a temporary dual-read strategy.
