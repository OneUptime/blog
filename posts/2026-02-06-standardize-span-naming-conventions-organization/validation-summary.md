# Validation Summary: How to Standardize Span Naming Conventions Across an Organization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing and semantic conventions
- OpenTelemetry Python SDK SpanProcessor
- OpenTelemetry Collector transform processor
- OpenTelemetry Transformation Language (OTTL)
- JavaScript-based CI linting

## Sources Consulted
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry RPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/rpc-spans/
- OpenTelemetry Python SDK trace source documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL function documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs

## Issues Found
- The HTTP client naming convention used `HTTP {method}` and recommended storing the full URL in `http.url`. Current OpenTelemetry HTTP semantic conventions recommend `{method} {target}` when a low-cardinality target is available, `{method}` otherwise, and current URL attributes use names such as `url.full`. Updated the standard and validator examples accordingly.
- The messaging span naming examples used `{destination} {operation}`. Current OpenTelemetry messaging conventions recommend `{messaging.operation.name} {destination}`. Updated the standard, validators, and anti-pattern example.
- The RPC naming section described the pattern as `{service}/{method}`. Current RPC conventions describe the span name as the logical `rpc.method` when available. Updated the wording and examples to use fully-qualified logical method names.
- The JavaScript linting example defined `VALID_NAME` with `||` between regular expression objects, which would always evaluate to the first truthy regex object and would not validate all patterns as intended. Removed the incorrect constant and kept the working array-based validator.
- The Python `SpanProcessor.force_flush` implementation returned `None`. The OpenTelemetry Python SDK interface returns a boolean. Updated the example to return `True`.
- The Collector normalization example claimed a regex capture replacement would uppercase lowercase HTTP methods, but `replace_pattern` would preserve the lowercase capture. Replaced it with explicit method-prefix replacements.
- The compliance OTTL example used `where name matches ...`, which is not the documented OTTL regex form. Updated it to use `IsMatch(...)`, and added a default `false` assignment so non-conforming spans are tagged explicitly.
- The database search explanation used `SELECT *` / `INSERT *` as span-name patterns, which does not match the post's own low-cardinality span-name examples or OpenTelemetry's `db.query.summary` guidance. Updated the text to describe names starting with `SELECT` or `INSERT`.

## Review Notes
The remaining examples are intentionally illustrative. A production span-name linter would need parser-aware scanning for each language rather than regex-only source scanning, but the simplified CI example is technically valid as a starting point.
