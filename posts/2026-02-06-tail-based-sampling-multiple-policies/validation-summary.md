# Validation Summary: How to Implement Tail-Based Sampling with Multiple Policies

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib tail sampling processor
- Tail-based trace sampling policies
- Collector internal telemetry
- Prometheus scraping of Collector metrics

## Sources Consulted
- OpenTelemetry Collector Contrib tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Contrib tail sampling processor generated telemetry documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Demo tail sampling sample configuration: https://opentelemetry.io/docs/demo/sample-configurations/tail-sampling-service-criticality/
- OpenTelemetry Collector Contrib load balancing exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md

## Issues Found
- The post described policy evaluation as ordered, pure OR logic. Updated it to explain that ordinary keep policies are OR-like, while `drop` policies and deprecated inverted not-sample decisions can override sampled votes.
- The introductory text implied `tail_sampling` is available in all Collector distributions. Clarified that it is available in distributions that include the processor, such as contrib and Kubernetes.
- Attribute-based sampling was described as span-only. Updated the wording because `string_attribute` policies can match span or resource attributes.
- The `rate_limiting` policy was described as limiting traces per second. Corrected the text and comments to say it limits sampled span rate via `spans_per_second`.
- The Collector self-telemetry example used the ignored `service.telemetry.metrics.address` setting. Replaced it with the current `service.telemetry.metrics.readers` Prometheus pull configuration.
- The self-monitoring example used an undefined `prometheus/self` receiver and a telemetry pipeline for Collector internal metrics. Replaced it with a direct internal telemetry Prometheus endpoint example.
- One listed metric, `otelcol_processor_tail_sampling_count_traces_dropped`, is not emitted by the tail sampling processor. Replaced it with documented tail sampling metrics.

## Review Notes
Validated the complete Collector configuration examples and the updated internal telemetry configuration with `otel/opentelemetry-collector-contrib:latest`, which reported version 0.153.0.
