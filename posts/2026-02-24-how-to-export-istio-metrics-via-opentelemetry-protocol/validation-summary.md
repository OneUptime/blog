# Validation Summary: How to Export Istio Metrics via OpenTelemetry Protocol

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh metrics
- Istio Telemetry API
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Prometheus scraping and exporters
- Kubernetes manifests and RBAC

## Sources Consulted
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio global MeshConfig and extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio OpenTelemetry tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib release notes: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector metrics transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md

## Issues Found
- The post described Istio metrics as directly pushable through Istio's OpenTelemetry extension provider. Current Istio documentation defines that provider for tracing and access logs, not direct OTLP metric export, so the section was rewritten to keep Prometheus as the Istio metrics provider and use the OpenTelemetry Collector for OTLP export.
- The Collector Kubernetes manifest referenced a service account but did not create the ServiceAccount, ClusterRole, or ClusterRoleBinding needed for Kubernetes service discovery. RBAC resources were added.
- The Prometheus receiver scrape configuration selected pods by `istio-proxy` container name. Istio's documented custom scrape configuration selects Envoy Prometheus ports by container port name ending in `-envoy-prom`, so the relabeling was corrected.
- The Collector image was pinned to the outdated `otel/opentelemetry-collector-contrib:0.96.0`. It was updated to `0.152.0`, the latest official Contrib release found during review.
- The filter processor example used the legacy include configuration. It was updated to the current OTTL `metric_conditions` style.
- The metrics transform processor name `metricstransform` is deprecated in current Collector releases. It was changed to `metrics_transform`.
- The internal Collector metrics endpoint was port-forwarded through a Service, but the config did not bind internal telemetry to `0.0.0.0` or expose port `8888`. The service telemetry reader, container port, and Service port were added.
- The Telemetry API tag override removed `request_host`, which is not a default Istio metric label. It now removes `source_principal` and `response_flags`.
- The multi-backend export example used a tracing-oriented backend name and a vendor-specific placeholder endpoint for metrics. These were changed to generic OTLP metrics backend placeholders.
- The monitoring examples used `rate()` on the `otelcol_exporter_queue_size` gauge and referenced a non-documented dropped metric counter. The alert examples now use documented Collector metrics and a gauge-appropriate queue expression.
- The troubleshooting section used a generic `MetricsExporter` log grep and `curl` against the OTLP/gRPC port. These were replaced with checks for Collector errors and the Collector's own metrics endpoint.

## Review Notes
The guide is technically valid as a Collector-based pipeline for Istio metrics. Direct Istio OTLP metrics export is still not documented as a native Istio Telemetry provider path; future Istio releases should be rechecked before reintroducing that approach.
