# Validation Summary: How to Secure Database Query Parameters from Appearing in Traces

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry database tracing
- OpenTelemetry Python instrumentation for psycopg2 and SQLAlchemy
- OpenTelemetry Java agent JDBC instrumentation
- OpenTelemetry JavaScript instrumentation for pg
- OpenTelemetry Collector transform and attributes processors
- OTTL functions for telemetry redaction

## Sources Consulted
- OpenTelemetry Python psycopg2 instrumentation source: https://github.com/open-telemetry/opentelemetry-python-contrib/tree/main/instrumentation/opentelemetry-instrumentation-psycopg2
- OpenTelemetry Python SQLAlchemy instrumentation source: https://github.com/open-telemetry/opentelemetry-python-contrib/tree/main/instrumentation/opentelemetry-instrumentation-sqlalchemy
- OpenTelemetry Python SDK SpanProcessor and ReadableSpan source: https://github.com/open-telemetry/opentelemetry-python/tree/main/opentelemetry-sdk
- OpenTelemetry Java instrumentation configuration: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/
- OpenTelemetry JS pg instrumentation source: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-pg
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/attributesprocessor
- OpenTelemetry Collector OTTL functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/ottlfuncs
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/

## Issues Found
- The psycopg2 example claimed `capture_parameters=False` disables `db.statement`. It only disables separate parameter capture. Updated the text and comments to clarify that SQL text still needs processor or Collector redaction.
- The Node.js pg example described `enhancedDatabaseReporting: false` as disabling `db.statement`. It only prevents the separate `pg.values` parameter attribute. Updated the hook to overwrite both `db.statement` and stable `db.query.text`.
- The SQLAlchemy example implied `enable_commenter=True` captures parameterized query templates. SQL commenter adds trace context comments and is not a parameter templating control. Updated the example to explain that bound parameters normally produce placeholder statements and set `enable_commenter=False`.
- The Java agent command used the wrong sanitizer property, `otel.instrumentation.jdbc.statement-sanitizer.enabled`. Replaced it with the documented common property `otel.instrumentation.common.db-statement-sanitizer.enabled`.
- The custom Python processor removed or referenced inaccurate attribute keys and the tests called an undefined `sanitize_statement()` helper. Added the helper, imported it in the tests, covered both `db.statement` and `db.query.text`, and removed the incorrect `db.cassandra.idempotence` entry.
- The SpanProcessor example mutated `ReadableSpan` attributes through a private field without warning. Added a caveat that this uses private SDK internals and should be tested on SDK upgrades.
- The Collector transform examples used old unqualified OTTL paths such as `attributes["db.statement"]`. Updated them to current `span.attributes[...]` paths, added `error_mode: ignore`, and included both old and stable database query attributes.
- The Collector pipeline referenced an `otlp` receiver without defining it. Added a minimal `receivers: otlp` section.
- The allowlist example used invalid attributes processor actions: `upsert` without a value and `extract` as if it replaced `db.statement`. Replaced it with valid transform processor statements using `set`, `delete_key`, and `keep_keys`.

## Review Notes
The post is technically useful after correction. The custom Python `SpanProcessor` remains an example-level workaround because OpenTelemetry Python exposes ended spans as `ReadableSpan`; Collector-level redaction is the more robust production path.
