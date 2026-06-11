# Validation Summary: How to Build OpenTelemetry Samplers Custom

## Status
validated

## Post Type
Tutorial / Guide — walks the reader through implementing several custom OpenTelemetry samplers in TypeScript.

## Technologies Covered
- OpenTelemetry JS SDK (`@opentelemetry/api`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/sdk-trace-node`)
- TypeScript
- Distributed tracing / sampling concepts (head-based sampling, token bucket rate limiting, parent-based sampling)

## Sources Consulted
- OpenTelemetry JS `sdk-trace-base` package source: https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-base/src/Sampler.ts
- OpenTelemetry JS `sdk-trace-base` index exports: https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-base/src/index.ts
- OpenTelemetry JS `sdk-trace-base` types: https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-base/src/types.ts
- OpenTelemetry JS `sdk-trace-node` index: https://github.com/open-telemetry/opentelemetry-js/blob/main/packages/opentelemetry-sdk-trace-node/src/index.ts
- OpenTelemetry JS API package index: https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/index.ts
- OpenTelemetry JS API context utilities (`trace.getSpan`): https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/trace/context-utils.ts

## Issues Found

1. **Wrong import package for API types in six code blocks.** The post imported `Context`, `SpanKind`, `Attributes`, and `Link` from `@opentelemetry/sdk-trace-base`. These types live in `@opentelemetry/api` and are not re-exported by `sdk-trace-base`. Compiling the original code would fail with missing-export errors. Fixed by splitting each import block so SDK types (`Sampler`, `SamplingDecision`, `SamplingResult`) come from `@opentelemetry/sdk-trace-base` and API types come from `@opentelemetry/api`. Applied to the AttributeBasedSampler, ErrorAwareSampler, RateLimitingSampler, PatternSampler, CompositeSampler, and PrioritySampler examples.

2. **Missing `Context` import in `ErrorUpgradeProcessor`.** `onStart(span: Span, parentContext: Context)` references `Context` but it was not imported. Added `Context` to the `@opentelemetry/api` import in that block.

3. **Incorrect API for retrieving the parent span from a `Context` in `RateLimitingSampler`.** The original used `context.getValue(Symbol.for('OpenTelemetry Context Key SPAN'))`. `Symbol.for` uses the global symbol registry, but OpenTelemetry's internal `SPAN_KEY` is created via `createContextKey` which produces a non-global symbol — so the lookup would always return `undefined`. Replaced with the public API `trace.getSpan(context)?.spanContext()` from `@opentelemetry/api`, and removed the now-unused `getParentSpanContext` helper. Added `trace` to the `@opentelemetry/api` import.

## Review Notes
- The `Sampler` interface signature, `SamplingResult` shape, and `SamplingDecision` enum values (`NOT_RECORD`, `RECORD`, `RECORD_AND_SAMPLED`) all match the current OpenTelemetry JS SDK exactly.
- `NodeTracerProvider({ sampler })`, `ParentBasedSampler({ root })`, and `TraceIdRatioBasedSampler` usage are all correct.
- The "Putting It All Together" section imports `TraceIdRatioBasedSampler` but never uses it. Not a technical error, just dead code — left as-is per the "fix only what is wrong" guidance.
- The `ErrorUpgradeProcessor` example only logs the upgrade decision; it doesn't actually re-route the span to be exported. The post acknowledges this limitation, but readers should know that genuine post-hoc upgrade of sampling decisions in OpenTelemetry is non-trivial and typically handled at the Collector with the tail-sampling processor rather than in the SDK.
- The trace-ID-to-ratio conversion (`parseInt(traceId.slice(-8), 16) / 0xffffffff`) is a simplified hash and is not consistent with the W3C-aligned `TraceIdRatioBasedSampler` implementation in the SDK. It is fine for illustration but won't agree with the SDK's built-in decisions for the same trace.
