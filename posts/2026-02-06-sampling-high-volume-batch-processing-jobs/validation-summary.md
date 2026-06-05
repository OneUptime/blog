# Validation Summary: How to Configure Sampling for High-Volume Batch Processing Jobs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python SDK
- OpenTelemetry Collector tail sampling processor
- OTLP trace export
- OpenTelemetry metrics API
- Python
- YAML

## Sources Consulted
- OpenTelemetry Python sampling API: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/

## Issues Found
- The custom Python sampler example referenced `trace.sampling.SamplingResult` and `trace.sampling.Decision`, which are not valid OpenTelemetry Python API paths. Updated the example to import `Sampler`, `SamplingResult`, `Decision`, and `ParentBased` from `opentelemetry.sdk.trace.sampling`.
- The custom sampler did not include the current `trace_state` parameter from the OpenTelemetry Python `Sampler.should_sample` signature. Added `trace_state=None` and passed it through to `SamplingResult`.
- The rate-limited sampler was applied directly as the provider sampler, which would make decisions per span and could produce partial traces. Wrapped it in `ParentBased(...)` so the rate limit applies to root traces while child spans follow the parent sampling decision.
- The mixed-workload Collector section called the example a "composite policy", but the YAML uses `and` policies. Updated the wording to match the actual tail sampling policy type.

## Review Notes
- Python code blocks were syntax-checked with `python3` after the fixes.
- YAML snippets were parsed with PyYAML after the fixes.
- Tail sampling requires all spans for a trace to reach the same Collector instance when Collectors are scaled horizontally; that operational caveat is correct in the official Collector documentation but is not expanded in this post.
