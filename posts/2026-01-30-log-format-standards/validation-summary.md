# Validation Summary: How to Build Log Format Standards

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Structured logging
- JSON log formats
- TypeScript
- Winston
- OpenTelemetry logs and semantic conventions
- RFC 3339 / ISO 8601 timestamps
- Mermaid diagrams

## Sources Consulted
- Winston official README: https://github.com/winstonjs/winston
- OpenTelemetry Logs Data Model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry general log semantic conventions: https://github.com/open-telemetry/semantic-conventions/blob/main/docs/general/logs.md
- OpenTelemetry HTTP attributes registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry URL attributes registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/url/
- OpenTelemetry database attributes registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/db/
- OpenTelemetry error attributes registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/error/
- OpenTelemetry exception log semantic conventions: https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/
- RFC 3339 timestamp profile: https://datatracker.ietf.org/doc/html/rfc3339

## Issues Found
- The baseline JSON example used underscore attribute names while the rest of the post recommends dot-notation attributes. Updated those keys to dot notation for consistency.
- Several OpenTelemetry examples used deprecated attribute names, including `http.method`, `http.status_code`, `http.url`, `db.system`, and `error.message`. Updated them to current names such as `http.request.method`, `http.response.status_code`, `url.path`, `db.system.name`, and `exception.message`.
- The Winston logger snippet could emit invalid attributes and had a TypeScript issue around optional `error.stack`. Added a small runtime attribute guard, string conversion for the message field, and conditional stack inclusion.
- The timestamp validation regex used an unescaped dot before milliseconds, which matched any character. Escaped the dot so it validates the literal fractional-second separator.
- The migration wrapper accepted any string log level and indexed the legacy logger dynamically. Narrowed the level type and cast the legacy logger shape so the example is type-checkable.

## Review Notes
- The revised TypeScript logger and validator snippets were checked with `tsc --strict` against Winston 3.19.0 in a temporary review environment.
- The post intentionally presents a custom log schema rather than the full OpenTelemetry LogRecord field names. That is acceptable for a team standard, but production OpenTelemetry pipelines should still document how top-level fields map to the OpenTelemetry log data model.
