# Validation Summary: How to Build Dependency Analysis

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry traces and spans
- OpenTelemetry resource semantic conventions
- TypeScript
- Graph algorithms for dependency analysis
- Mermaid diagrams
- PostgreSQL schema design

## Sources Consulted
- OpenTelemetry Traces documentation: https://opentelemetry.io/docs/concepts/signals/traces/
- OpenTelemetry Tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry Recording errors semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- PostgreSQL JSON types documentation: https://www.postgresql.org/docs/current/datatype-json.html
- PostgreSQL data types documentation: https://www.postgresql.org/docs/current/datatype.html

## Issues Found
- Corrected wording that implied every span has a parent. OpenTelemetry root spans have no parent, so the post now says every non-root span captures a parent-child relationship.
- Corrected wording that described `service.name` as a span attribute. In OpenTelemetry semantic conventions, `service.name` and `service.version` are resource attributes associated with the telemetry-producing service.
- Removed an unused `Span` import from `@opentelemetry/api` in the TypeScript example.
- Updated span parent indexes to use `traceId` plus `spanId`, avoiding incorrect parent lookup if span IDs collide across traces.
- Added `resourceAttributes` to the `RawSpan` model and changed version extraction to read `service.version` from resource attributes.
- Fixed dependency depth calculation so it can compute maximum upstream/downstream depth in DAGs instead of stopping at the first visited path.
- Added an empty-graph guard in criticality scoring to avoid division by zero.
- Fixed cycle duplicate detection so it canonicalizes directed cycle paths instead of sorting service names, which could merge distinct cycles that happen to contain the same services.
- Added cleanup for the defensive missing-node branch in DFS cycle detection.
- Added a zero-call guard and previous-latency guard in health metric calculation to avoid `NaN` or divide-by-zero behavior.
- Updated the SQL schema comment for `cycle_hash` to describe a canonicalized cycle path rather than sorted cycle members.

## Review Notes
The TypeScript snippets were extracted into a temporary combined file and validated with `npx tsc --target ES2022 --module ES2022 --strict --noEmit --skipLibCheck`. A temporary module marker and declaration for the illustrative `fetchSpansFromBackend` function were used for validation because the post presents snippets, not a standalone source file.
