# Validation Summary: How to Fix the Mistake of Not Adding the memory_limiter Processor as the First

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector memory_limiter processor
- OpenTelemetry Collector batch processor
- OTLP receiver and exporter configuration
- Kubernetes container memory limits
- Collector internal telemetry metrics

## Sources Consulted
- OpenTelemetry Collector memory_limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector OTLP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The post said the memory limiter drops data at the hard limit. The official memory_limiter documentation says the processor starts refusing data above the soft limit and additionally forces garbage collection above the hard limit. Updated the comments and explanatory bullets to reflect refusal and forced GC instead of hard-limit dropping.
- The post overstated that slow exporters cause batches to pile up before the memory limiter. The batch processor does buffer data before later processors, but exporter queues are a separate downstream concern. Reworded the explanation to focus on earlier processors consuming memory before the limiter checks usage.
- The post implied SDK queues always hold and retry refused data. The official docs say receivers are expected to retry and may apply back-pressure, while sender retry behavior depends on the receiver/protocol and SDK configuration. Qualified the description accordingly.
- The metric examples used Prometheus-style `_total` suffixes without context. Official internal telemetry docs list raw metric names without `_total`, while Prometheus can add the suffix depending on exporter configuration. Updated the examples and added a note about Prometheus suffix behavior.

## Review Notes
- The recommendation to put `memory_limiter` first is consistent with official OpenTelemetry Collector guidance.
- The configuration fields `check_interval`, `limit_mib`, `spike_limit_mib`, `sending_queue`, `retry_on_failure`, `send_batch_size`, `timeout`, and `send_batch_max_size` match current Collector documentation.
- In containerized deployments, the official docs generally recommend `limit_percentage` over a fixed `limit_mib`; the post now mentions this as a consideration while keeping the original fixed-limit example.
