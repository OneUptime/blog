# Validation Summary: How to Create Custom OpenTelemetry Span Processors

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK (`@opentelemetry/sdk-trace-base`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/api`, `@opentelemetry/exporter-trace-otlp-http`)
- OpenTelemetry Python SDK (`opentelemetry.sdk.trace`, `opentelemetry.trace`, `opentelemetry.context`)
- TypeScript / Node.js
- Python
- OTLP / HTTP exporter
- Jest (for the testing section)

## Sources Consulted
- OpenTelemetry JS `SpanProcessor` interface — https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-base/src/SpanProcessor.ts
- OpenTelemetry JS `NodeTracerProvider` — https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-node/src/NodeTracerProvider.ts
- OpenTelemetry JS v2.0.0 release notes (removal of `addSpanProcessor`) — https://github.com/open-telemetry/opentelemetry-js/releases/tag/v2.0.0
- OpenTelemetry JS `HrTime` / `ReadableSpan` types — https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/common/Time.ts and `.../export/ReadableSpan.ts`
- OpenTelemetry JS `AttributeValue` type — https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/common/Attributes.ts
- OpenTelemetry Python SDK trace module — https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/__init__.py
- OpenTelemetry HTTP semantic conventions — https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/

## Issues Found
1. **`provider.addSpanProcessor()` no longer exists.** This method was deprecated in the OpenTelemetry JS 1.x line and **removed in `@opentelemetry/sdk-trace-node` v2.0.0** (May 2025). The post used it in four places (sections 3, 4, and 8 of the original). I replaced each occurrence with the `spanProcessors` array passed via the `NodeTracerProvider` constructor.
   - Section 3 (Registering the Processor): rewrote the registration block to build a `SpanProcessor[]` list and pass it via `new NodeTracerProvider({ spanProcessors })`. Added a comment noting the v2.0 removal.
   - Section 4 (Filtering — Usage Example): replaced the trailing `provider.addSpanProcessor(filteringProcessor)` with `new NodeTracerProvider({ spanProcessors: [filteringProcessor] })` and added the missing `NodeTracerProvider` import.
   - Section 8 (Chaining — Complete Pipeline): switched the final registration to the constructor form.

## Review Notes
- **HTTP semantic conventions.** The post reads `http.target` and `http.url` from span attributes (sections 4 and 10). As of the current semantic conventions registry these are marked **Deprecated** in favor of `url.path` / `url.full` (and `http.method` was replaced by `http.request.method`). Many JS/Python auto-instrumentations still emit the legacy attributes (often in dual mode via `OTEL_SEMCONV_STABILITY_OPT_IN`), so the code will still work against real-world telemetry — but a future revision should at least check the new `url.path` attribute alongside the legacy ones to remain robust.
- **`forceFlush` in JS does not take a timeout.** The interface section correctly shows `forceFlush(): Promise<void>` (no parameter). This matches the upstream interface; no change needed. (The Python signature includes `timeout_millis`, which is also correct.)
- **`onEnding` hook.** The current `SpanProcessor` interface in `@opentelemetry/sdk-trace-base` also exposes an optional `onEnding(span: Span): void` hook that fires just before the span becomes read-only. The post doesn't mention it — not an error, but it's a useful escape hatch worth covering in a future revision (especially for the redaction pattern, where mutating the span in `onEnding` is cleaner than constructing a shallow copy in `onEnd`).
- **`PrioritySamplingProcessor` decision-storage caveat.** Storing a sampling decision keyed by `spanId` in `onStart` and clearing it in `onEnd` works, but any spans that never call `span.end()` will leak entries — the in-text section 9 already addresses unbounded-state risk, so this is consistent. Worth a one-line note in a future update.
- **Sampling-via-processor caveat.** Custom sampling via a processor (section 7) only drops spans at export time; the spans are still allocated, attributed, and traverse the pipeline. The built-in `Sampler` API drops them at creation. The post's framing ("more complex scenarios") is fair, but a sentence calling out the cost difference would help readers choose correctly.
