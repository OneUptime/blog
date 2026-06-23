# Validation Summary: How to Correlate Frontend Traces with Backend Traces in React

## Status
validated

## Post Type
Tutorial / Guide (hands-on, code-heavy walkthrough of end-to-end distributed tracing in React with OpenTelemetry)

## Technologies Covered
- OpenTelemetry JavaScript (Web SDK: `@opentelemetry/sdk-trace-web`, `sdk-trace-base`, `instrumentation-fetch`, `instrumentation-xml-http-request`, `context-zone`, `exporter-trace-otlp-http`)
- OpenTelemetry Node SDK (`@opentelemetry/sdk-node`, `auto-instrumentations-node`)
- OpenTelemetry Python (`opentelemetry-sdk`, FastAPI instrumentation)
- React (hooks, error boundaries, React Router, TypeScript)
- Axios / Fetch instrumentation
- W3C Trace Context (`traceparent` / `tracestate`)
- Express.js (backend context extraction, CORS)
- Browser Performance API (Navigation Timing)

## Sources Consulted
- OpenTelemetry JS sampling docs — https://opentelemetry.io/docs/languages/js/sampling/
- `@opentelemetry/sdk-trace-base` package & README — https://www.npmjs.com/package/@opentelemetry/sdk-trace-base and https://github.com/open-telemetry/opentelemetry-js
- W3C Trace Context specification (traceparent format `version-traceid-parentid-flags`) — https://www.w3.org/TR/trace-context/
- OpenTelemetry JS API/SDK type exports (Sampler / SamplingResult / SamplingDecision live in `sdk-trace-base`; Context / Link / Attributes live in `@opentelemetry/api`)

## Issues Found
1. **Incorrect import source for sampler types (real compile/resolve error).** Both custom sampler code blocks (`src/tracing/sampler.ts` and `src/tracing/sessionSampler.ts`) imported `Sampler`, `SamplingResult`, and `SamplingDecision` from `@opentelemetry/api`. These types are not exported by `@opentelemetry/api`; they are exported by `@opentelemetry/sdk-trace-base`. Only `Context`, `Link`, and `Attributes` belong to `@opentelemetry/api`. This would fail to resolve/compile regardless of SDK version. Fixed by splitting the import into two lines:
   ```typescript
   import { Context, Link, Attributes } from '@opentelemetry/api';
   import { Sampler, SamplingResult, SamplingDecision } from '@opentelemetry/sdk-trace-base';
   ```
   Applied to both occurrences.

## Review Notes
- The `SamplingDecision` enum member names used (`RECORD_AND_SAMPLED`, `NOT_RECORD`) are the correct OpenTelemetry JS enum identifiers (the spec's human-readable names are Drop/RecordOnly/RecordAndSample, but the JS enum keys are `NOT_RECORD`/`RECORD`/`RECORD_AND_SAMPLED`). Correct as written.
- The W3C `traceparent` format, `propagation.inject`/`extract`, `startActiveSpan` overloads, the Node `NodeSDK` setup, and the Python/FastAPI instrumentation are all accurate.
- Version caveat (not changed — code is valid for OpenTelemetry JS 1.x): With the JS SDK 2.0 line, several APIs used here are deprecated/removed — `new Resource(...)` → `resourceFromAttributes(...)`, `SemanticResourceAttributes` → individual `ATTR_*` constants, and `provider.addSpanProcessor(...)` → passing `spanProcessors` in the `WebTracerProvider`/`NodeSDK` constructor. Readers on SDK 2.x should adjust accordingly. Left as-is since the code is correct for the widely-used 1.x line and changing it would amount to a rewrite rather than an error fix.
- The custom samplers are defined but not explicitly wired into the `WebTracerProvider` (`{ sampler }` config) in the shown setup — illustrative omission, not an error.
- `tracePageLoad` passes raw Navigation Timing values (relative to `timeOrigin`) as span start/end times; these are illustrative and not epoch-aligned, but acceptable for a teaching example.
