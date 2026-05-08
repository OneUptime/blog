# Validation Summary: The Observability Tax: How Your Monitoring Costs Compound Every Quarter

## Status
validated

## Post Type
Opinion piece / technical strategy guide

## Technologies Covered
- Observability platforms
- Metrics and metric cardinality
- Distributed tracing and spans
- Log management
- OpenTelemetry
- Prometheus-style time series
- Tail-based and head-based trace sampling
- Datadog-style observability metering
- OneUptime
- Kubernetes self-hosting

## Sources Consulted
- OpenTelemetry Metrics Data Model: https://opentelemetry.io/docs/reference/specification/metrics/data-model/
- OpenTelemetry Trace API: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Sampling Concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry Collector Processors: https://opentelemetry.io/docs/collector/components/processor/
- Prometheus Metric and Label Naming: https://prometheus.io/docs/practices/naming/
- Prometheus Data Model: https://prometheus.io/docs/concepts/
- Grafana Loki Cardinality Documentation: https://grafana.com/docs/loki/latest/get-started/labels/cardinality/
- Datadog Custom Metrics Billing: https://docs.datadoghq.com/account_management/billing/custom_metrics/
- Datadog Pricing List: https://www.datadoghq.com/pricing/list/
- OneUptime official site: https://oneuptime.com/
- OneUptime GitHub repository: https://github.com/OneUptime/oneuptime

## Issues Found
- The post originally stated that vendors charge per unique time series. This was too broad because vendor metering differs by product and plan, even though custom metric billing commonly depends on metric/tag-value combinations. Updated the sentence to say many vendors meter custom metrics by unique metric and tag-value combinations.
- The post originally stated that tail-based sampling captures 100% of error traces and slow requests. OpenTelemetry documentation supports tail sampling based on completed-trace criteria, including errors, but only when configured with matching policies and when the collector can evaluate the relevant spans. Updated the wording to say tail-based sampling can be configured to capture those traces.
- The post originally stated that 10% head-based sampling captures enough for performance analysis and that the combined approach reduces trace volume by 80-90%. These are workload-dependent outcomes. Updated the wording to "can" to avoid presenting an operational rule of thumb as a guaranteed result.

## Review Notes
The cost ranges and decision thresholds are business guidance rather than independently verifiable technical facts. They are plausible as illustrative examples but should be treated as workload- and contract-dependent. No code examples, terminal commands, or configuration snippets were present.
