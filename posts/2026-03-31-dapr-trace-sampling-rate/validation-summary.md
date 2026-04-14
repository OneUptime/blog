# Validation Summary: How to Configure Trace Sampling Rate in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Configuration resource, tracing subsystem)
- OpenTelemetry Collector (tail sampling processor, Prometheus exporter)
- W3C Trace Context (traceparent header)
- Kubernetes (kubectl, namespace-scoped configuration)

## Sources Consulted
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Configuration Schema Reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Tracing Setup: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr W3C Trace Context: https://docs.dapr.io/operations/observability/tracing/w3c-tracing-overview/
- OTel Tail Sampling Processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OTel Collector Internal Telemetry: https://opentelemetry.io/docs/collector/internal-telemetry/
- W3C Trace Context Specification: https://www.w3.org/TR/trace-context/

## Issues Found
- **Incorrect tail sampling metric names**: The post listed `otelcol_processor_tail_sampling_count_traces_sampled` and `otelcol_processor_tail_sampling_count_traces_not_sampled` as two separate metrics. In reality, the OTel Collector tail sampling processor emits a single metric `otelcol_processor_tail_sampling_count_traces_sampled` with a `sampled` label (`"true"` or `"false"`) to distinguish between sampled and not-sampled traces. Fixed to use `otelcol_processor_tail_sampling_count_traces_sampled{sampled="true"}` and `otelcol_processor_tail_sampling_count_traces_sampled{sampled="false"}`.

## Review Notes
- The `traceparent` header override section describes the W3C standard mechanism correctly, but there is a known Dapr issue (dapr/dapr#7574) where Dapr may not reliably respect parent trace flags in all cases. This is an implementation bug rather than a documentation error, and may be resolved in future Dapr versions.
- The `num_traces: 100` value in the tail sampling processor example is very low compared to the default of 50,000. While valid as a simplified example, readers copying this to production should increase this value significantly.
- The `service.telemetry.metrics.address` field in the OTel Collector config was deprecated in OTel Collector v0.111.0 in favor of a `readers` configuration. The syntax shown still works in current versions but may be removed in the future.
- The Dapr Configuration API version `dapr.io/v1alpha1` and all field names (`samplingRate`, `otel.endpointAddress`, `otel.isSecure`, `otel.protocol`) are verified correct against current Dapr documentation.
- Storage estimation math is accurate (1000 spans/sec * 1KB * 3600 sec = 3.6 GB/hour, * 24 = ~86 GB/day).
