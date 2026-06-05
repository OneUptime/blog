# Validation Summary: How to Implement Rate-Limiting Samplers in OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Collector contrib tail sampling processor
- TypeScript
- Token bucket rate limiting
- OTLP HTTP export to OneUptime

## Sources Consulted
- OpenTelemetry JavaScript sampling documentation: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry JavaScript SDK trace-base API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-trace-base.html
- OpenTelemetry JavaScript Sampler interface reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-base.Sampler.html
- OpenTelemetry JavaScript resources API reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript manual instrumentation and metrics documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Collector contrib tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry

## Issues Found
- The custom sampler examples imported `Sampler`, `SamplingResult`, and `SamplingDecision` from `@opentelemetry/api`. These are SDK trace-base types, so the imports were corrected to `@opentelemetry/sdk-trace-base` while keeping `Context`, `SpanKind`, `Attributes`, and `Link` from `@opentelemetry/api`.
- The SDK wiring example used `new Resource(...)`, but current OpenTelemetry JavaScript documentation uses `resourceFromAttributes(...)`. The resource import and constructor call were updated.
- The `ParentBasedSampler` example rate-limited spans with unsampled parents, which could fragment traces and contradicted the prose. The unsampled parent cases now use `AlwaysOffSampler`.
- The Collector section claimed there was no built-in rate-limiting sampler. Current Collector contrib tail sampling includes a `rate_limiting` policy, so the section and YAML were updated to use `type: rate_limiting` with `spans_per_second` and `burst_capacity`.
- The Collector exporter used the gRPC `otlp` exporter with an HTTP OneUptime endpoint. It was changed to `otlphttp` with JSON encoding and the documented content type and token headers.
- The priority-aware SDK example implied final error status can be prioritized by a head sampler. The wording and example were changed to prioritize signals known at span creation and direct final error handling to Collector tail sampling.
- The observable gauge example created a gauge but did not register a callback. It now calls `tokensGauge.addCallback(...)`, and the sampler exposes `getAvailableTokens()`.

## Review Notes
The SDK examples are still illustrative and assume the referenced helper samplers such as `AttributeSampler` are implemented elsewhere. The Collector `rate_limiting` policy is span-rate based, so trace-rate budgeting still requires estimating average spans per trace.
