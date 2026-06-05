# Validation Summary: How to Use Semantic Conventions Consistently Across Languages

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry Go semantic convention package
- OpenTelemetry Java semantic convention package
- OpenTelemetry Python semantic convention package
- OpenTelemetry JavaScript semantic convention package
- OpenTelemetry Collector transform processor and OTTL
- HTTP, database, messaging, RPC, resource, trace, and metric conventions

## Sources Consulted
- OpenTelemetry semantic conventions overview: https://opentelemetry.io/docs/specs/semconv/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry URL attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/url/
- OpenTelemetry database span semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry Java API semantic attributes documentation: https://opentelemetry.io/docs/languages/java/api/#semantic-attributes
- OpenTelemetry Java semconv Javadocs: https://javadoc.io/doc/io.opentelemetry.semconv/opentelemetry-semconv/latest/index.html
- OpenTelemetry Go semconv package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.21.0
- OpenTelemetry JavaScript semantic conventions package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL function documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs

## Issues Found
- The Go snippet imported `attribute` but did not use it, and omitted the `context`, `resource`, and `trace` imports required by the shown functions. Updated the import block so the snippet is syntactically coherent.
- The Java snippet used the older `io.opentelemetry.semconv.SemanticAttributes` class. Current generated Java semantic convention constants are organized by domain, so the snippet now uses `HttpAttributes` and `UrlAttributes`.
- The HTTP span naming examples used the outdated `"HTTP {method}"` pattern. Current HTTP semantic conventions recommend `{method} {target}` when a low-cardinality target is available, or `{method}` otherwise. Updated the examples accordingly.
- The database span naming description used a simplified `{operation} {target}` pattern. Current database conventions describe `db.query.summary` as the grouping key used as a span name in common cases. Updated the label to `{query summary}` while keeping the examples.
- The collector transform example normalized HTTP span names to the outdated `HTTP GET` style. Updated it to preserve the current `{method} {target}` format while stripping query parameters.
- The version migration explanation said SDKs handle dual emission. This is instrumentation-specific, so the wording now says many instrumentations can emit both old and new names during migration.

## Review Notes
The post is technically relevant and has been validated after fixes. Some examples are illustrative snippets rather than complete runnable programs, but the APIs and semantic convention names now align with current OpenTelemetry documentation.
