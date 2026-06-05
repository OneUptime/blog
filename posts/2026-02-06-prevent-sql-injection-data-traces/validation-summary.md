# Validation Summary: How to Prevent SQL Injection Data from Appearing in Traces

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python psycopg2 instrumentation
- OpenTelemetry Java agent
- OpenTelemetry .NET SqlClient instrumentation
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector routing connector
- SQL injection prevention and query parameterization

## Sources Consulted
- OpenTelemetry Python Contrib psycopg2 instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/psycopg2/psycopg2.html
- OpenTelemetry Python DB API instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/dbapi/dbapi.html
- OpenTelemetry Java agent instrumentation configuration documentation: https://opentelemetry.io/docs/zero-code/java/agent/instrumentation/
- OpenTelemetry .NET Contrib SqlClient instrumentation documentation: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.SqlClient/README.md
- OpenTelemetry .NET Contrib SqlClient options source: https://github.com/open-telemetry/opentelemetry-dotnet-contrib/blob/main/src/OpenTelemetry.Instrumentation.SqlClient/SqlClientTraceInstrumentationOptions.cs
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry trace SDK specification for SpanProcessor mutability timing: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Python SDK trace source documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html

## Issues Found
- The Python psycopg2 snippet used a `sanitize_query=True` option that is not documented for `Psycopg2Instrumentor`. Replaced it with the documented `capture_parameters=False` option and clarified that parameter capture is disabled by default.
- The safe psycopg2 example claimed the captured template would use `?`, but the example query uses psycopg2's `%s` parameter style. Updated the comment to match the code.
- The Java JDBC sanitizer property used `otel.instrumentation.jdbc.statement.sanitizer.enabled`, which is not the documented property shape. Changed it to `otel.instrumentation.jdbc.statement-sanitizer.enabled`.
- The .NET SqlClient example used `SetDbStatementForText`, which is not present in the current SqlClient instrumentation options. Replaced the example with the documented `Filter` hook and a proper `SqlCommand` cast.
- The Collector transform examples could call string functions on missing attributes. Added `where attributes["db.statement"] != nil` guards to the relevant OTTL statements.
- The Collector replacement string used `$$1`, which would not correctly substitute the first regex capture group. Changed it to `$1`.
- The routing connector example evaluated the route in the default resource context while checking a span attribute. Added `context: span` and used the current `condition` configuration form.
- The Python custom `SpanProcessor` example tried to call `set_attribute` in `on_end`, where Python receives a read-only ended span. Changed the example to use the mutable span ending hook.
- The SDK limits snippet was labeled as YAML even though it showed environment variables. Changed the code fence to shell syntax and added `export`.
- Added a caveat that newer stable database semantic conventions may emit `db.query.text` rather than `db.statement`.

## Review Notes
The post remains valid as a layered security guide. Future revisions could broaden the Collector examples to handle both `db.statement` and `db.query.text` throughout, since database semantic conventions and individual instrumentation libraries are still transitioning.
