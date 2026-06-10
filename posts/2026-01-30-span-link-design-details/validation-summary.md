# Validation Summary: How to Build Span Link Design Details

## Status
validated

## Post Type
Guide / Tutorial — design-patterns and implementation guide for OpenTelemetry span links in TypeScript/JavaScript.

## Technologies Covered
- OpenTelemetry (Tracing API, span links)
- `@opentelemetry/api` (TypeScript/JavaScript SDK)
- W3C Trace Context propagation
- Kafka (illustrative message queue producer/consumer)
- Distributed tracing concepts (fan-out/fan-in, saga orchestration, event sourcing)

## Sources Consulted
- OpenTelemetry JS API source — `Link` interface: https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/trace/link.ts
- OpenTelemetry JS API source — `SpanContext`: https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/trace/span_context.ts
- OpenTelemetry JS API source — `SpanOptions` (`links` field): https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/trace/SpanOptions.ts
- OpenTelemetry JS API source — `TraceState` and `createTraceState`: https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/trace/trace_state.ts
- OpenTelemetry specification — Span Links: https://opentelemetry.io/docs/specs/otel/trace/api/#specifying-links

## Issues Found
- **`TraceState.fromString(...)` does not exist.** In the `deserializeSpanContext` example (section 6, "Context Preservation Utilities"), the code called `TraceState.fromString(data.traceState)`. `TraceState` is an interface in `@opentelemetry/api`, not a class with static methods. The correct API is the `createTraceState(rawTraceState?: string)` factory exported from `@opentelemetry/api`. Replaced the call accordingly. The corresponding `ctx.traceState?.serialize()` call elsewhere in that section is correct, since `serialize(): string` is defined on the `TraceState` interface.

## Review Notes
- The `Link` interface's `attributes` field is typed as `SpanAttributes` (`Record<string, SpanAttributeValue>`), but the post uses `Record<string, any>` in some helper types (e.g., `LinkBuilderOptions.attributes`). This is permissive but type-safe-compatible; not a correctness issue, just a looser typing choice.
- The use of `kind: SpanKind.PRODUCER` / `CONSUMER` / `CLIENT`, `propagation.inject` / `propagation.extract`, `trace.setSpan`, `trace.getSpanContext`, `context.with`, `context.active`, and `span.spanContext()` is consistent with current `@opentelemetry/api` (v1.x).
- The post does not show the `import { createTraceState } from '@opentelemetry/api'` statement next to the fixed snippet; the prior import block (section 7) lists only a subset of symbols, but the snippets are clearly illustrative and the surrounding text does not claim to be a complete copy-pasteable module, so no further edits were made.
- The SQL section uses Postgres-flavored JSONB operators (`@>`, `->>`) without naming the database. That is fine as an illustrative example, but readers using other backends (e.g., ClickHouse, BigQuery) will need to translate the syntax.
- The `isValidContext` check in `SpanLinkBuilder.isValidContext` uses string comparison against the all-zero trace/span IDs, matching the W3C trace context spec for invalid IDs. This is correct.
