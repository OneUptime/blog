# Validation Summary: How to Build Custom Observability Pipelines with Istio

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio Telemetry API
- Istio MeshConfig extension providers
- Envoy access logging
- OpenTelemetry Collector
- OpenTelemetry Collector processors, exporters, and routing connector
- Prometheus
- Jaeger
- Grafana Tempo
- Grafana Loki
- Kubernetes Deployments, Services, and ConfigMaps

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio OpenTelemetry access log provider task: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector metrics transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector span processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/spanprocessor/README.md
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- Grafana Loki OTLP ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/

## Issues Found
- The opening implied metrics, traces, and access logs always flow from every sidecar out of the box. Updated the wording because tracing and access logging require appropriate provider and Telemetry configuration.
- The access log provider used `opentelemetry`, which is an Istio tracing provider type. Changed it to `envoyOtelAls`, the Istio provider type documented for OpenTelemetry access logs.
- The Telemetry resources referenced the tracing provider for access logging. Updated them to reference the new `otel-access-log` provider.
- The Kubernetes Service did not expose the Collector's own metrics port or Prometheus exporter port, while the post later port-forwarded the Service on port 8888 and configured the Prometheus exporter on 8889. Added both Service ports and the missing container port.
- The Collector filter processor example used the deprecated legacy `traces.span` form. Updated it to current `trace_conditions` OTTL syntax with `span.attributes`.
- The Collector config used the deprecated/removed Loki exporter. Replaced it with `otlphttp/loki` and Loki's native OTLP endpoint.
- The text said Prometheus received pushed metrics from the exporter. Clarified that the Collector's Prometheus exporter exposes a scrape endpoint.
- The text implied Istio sends standard metrics to the Collector through OTLP. Clarified that this config receives Istio OTLP traces/access logs and any separately supplied OTLP metrics; Istio standard metrics still use the Prometheus provider path unless separately scraped or received by the Collector.
- The routing connector example used outdated routing syntax and did not wire the connector into an incoming traces pipeline. Updated it to current `condition` syntax and added a `traces/in` pipeline that exports to the routing connector.

## Review Notes
The examples remain illustrative and assume compatible backend services exist, such as Jaeger and Tempo OTLP endpoints and Loki 3.x OTLP ingestion. The Collector image is still shown as `latest`; pinning a tested Collector version would make production usage more reproducible.
