# Validation Summary: How to Sample Traces Efficiently in Dapr Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar tracing configuration)
- OpenTelemetry Collector (tail-based sampling processor)
- Kubernetes (deployment resources, kubectl)
- Prometheus (observability metrics)

## Sources Consulted
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Tracing Setup: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- OpenTelemetry Collector Contrib - Tail Sampling Processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor

## Issues Found
1. **Fabricated Prometheus metric `dapr_sampling_rate`** (line 148): The blog post referenced a Prometheus metric called `dapr_sampling_rate` for checking accepted vs dropped spans. This metric does not exist in Dapr — the sampling rate is a static configuration value, not a runtime metric. Replaced with actual OpenTelemetry Collector metrics: `otelcol_processor_tail_sampling_count_traces_sampled`, `otelcol_processor_tail_sampling_count_spans_sampled`, and `otelcol_exporter_sent_spans`.

## Review Notes
- All Dapr Configuration resource fields (`apiVersion: dapr.io/v1alpha1`, `kind: Configuration`, `spec.tracing.samplingRate`, `spec.tracing.otel.*`) are correct and current.
- The `samplingRate` values ("0", "0.01", "0.001", "1") are all valid — the field accepts a string between "0" and "1".
- All OpenTelemetry Collector tail_sampling processor fields and policy types (`status_code`, `latency`, `probabilistic`, `string_attribute`) are correctly structured with accurate sub-field names.
- The memory estimation formula (requests/s * spans/trace * decision_wait * bytes/span) is a reasonable approximation for sizing collector resources.
- The memory estimation section uses a bash code block that contains YAML resource limits — this is stylistic and not technically incorrect, but could be clearer.
