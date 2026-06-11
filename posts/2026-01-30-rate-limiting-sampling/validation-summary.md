# Validation Summary: How to Implement Rate Limiting Sampling

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK (`@opentelemetry/sdk-trace-base`, `@opentelemetry/sdk-node`, `@opentelemetry/api`)
- OpenTelemetry Collector (otlp receiver, batch, memory_limiter, filter, tail_sampling processors, otlphttp exporter)
- TypeScript / Node.js
- Token bucket algorithm
- Trace sampling strategies (rate limiting, probabilistic, tail sampling, ParentBased)

## Sources Consulted
- [OpenTelemetry JS sdk-trace-base package on npm](https://www.npmjs.com/package/@opentelemetry/sdk-trace-base)
- [OpenTelemetry JS sampler source directory on GitHub](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-base/src/sampler)
- [OpenTelemetry JS SamplingResult / SamplingDecision definition](https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/trace/SamplingResult.ts)
- [OpenTelemetry JS Sampling docs](https://opentelemetry.io/docs/languages/js/sampling/)
- [opentelemetry-collector-contrib tailsamplingprocessor README](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md)

## Issues Found

1. **Incorrect claim about a built-in `RateLimitingSampler`** (section "Using the Built-in Rate Limiting Sampler"). The post claimed `@opentelemetry/sdk-trace-base` exports a `RateLimitingSampler`, and provided a code example importing and instantiating it. The JS SDK does not ship a rate limiting sampler — the package only exports `AlwaysOnSampler`, `AlwaysOffSampler`, `ParentBasedSampler`, and `TraceIdRatioBasedSampler`. Replaced the section heading and intro with a corrected statement noting the JS SDK does not include one, and removed the broken `new RateLimitingSampler(...)` example. Now the section flows directly into the custom token-bucket implementation that follows.

2. **Wrong import source for `Sampler`, `SamplingDecision`, `SamplingResult`** (four code blocks: `rate-limiting-sampler.ts`, `composite-sampler.ts`, `adaptive-sampler.ts`, `endpoint-sampler.ts`). These types were imported from `@opentelemetry/api`, but they are exported from `@opentelemetry/sdk-trace-base` (the api-side declarations are deprecated and re-direct callers to the SDK package). Split the imports so `Sampler`, `SamplingDecision`, `SamplingResult` come from `@opentelemetry/sdk-trace-base`, while `Context`, `SpanKind`, `Attributes`, and `Link` stay with `@opentelemetry/api` (where they are correctly defined).

3. **Missing exporter in the "Using the Custom Sampler" example**. The original snippet referenced an `OTLPTraceExporter` only via a "...other configuration" comment. Added the explicit `OTLPTraceExporter` import and instantiation that matches the rest of the post's examples so the snippet is runnable.

## Review Notes
- `SemanticResourceAttributes` and the `new Resource({...})` constructor pattern are deprecated in newer `@opentelemetry/semantic-conventions` / `@opentelemetry/resources` releases (replaced by `ATTR_*` constants and `resourceFromAttributes()`). They still work today and are widely seen in tutorials, so left in place — but a future refresh should migrate to the new APIs.
- The `tail_sampling` `rate_limiting` policy with `spans_per_second` is correct and matches the contrib processor docs. Worth noting (as the upstream README does) that this policy is span-based, not trace-based, so traces with many spans can be dropped mid-stream.
- The `filter/rate_limit` processor in the collector example is technically a filter (drops health checks), not a rate limiter — the section title is a bit aspirational, but the YAML itself is valid OTTL syntax.
- `Date.now()` in the token bucket is fine for most workloads; the Pitfall 3 suggestion to use `performance.now()` is a reasonable hardening note for clock-jump resilience.
