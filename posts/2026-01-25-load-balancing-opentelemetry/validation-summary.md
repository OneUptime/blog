# Validation Summary: How to Configure Load Balancing in OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib load balancing exporter
- OpenTelemetry Collector tail sampling processor
- OTLP and OTLP/HTTP exporters
- Kubernetes Services, DaemonSets, and StatefulSets
- Prometheus metrics for Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector Contrib load balancing exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector gateway deployment pattern documentation: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector Contrib tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md

## Issues Found
- Updated `loadbalancing` exporter examples to `load_balancing`, because `loadbalancing` is now a deprecated alias and official docs recommend the lower-snake-case component name.
- Updated `otlphttp` to `otlp_http`, because `otlphttp` is now a deprecated alias for the OTLP HTTP exporter.
- Corrected the routing-key table and custom resource routing example. The load balancing exporter does not accept arbitrary `resource.attributes...` paths as `routing_key`; selected attribute routing uses `routing_key: attributes` with `routing_attributes`.
- Corrected DNS resolver examples that embedded `:4317` in `hostname`; the DNS resolver expects the hostname and optional `port` as separate fields.
- Corrected the backend failure example to include retry, timeout, and queue settings at the `load_balancing` exporter level as well as under the generated OTLP sub-exporters, because exporter-level settings are needed for rerouting after endpoint topology changes.
- Removed the claim that hot spots are handled with weighted distribution. The load balancing exporter routes by key and does not consider actual backend load.
- Reworked the metrics load-balancing language to account for the OpenTelemetry single-writer principle and stable service/resource routing instead of implying round-robin is always appropriate.
- Updated internal telemetry metrics exposure from the ignored `service.telemetry.metrics.address` field to the current `readers.pull.exporter.prometheus.host` and `port` configuration.

## Review Notes
All YAML snippets were parsed successfully after edits. A Collector binary was not installed locally, so component-level validation was performed against official current documentation rather than `otelcol validate`.
