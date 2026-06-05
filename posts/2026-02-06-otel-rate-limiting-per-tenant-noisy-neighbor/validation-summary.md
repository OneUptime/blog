# Validation Summary: Use Collector-Level Rate Limiting Per Tenant to Prevent Noisy Neighbor Problems

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib routing connector
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry Collector probabilistic sampling processor
- OpenTelemetry Collector memory limiter processor
- OpenTelemetry Transform Processor and OTTL
- Prometheus-format Collector internal metrics

## Sources Consulted
- OpenTelemetry Collector processor registry: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector contrib routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector contrib tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector contrib tail sampling internal telemetry documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md
- OpenTelemetry Collector memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector contrib probabilistic sampler processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md
- OpenTelemetry Collector contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md

## Issues Found
- The post described a `rate_limiter` processor with `rate` and `burst` settings, but the official Collector processor registry does not list a `rate_limiter` processor. Replaced the examples with the documented `tail_sampling` processor and its `rate_limiting` policy.
- The rate-limit configuration fields were not valid for the supported tail-sampling policy. Replaced `rate` with `spans_per_second` and `burst` with `burst_capacity`.
- The routing connector example used `statement: route() where ...`. Updated it to the currently documented `condition` form for resource-attribute routing and added `error_mode: ignore`.
- The memory limiter example referenced the removed `rate_limiter` processor in the pipeline. Updated the processor order to use `memory_limiter`, `tail_sampling`, then `batch`.
- The monitoring section referenced `otelcol_processor_dropped_spans` for a nonexistent rate-limiter processor. Replaced it with the documented tail-sampling metric `otelcol_processor_tail_sampling_count_traces_sampled` and policy/decision labels.
- The prose implied hard ingest-time rate limiting. Adjusted wording to clarify that tail sampling controls exported trace volume using a span-per-second sampling policy, while memory limiter protects Collector memory.

## Review Notes
The corrected approach is valid for trace pipelines, but tail sampling requires enough memory to buffer traces until decisions are made. Production deployments should size `decision_wait`, `num_traces`, and memory limits based on real trace volume and should ensure all spans for a trace reach the same Collector instance before tail sampling.
