# Validation Summary: How to Build OpenTelemetry Simple Span Processor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK (`@opentelemetry/sdk-trace-base`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/sdk-node`)
- OpenTelemetry API (`@opentelemetry/api`)
- OpenTelemetry Semantic Conventions (`@opentelemetry/semantic-conventions`)
- OTLP HTTP trace exporter (`@opentelemetry/exporter-trace-otlp-http`)
- TypeScript / Node.js
- Vitest (used in test example)

## Sources Consulted
- Official `SimpleSpanProcessor` source: https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-base/src/export/SimpleSpanProcessor.ts
- Official `SpanProcessor` interface: https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-base/src/SpanProcessor.ts
- Official `ReadableSpan` interface: https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-base/src/export/ReadableSpan.ts
- OpenTelemetry JS SDK 2.0 release notes (March 17, 2025): https://github.com/open-telemetry/opentelemetry-js/releases/tag/v2.0.0
- Upgrade to 2.x guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- "Announcing OpenTelemetry JS SDK 2.0" blog post: https://opentelemetry.io/blog/2025/otel-js-sdk-2-0/
- Issue #5299 (alternative to deprecated `addSpanProcessor`): https://github.com/open-telemetry/opentelemetry-js/issues/5299
- Issue #5025 (semantic-conventions deprecation warnings): https://github.com/open-telemetry/opentelemetry-js/issues/5025
- W3C Trace Context spec for `TraceFlags.SAMPLED` semantics

## Issues Found

1. **Incorrect sampled-flag check in custom `SimpleSpanProcessor.onEnd`** (Section 4).
   - Before: `if (!span.spanContext().traceFlags) { return; }` — treats the entire `traceFlags` byte as a boolean. This is not the canonical check; it also breaks if any non-sampled flag (e.g. the W3C random flag) is ever set without the sampled bit, or if the sampled bit is set alongside others (a moot point today, but the bitmask is the spec-correct form).
   - After: `if ((span.spanContext().traceFlags & TraceFlags.SAMPLED) === 0) { return; }` — matches what the official `SimpleSpanProcessor` in `@opentelemetry/sdk-trace-base` does. Added `TraceFlags` to the `@opentelemetry/api` import.

2. **`NodeTracerProvider#addSpanProcessor` was removed in SDK 2.0 (March 2025)** (Sections 4, 5, 8, 9, 10).
   - Before: `const provider = new NodeTracerProvider(); provider.addSpanProcessor(processor); provider.register();`
   - After: `const provider = new NodeTracerProvider({ spanProcessors: [processor] }); provider.register();` — the post is dated 2026-01-30, well after the 2.0 release, so the removed API would not run.

3. **`NodeSDK` `spanProcessor` (singular) is deprecated** (Section 5).
   - Replaced the singular `spanProcessor: createSpanProcessor()` with `spanProcessors: [createSpanProcessor()]` to match the current `NodeSDKConfiguration`.

4. **`new Resource({...})` is no longer exported in 2.0** (Section 5).
   - Before: `resource: new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: 'my-service' })`
   - After: `resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'my-service' })`. Also updated the imports to `resourceFromAttributes` from `@opentelemetry/resources` and `ATTR_SERVICE_NAME` from `@opentelemetry/semantic-conventions` (the `SemanticResourceAttributes` enum is deprecated since semantic-conventions 1.26.0).

5. **`Array.from(span.attributes)` produces an empty array** (Section 6, `LoggingSimpleSpanProcessor`).
   - `ReadableSpan.attributes` is a plain `{ [key: string]: AttributeValue }` object, not iterable and not array-like. `Array.from(...)` on it returns `[]`, so the logged `attributes` field was always `{}`.
   - Replaced with `attributes: { ...span.attributes }` (an equivalent shallow copy of the attribute map).

6. **`ReadableSpan.parentSpanId` was removed in SDK 2.0** (Section 9, `DebugSpanExporter.getDepth`).
   - Before: `return span.parentSpanId ? 1 : 0;`
   - After: `return span.parentSpanContext ? 1 : 0;` — `ReadableSpan` now exposes the full parent `SpanContext` (or `undefined` for root spans) instead of a bare ID.

## Review Notes

- The `SpanProcessor` interface listed in Section 3 is correct for the required surface. The current SDK also exposes an optional experimental `onEnding(span: Span): void` hook, but the post does not need to mention it — it is not required for implementing a Simple Span Processor.
- Section 5 shows registering two `SimpleSpanProcessor` instances on the same provider (console + OTLP). This works and is supported, but it doubles the synchronous export cost per span; a reader copying this pattern into a hot path should be aware.
- The `FilteringSimpleSpanProcessor` in Section 6 returns early as soon as `includeErrors` matches, before applying the `excludeNames`/`includeNames`/`minDurationMs` filters. That is intentional from the prose ("Always include errors if configured"), so it is not a bug — just a documented behavior worth noting.
- The benchmark numbers in Section 8 are presented as "typical" ratios; they are illustrative only and will vary heavily with the exporter implementation (in-memory vs network) and workload. The post already frames them this way, so no change required.
- The `Resource.merge`/`defaultResource()` helpers from the new 2.0 resources package are not used in the snippet; for production code, combining `defaultResource()` with `resourceFromAttributes(...)` is the recommended pattern, but the simpler form used here is fine for the tutorial's scope.
