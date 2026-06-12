# Validation Summary: How to Build Composite Sampling in OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry tracing samplers
- TypeScript
- Node.js OpenTelemetry SDK
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry semantic conventions

## Sources Consulted
- OpenTelemetry JavaScript Sampler TypeDoc: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-base.Sampler.html
- OpenTelemetry JavaScript SamplingResult TypeDoc: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-base.SamplingResult.html
- OpenTelemetry JavaScript sampling docs: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry JavaScript resources docs: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Collector tail sampling processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md

## Issues Found
- Corrected the JavaScript sampling enum member from `RECORD_AND_SAMPLE` to `RECORD_AND_SAMPLED`, which is the current OpenTelemetry JS enum name.
- Corrected TypeScript imports so `Sampler` and `SamplingResult` come from `@opentelemetry/sdk-trace-base`, while context/span attribute types remain from `@opentelemetry/api`.
- Updated the Node SDK resource example from the older `new Resource(...)` and `SemanticResourceAttributes` style to `resourceFromAttributes(...)` with `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`.
- Clarified that head sampling can only use data available when a span is created, so it cannot reliably keep all traces that become errors or high-latency traces after completion.
- Updated error-attribute examples to check `http.response.status_code` while retaining `http.status_code` for compatibility with older telemetry.
- Removed a `SpanNameSampler(..., 0.0)` example that appeared to drop health and metrics spans but would still fall through to the baseline sampler in the shown composite implementation.
- Added missing Collector component definitions for `receivers`, `batch`, and `exporters` so the YAML is a complete, parseable configuration shape.

## Review Notes
The full sampler module and SDK integration snippets were extracted and type-checked against current OpenTelemetry packages. The Collector YAML was parsed successfully. The examples still use simple `Math.random()` for custom attribute/span-name sample rates; for production-grade deterministic trace sampling, prefer trace-ID-based decisions or Collector sampling policies.
