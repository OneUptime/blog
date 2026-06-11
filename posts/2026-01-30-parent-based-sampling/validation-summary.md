# Validation Summary: How to Create Parent-Based Sampling

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- OpenTelemetry SDK for Node.js (`@opentelemetry/sdk-node`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/api`)
- OpenTelemetry SDK for Python (`opentelemetry-sdk`, `opentelemetry.sdk.trace.sampling`)
- OpenTelemetry SDK for Go (`go.opentelemetry.io/otel/sdk/trace`)
- OpenTelemetry Collector (`tail_sampling` processor, `probabilistic_sampler` processor, OTLP receiver/exporter)
- W3C Trace Context specification (`traceparent`, `tracestate` headers)
- Express, FastAPI, net/http (framework examples)
- Vitest (testing framework)

## Sources Consulted
- OpenTelemetry Python SDK `sampling.py` source: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/sampling.py
- OpenTelemetry JS SDK trace-base samplers: https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-base
- OpenTelemetry Go SDK trace samplers: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Collector contrib `tail_sampling` processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Collector core `probabilistic_sampler` processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/probabilisticsamplerprocessor
- W3C Trace Context spec: https://www.w3.org/TR/trace-context/
- OpenTelemetry Go `semconv/v1.24.0` package

## Issues Found

1. **Python custom sampler missing `trace_state` parameter** — The `BusinessAwareSampler.should_sample()` method in Section 9 omitted the `trace_state` parameter from its signature. The current `opentelemetry-sdk` Python abstract `Sampler.should_sample()` includes `trace_state: Optional["TraceState"] = None` as a keyword argument, and the SDK's tracer invokes the sampler with `trace_state=...` as a kwarg. A subclass missing this parameter would raise `TypeError: should_sample() got an unexpected keyword argument 'trace_state'` at runtime.
   - **Fix applied:** Added `trace_state: Optional[TraceState] = None` to the method signature, added `TraceState` import, and forwarded `trace_state` in the inner call to `self._parent_based.should_sample(...)`.

## Review Notes
- Node.js examples use `new Resource({...})` from `@opentelemetry/resources`. This still works in current packages but is deprecated in favor of `resourceFromAttributes()` in the `@opentelemetry/resources` 2.x line. Not changed since the existing form still functions and matches a large body of pre-existing user code.
- Sampler default behavior described in Section 4 (Local/Remote × Sampled/NotSampled → AlwaysOn/AlwaysOff) matches the OpenTelemetry specification for `ParentBased` defaults across all three SDKs.
- The `traceparent` header format example (`00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`) is a valid W3C Trace Context value: version `00`, 32-hex trace ID, 16-hex parent ID, sampled flag `01`.
- Go SDK option helpers `WithLocalParentSampled`, `WithLocalParentNotSampled`, `WithRemoteParentSampled`, `WithRemoteParentNotSampled` and samplers `AlwaysSample()`, `NeverSample()`, `TraceIDRatioBased(...)`, `ParentBased(...)` all match the current `go.opentelemetry.io/otel/sdk/trace` exports.
- Collector `tail_sampling` policy types `status_code`, `latency`, `probabilistic` and the field names (`status_codes`, `threshold_ms`, `sampling_percentage`, `decision_wait`, `num_traces`) are correct for the current `tailsamplingprocessor`.
- Node.js `SamplingDecision` enum values used (`RECORD_AND_SAMPLED`, `NOT_RECORD`) and `TraceFlags.SAMPLED` / `TraceFlags.NONE` are correctly named.
