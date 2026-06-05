# Validation Summary: How to Configure the Load Balancing Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib load balancing exporter
- OTLP exporter configuration
- DNS and Kubernetes service discovery
- Collector internal telemetry metrics
- Prometheus scraping

## Sources Consulted
- OpenTelemetry Collector Contrib load balancing exporter README and package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/loadbalancingexporter
- OpenTelemetry Collector gateway deployment pattern documentation: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib load balancing exporter source configuration: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/config.go
- OpenTelemetry Collector Contrib load balancing exporter metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/metadata.yaml
- OpenTelemetry Collector OTLP exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlpexporter
- Referenced OneUptime OTLP gRPC exporter post: https://oneuptime.com/blog/post/2026-02-06-otlp-grpc-exporter-opentelemetry-collector/view
- Referenced OneUptime Collector pipelines post: https://oneuptime.com/blog/post/2026-01-07-opentelemetry-collector-pipelines/view

## Issues Found
- The examples used the deprecated exporter type name `loadbalancing`. Updated examples to use `load_balancing`, the current preferred component name.
- Several OTLP sub-exporter examples placed `insecure` directly under `protocol.otlp`. Updated those examples to use `protocol.otlp.tls.insecure`, which matches current Collector OTLP exporter configuration.
- The post described round-robin and random balancing strategies. The load balancing exporter routes by configured keys such as `traceID`, `service`, `metric`, `resource`, `streamID`, and `attributes`, rather than exposing round-robin or random strategies. Replaced that section with accurate routing-key descriptions.
- The post claimed the exporter performs configurable backend health checks and included an invalid `health_check` block. Replaced the section with supported retry, sending queue, timeout, and resolver-refresh guidance.
- The post implied routing keys affect logs. Updated the text to explain that logs are routed by trace ID when present, or by an auto-generated trace ID.
- The monitoring example used a `prometheus` data exporter and the deprecated or ignored `service.telemetry.metrics.address` setting for Collector internal metrics. Updated it to use `service.telemetry.metrics.readers` with a Prometheus pull exporter.
- The integration section claimed the load balancing exporter works with Jaeger and Zipkin protocols. Updated it to state that downstream load balancing uses OTLP.

## Review Notes
- The load balancing exporter is beta for traces and logs, and development stability for metrics in the current contrib documentation. Future readers should check the component README for stability and schema changes before copying production configurations.
- YAML snippets were parsed successfully after edits.
