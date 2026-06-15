# Validation Summary: How to Implement Custom Samplers in OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing and head sampling
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- Custom sampler implementations
- Parent-based sampling and trace state propagation

## Sources Consulted
- OpenTelemetry specification: Tracing SDK Sampler and SamplingResult: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry JavaScript SDK `@opentelemetry/sdk-trace-base` package declarations: https://www.npmjs.com/package/@opentelemetry/sdk-trace-base
- OpenTelemetry Python SDK sampling API: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.sampling.html
- OpenTelemetry Go sampling documentation: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry Go SDK trace package API: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace

## Issues Found
- The JavaScript examples imported `SamplingDecision` from `@opentelemetry/api` and also imported an unused runtime `Sampler` from `@opentelemetry/sdk-trace-base`. Current JavaScript SDK declarations mark the API package sampling types as deprecated and export the active sampler enum from `@opentelemetry/sdk-trace-base`, so the import was corrected.
- The JavaScript examples used `SamplingDecision.RECORD_AND_SAMPLE`, which is not the JavaScript enum value. Current OpenTelemetry JS uses `SamplingDecision.RECORD_AND_SAMPLED`, so all JavaScript sampler examples and tests were updated.
- The Go custom sampler returned `SamplingResult` values without preserving the parent `TraceState`. Official Go documentation says custom samplers must preserve parent tracestate, so the example now reads the parent span context and includes `Tracestate: psc.TraceState()` in every sampling result.
- The Python custom sampler returned `SamplingResult` values without carrying through tracestate. The example now passes the `trace_state` argument into each `SamplingResult`, so it does not clear tracestate when the sampler does not intend to modify it.

## Review Notes
- The post describes head sampling. Error-based sampling at span creation can only use attributes available when the span starts; errors detected later in the span lifecycle require tail sampling or another downstream policy.
- The spec-level decision names `DROP`, `RECORD_ONLY`, and `RECORD_AND_SAMPLE` are correct, but SDKs expose language-specific enum names such as JavaScript's `RECORD_AND_SAMPLED` and Go's `RecordAndSample`.
