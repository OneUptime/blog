# Validation Summary: How to Troubleshoot Metrics Not Being Scraped by Prometheus from the

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus exporter
- OpenTelemetry Collector Prometheus Remote Write exporter
- Prometheus scrape configuration
- Prometheus Kubernetes service discovery
- Kubernetes Services
- kubectl

## Sources Consulted
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus OpenTelemetry guide: https://prometheus.io/docs/guides/opentelemetry/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post used `prometheusremotewrite` as the Prometheus Remote Write exporter name. Current OpenTelemetry Collector documentation uses `prometheus_remote_write`; `prometheusremotewrite` remains only as a deprecated alias. I changed the examples and explanatory text to use `prometheus_remote_write`.
- The remote-write example said the exporter pushes to a Prometheus-compatible endpoint and implied direct pushing to Prometheus always works. I clarified that the exporter pushes to a remote write receiver and that Prometheus must have its remote write receiver enabled when it is the direct destination.

## Review Notes
The Prometheus exporter configuration fields shown in the post (`endpoint`, `namespace`, `send_timestamps`, and `metric_expiration`) are valid. The `/metrics` path, Kubernetes Service port exposure, Prometheus `static_configs`, `kubernetes_sd_configs` with `role: endpoints`, and `__meta_kubernetes_endpoint_port_name` relabeling are consistent with the official documentation. Prometheus notes that the Kubernetes Endpoints API is deprecated in Kubernetes v1.33+, so future posts may prefer the `endpointslice` role for newer clusters.
