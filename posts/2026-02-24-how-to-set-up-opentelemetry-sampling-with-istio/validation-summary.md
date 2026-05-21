# Validation Summary: How to Set Up OpenTelemetry Sampling with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio Telemetry API
- Istio MeshConfig / IstioOperator
- OpenTelemetry Collector
- OpenTelemetry tail sampling processor
- Kubernetes ConfigMaps
- Prometheus / PromQL
- W3C Trace Context

## Sources Consulted
- Istio trace sampling documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The post described Istio setting a `sampled` flag in the `traceparent` header. The W3C Trace Context format stores this as the sampled bit in the trace-flags field, so the wording was updated to avoid implying a separate header field.
- The post said a too-short tail sampling decision wait causes incomplete traces to be dropped. The OpenTelemetry Collector tail sampling processor makes a decision after the wait period; the risk is that the decision is based on incomplete trace data. The wording was corrected.
- The tail sampling setup did not mention that all spans for a trace must reach the same collector instance. This is required by the OpenTelemetry Collector tail sampling processor for effective decisions, so a short caveat was added.

## Review Notes
- Istio's `randomSamplingPercentage` Telemetry API examples are current for `telemetry.istio.io/v1`, and the documented valid range is 0.00 to 100.00 with 0.01% precision.
- The `meshConfig.defaultConfig.tracing.sampling` example is still documented, but Istio encourages the Telemetry API for tracing configuration.
- The OpenTelemetry Collector `tail_sampling` policies shown use valid policy types and fields. In multi-collector deployments, a load-balancing strategy is needed so each trace is routed consistently to one collector instance.
