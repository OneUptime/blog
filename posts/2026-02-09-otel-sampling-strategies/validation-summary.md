# Validation Summary: How to configure OpenTelemetry sampling strategies for trace volume control

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python SDK
- OpenTelemetry sampling
- OpenTelemetry Collector
- OTLP trace export
- Python
- YAML

## Sources Consulted
- OpenTelemetry Python SDK sampling API: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry SDK environment variable configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry Collector probabilistic sampler processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md

## Issues Found
- The parent-based sampler example used `ALWAYS_ON` for `remote_parent_not_sampled` while the comment said it should never sample. Changed it to import and use `ALWAYS_OFF`, matching OpenTelemetry's parent-based sampler behavior.
- The rate-limited sampler was configured directly as the provider sampler, which could make child spans ignore parent sampling decisions and break trace consistency. Wrapped it in `ParentBased(root=...)` so the rate limit applies to root spans and child spans follow their parent.
- The composite sampler class name was written as `CompositeS ampler`, which is invalid Python syntax. Corrected it to `CompositeSampler`.
- The composite head-sampling example implied it could always sample errors and slow operations, but head sampling only sees information available when a span starts. Changed the conditions to use attributes known at span creation time and updated the best-practice note to recommend tail sampling for completed-trace criteria such as errors and latency.
- The dynamic sampling example used `datetime.now()` without importing `datetime`. Added `from datetime import datetime`.
- The dynamic sampling comment said to sample more during business hours while the code returned a lower sampling rate. Changed the comment to say it samples less during business hours.
- The introductory sampling explanation overstated that sampled traces include all spans and unsampled traces are dropped completely. Reworded it to describe span creation and parent-based propagation more accurately.

## Review Notes
- The OpenTelemetry specification now marks `TraceIdRatioBased` as deprecated in favor of the newer `ProbabilitySampler`, but OpenTelemetry Python's current public sampling docs still expose and document `TraceIdRatioBased`, and the SDK specification says the original behavior must not be removed before January 1, 2027.
- The Python snippets were syntax-checked with `ast.parse`. They were not import-run locally because OpenTelemetry Python packages are not installed in this workspace.
