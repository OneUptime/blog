# Validation Summary: How to Configure the Load Balancing Exporter for Consistent Hashing Across

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector load balancing exporter
- OpenTelemetry Collector tail sampling processor
- OTLP exporter
- Kubernetes headless Services
- Kubernetes EndpointSlice discovery
- DNS and static backend resolvers

## Sources Consulted
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector load balancing exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/loadbalancingexporter
- OpenTelemetry Collector load balancing exporter generated telemetry docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/documentation.md
- OpenTelemetry Collector load balancing exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/config.go
- OpenTelemetry tail sampling processor documentation and examples: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry tail sampling guide: https://opentelemetry.io/blog/2022/tail-sampling/
- Kubernetes headless Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services

## Issues Found
- The exporter examples used `loadbalancing`, which is now a deprecated alias. Updated all exporter IDs and pipeline references to `load_balancing`, matching the current OpenTelemetry Collector contrib documentation.
- The post described standard Kubernetes Service behavior as round-robin. Kubernetes Services load-balance across endpoints, but the exact mechanism is not guaranteed to be round-robin and does not provide trace affinity. Updated the wording to avoid overstating the algorithm.
- The Kubernetes resolver example used `service: "otel-gateway-headless"` while the Service was defined in the `monitoring` namespace. Updated it to `service: "otel-gateway-headless.monitoring"` so the example resolves the intended Service even when namespace inference is not appropriate.
- The Kubernetes resolver example omitted the required API permission caveat. Added a sentence noting that the collector service account needs permission to get, list, and watch EndpointSlice objects in the target namespace.

## Review Notes
The remaining configuration structure, resolver fields, routing keys, load balancer telemetry metric names, headless Service configuration, and tail sampling policy examples match current OpenTelemetry documentation. A local `otelcol` or `otelcol-contrib` binary was not available in the workspace, so validation was performed against official documentation and source rather than by running `--dry-run`.
