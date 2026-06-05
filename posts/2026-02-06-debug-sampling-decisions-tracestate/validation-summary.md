# Validation Summary: How to Debug Sampling Decisions with OpenTelemetry Trace State

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript API and SDK
- OpenTelemetry sampling
- W3C Trace Context (`traceparent` and `tracestate`)
- TypeScript
- Express middleware

## Sources Consulted
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry JavaScript sampling documentation: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry TraceState probability sampling specification: https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/
- `@opentelemetry/api@1.9.1` package declarations from npm
- `@opentelemetry/sdk-trace-base@2.7.1` package declarations from npm

## Issues Found
- The sampler examples imported `Sampler`, `SamplingResult`, and `SamplingDecision` from `@opentelemetry/api`, where those types are deprecated. Updated the examples to import sampler types from `@opentelemetry/sdk-trace-base`.
- The examples used `SamplingDecision.RECORD_AND_SAMPLE`, but current OpenTelemetry JS packages expose `RECORD_AND_SAMPLED`. Updated all TypeScript examples accordingly.
- The `TraceIdRatioBasedSampler.shouldSample` call passed six arguments, but the current JS SDK implementation accepts `context` and `traceId`. Updated that call.
- The examples overwrote `tracestate` with a new empty state. Updated the code to preserve existing parent/result `tracestate` before setting the debug entry.
- The examples used the `ot` tracestate key for custom data, which conflicts with OpenTelemetry's own `ot` tracestate subkeys such as `th` and `rv`. Updated the custom examples to use a vendor-style `company` key.
- The post overstated that SDK debug logging shows every sampling decision with inputs and outputs. Updated the wording to recommend explicit custom sampler logging for that level of detail.
- The querying section implied attributes could be queried on dropped spans. Updated the wording to focus on traces that were kept, because `NOT_RECORD` spans are not recorded and their attributes are dropped.
- The auditing section described span events, but the code recorded sampler attributes. Updated the section wording to match the implementation.

## Review Notes
- Standalone TypeScript examples were compile-checked with `typescript`, `@opentelemetry/api@1.9.1`, and `@opentelemetry/sdk-trace-base@2.7.1`.
- The usage snippet references an application-specific `ErrorSampler`, and the diagnostic endpoint references existing application variables such as `app`, `sampler`, and `rateLimiter`; those are illustrative and were not treated as standalone compilable examples.
