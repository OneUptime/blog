# Validation Summary: How to Implement Probabilistic Sampling in OpenTelemetry for Cost Control

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python SDK sampling
- OpenTelemetry Go SDK sampling
- OpenTelemetry Collector tail sampling processor
- Prometheus/Grafana metrics for Collector sampling
- Cost-control sampling strategies

## Sources Consulted
- OpenTelemetry Python sampling API docs: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Go sampling docs: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry Go SDK trace package docs: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry sampling concepts docs: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Collector tail sampling processor config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go
- OpenTelemetry Collector tail sampling processor telemetry docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md

## Issues Found
- The head-sampling explanation said unsampled traces never consume resources and the Python example said spans are only created 10% of the time. Updated this to say unsampled spans consume minimal SDK resources and are not recorded/exported.
- The custom Python sampler accessed `parent_context.trace_flags`, but `parent_context` is an OpenTelemetry context, not a span context. Updated both custom samplers to obtain the parent span context with `get_current_span(parent_context).get_span_context()` and preserve parent `trace_state`.
- The custom Python sampler used `TracerProvider` without importing it in that code block. Added the missing import.
- The Go example imported the same SDK package twice, included unused imports, and referenced an undefined `exporter`. Updated the snippet to accept `exporter sdktrace.SpanExporter` and use a single SDK import.
- Several tail sampling examples used `status_codes: [ERROR, UNSET]` while describing an errors-only policy. Updated the examples to use `ERROR` for errors-only sampling.
- The tail sampling examples used `hash_seed`, which is not a valid tail sampling probabilistic policy field. Replaced it with the documented `hash_salt` field.
- The advanced tail sampling example used an unsupported `or` policy type. Removed that invalid block; top-level tail sampling policies already provide OR-like sample behavior when any policy samples and no drop policy rejects the trace.
- The post described tail sampling policies as priority-ordered and described a top-level rate-limiting policy as a global cap. Updated the wording because the processor's default policy evaluation does not provide strict priority ordering or a global cap over traces already sampled by other policies.
- The monitoring section referenced non-existent tail sampling metric names. Replaced them with documented processor metrics such as `otelcol_processor_tail_sampling_sampling_decision_timer_latency` and `otelcol_processor_tail_sampling_count_traces_sampled`.
- The case-study result implied exact mutually exclusive tier math even though the shown top-level policies can overlap. Reworded it as an approximate result when tiers are mutually exclusive.
- Added a caveat that tail sampling requires a Collector distribution containing the tail sampling processor.

## Review Notes
The post is technically valid after corrections. Future improvements could mention that `TraceIdRatioBased` is being phased out in the OpenTelemetry specification in favor of newer probability-sampling APIs, while current Python and Go SDK examples still expose and document `TraceIdRatioBased`.
