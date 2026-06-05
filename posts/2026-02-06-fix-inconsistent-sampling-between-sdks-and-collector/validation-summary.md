# Validation Summary: How to Fix Inconsistent Sampling Between SDKs and Collector

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry SDK sampling
- OpenTelemetry Collector
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry Collector load-balancing exporter
- W3C Trace Context
- Go OpenTelemetry SDK
- Python OpenTelemetry SDK
- Java OpenTelemetry SDK

## Sources Consulted
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry SDK environment variable configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry Go sampling documentation: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Python SDK sampling documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java Sampler Javadoc: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-trace/latest/io/opentelemetry/sdk/trace/samplers/Sampler.html
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The detection example implied that equal-rate SDK sampling always behaves like independent coin flips. I narrowed the statement to independent non-parent-based samplers, because OpenTelemetry's `ParentBased` sampler is the documented way to respect upstream sampling decisions and `TraceIdRatioBased` behavior across SDKs is not guaranteed to be interoperable for child spans.
- The Collector metric example used `otelcol_processor_dropped_spans` as the way to check tail sampling decisions. I changed it to tail-sampling-specific metrics: `otelcol_processor_tail_sampling_global_count_traces_sampled` for decisions and `otelcol_processor_tail_sampling_sampling_trace_dropped_too_early` for traces dropped before a decision.
- The tail sampling section said every kept trace is complete. I added the required caveat that completeness depends on all spans reaching the same Collector before the decision window expires.
- The debugging section said to inspect `tracestate` and the sampling flag. I corrected this to focus on the sampling flag in the W3C `traceparent` header; `tracestate` carries vendor-specific state, not the sampled bit itself.

## Review Notes
The SDK code examples use current public APIs for Go, Python, and Java. `TraceIdRatioBased` remains available, but the OpenTelemetry trace SDK specification now notes that it is being phased out in favor of newer probability sampling work and recommends using it as a root sampler under `ParentBased`.
