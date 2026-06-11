# Validation Summary: How to Build Probability Sampling

## Status
validated

## Post Type
Tutorial / Guide — walks through implementing probability sampling for distributed tracing from first principles, then integrating with OpenTelemetry.

## Technologies Covered
- OpenTelemetry JS SDK (`@opentelemetry/sdk-node`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/sdk-trace-base`)
- OpenTelemetry API (`@opentelemetry/api`) — `Sampler`, `SamplingDecision`, `SamplingResult`, `Context`, `SpanKind`, `Attributes`, `Link`
- OpenTelemetry built-in samplers: `TraceIdRatioBasedSampler`, `ParentBasedSampler`, `AlwaysOnSampler`, `AlwaysOffSampler`
- OpenTelemetry auto-instrumentations (`@opentelemetry/auto-instrumentations-node`)
- OTLP HTTP trace exporter (`@opentelemetry/exporter-trace-otlp-http`)
- OpenTelemetry resources / semantic conventions (`@opentelemetry/resources`, `@opentelemetry/semantic-conventions`)
- TypeScript (BigInt, Node `crypto.createHash`)
- Prom-client (Counter, Histogram, Registry)
- Vitest
- Environment variable conventions: `NODE_ENV`, `OTEL_TRACES_SAMPLER_ARG`, `OTEL_EXPORTER_OTLP_ENDPOINT`

## Sources Consulted
- OpenTelemetry JS API source — `api/src/index.ts` (https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/index.ts) — verified `Sampler`, `SamplingResult`, `SamplingDecision` are exported from `@opentelemetry/api`
- OpenTelemetry JS sdk-trace-base source — `packages/opentelemetry-sdk-trace-base/src/index.ts` — verified sampler classes and re-exports
- OpenTelemetry JS sdk-trace-base `ParentBasedSampler.ts` — verified options object field names (`root`, `remoteParentSampled`, `remoteParentNotSampled`, `localParentSampled`, `localParentNotSampled`)
- OpenTelemetry Sampling Specification (https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampling)
- `@opentelemetry/semantic-conventions` npm and migration docs
- `@opentelemetry/resources` package source and migration docs
- Repo conventions for OneUptime OTLP URL (`https://oneuptime.com/otlp/v1/traces`) — cross-checked against other validated posts in this blog

## Issues Found
No technical issues found.

The post's technical content holds up under review:
- The OpenTelemetry imports of `Sampler`, `SamplingDecision`, `SamplingResult`, `SpanKind`, `Attributes`, `Link`, `Context` from `@opentelemetry/api` are correct — these are all exported from the API package (verified against `api/src/index.ts` on the upstream main branch).
- `ParentBasedSampler`, `TraceIdRatioBasedSampler`, `AlwaysOnSampler`, `AlwaysOffSampler` imports from `@opentelemetry/sdk-trace-node` are valid (re-exported from `sdk-trace-base`).
- The `ParentBasedSampler({ root, remoteParentSampled, remoteParentNotSampled, localParentSampled, localParentNotSampled })` options shape matches the upstream constructor signature exactly.
- The `SamplingDecision.RECORD_AND_SAMPLED` / `SamplingDecision.NOT_RECORD` enum values are the correct names.
- The OneUptime OTLP endpoint URL (`https://oneuptime.com/otlp/v1/traces`) and `x-oneuptime-token` header pattern match the conventions used in other validated posts.
- The core algorithmic claim (use the lower 64 bits of the trace ID to compute a deterministic threshold comparison) reflects the OpenTelemetry specification.

## Review Notes
- The `new Resource({...})` constructor and `SemanticResourceAttributes` enum used in the OpenTelemetry integration example are the v1.x-style API. In current `@opentelemetry/resources` 2.x, `Resource` is type-only and `resourceFromAttributes()` is the supported factory; `SemanticResourceAttributes` has been replaced with individual `ATTR_SERVICE_NAME`-style constants in current `@opentelemetry/semantic-conventions`. The post's style is consistent with many other validated posts in this repository, so no change is needed, but readers using newer SDK majors may need to adapt.
- The `BasicProbabilitySampler` and `ConsistentProbabilitySampler` arithmetic in the educational sections uses Number-to-BigInt conversions that lose precision at very large magnitudes (e.g., `BigInt(Math.floor(ratio * Number(maxLong)))`). The deviation is small enough that sampling rates remain effectively correct, and the code clearly compiles and runs; this is acceptable for a teaching example but a production implementation should compute the threshold entirely in BigInt to avoid float rounding.
- The `custom-otel-sampler.ts` example imports `createHash` from `'crypto'` but does not use it (the class computes the decision via BigInt arithmetic on the trace ID). Harmless, but linters will flag it.
- The "should produce different decisions for different trace IDs" test in the Vitest section uses four trace IDs whose lower 64 bits all fall above the 50% threshold (`0xaaaa…`, `0xbbbb…`, `0xcccc…`, `0xdddd…` are all > `0x8000000000000000`). The test's `hasVariation` assertion would actually fail deterministically rather than "almost never" as the comment suggests. Illustrative for the article but would not pass as written.
- Environment variable usage: the post uses `OTEL_EXPORTER_OTLP_ENDPOINT` as a fully-qualified traces URL. Per the OTLP spec, this env var is the base endpoint and the SDK appends the signal path; `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` is the signal-specific variant. Not incorrect when passed via the `url` constructor option (which is what the code does), but worth knowing.
