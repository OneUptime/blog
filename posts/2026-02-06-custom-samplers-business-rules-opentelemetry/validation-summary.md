# Validation Summary: How to Implement Custom Samplers Based on Business Rules

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing and head sampling
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry Java SDK
- OTLP trace exporters
- Python, Node.js, and Java custom sampler implementations

## Sources Consulted
- OpenTelemetry Python SDK sampling documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry Python `sampling.py` source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/trace/sampling.html
- OpenTelemetry JavaScript sampling documentation: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry JavaScript `Sampler` TypeDoc: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.node.Sampler.html
- OpenTelemetry JavaScript resources documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Java `Sampler` Javadoc: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/1.45.0/io/opentelemetry/sdk/trace/samplers/Sampler.html
- OpenTelemetry Java `SamplingResult` Javadoc: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/1.56.0/io/opentelemetry/sdk/trace/samplers/SamplingResult.html
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/

## Issues Found
- The Python custom sampler omitted the current `trace_state` parameter from `should_sample`. Added `trace_state=None` so the override matches the current OpenTelemetry Python SDK call signature.
- The Python deterministic sampling helper used `int(rate * (2**64 - 1))`, while the Python SDK's `TraceIdRatioBased` uses a rounded bound over `2**64`. Updated the helper to use `round(rate * (2**64))`.
- The Python statistical test iterated sequential trace IDs from `0`, which would all fall below a 5% 64-bit threshold and incorrectly sample 100%. Updated the test to use seeded random 128-bit trace IDs.
- The JavaScript sampler imported `SamplingDecision` from `@opentelemetry/api`, but sampling decisions are provided by `@opentelemetry/sdk-trace-base`. Updated the import.
- The JavaScript setup used `new Resource(...)`, but current `@opentelemetry/resources` documentation exposes `resourceFromAttributes(...)` as the supported construction helper. Updated the setup snippet.
- The JavaScript ratio helper converted `2**64` through `Number`, which loses integer precision. Replaced it with a scaled `BigInt` calculation.
- The Java ratio helper compared an unsigned 64-bit trace ID part against a `Long.MAX_VALUE`-based bound, which would under-sample rates below 1.0. Replaced it with a `BigInteger`/`BigDecimal` calculation over the full `2**64` range.

## Review Notes
The examples are technically valid as custom head samplers. In production, teams should also consider `ParentBased` behavior explicitly and confirm which HTTP semantic convention attribute names their instrumentation version sets at span creation time.
