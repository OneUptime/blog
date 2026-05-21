# Validation Summary: How to Send Istio Metrics to OneUptime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy sidecar metrics
- Kubernetes
- OpenTelemetry Collector
- Prometheus
- Prometheus remote write
- OneUptime telemetry ingestion

## Sources Consulted
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/en/telemetry/open-telemetry
- OneUptime Prometheus remote-write example: https://oneuptime.com/blog/post/2026-02-26-argocd-send-metrics-oneuptime/view
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration docs: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio MeshConfig `proxyStatsMatcher` reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/#ProxyConfig
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Prometheus receiver docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/prometheusreceiver
- Prometheus configuration and remote write docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The OpenTelemetry Collector exporter used the `otlp` exporter with `https://otlp.oneuptime.com`, but OneUptime's current docs show the collector using `otlphttp` with `https://oneuptime.com/otlp`, JSON encoding, and the `x-oneuptime-token` header. I updated the exporter and pipeline accordingly.
- The istiod scrape job used pod discovery and attempted to build `__address__` from the `prometheus.io/port` annotation with an invalid replacement. I changed it to Istio's documented endpoint discovery pattern for the `istiod` service `http-monitoring` port.
- The Envoy scrape jobs matched the sidecar container name but did not reliably select the Envoy metrics port. I changed the OpenTelemetry Collector and Prometheus examples to match Istio's documented `.*-envoy-prom` container port name and keep `/stats/prometheus`.
- The collector config included a resource processor that attempted to set `service.name` from `source_workload`; that value is an Istio metric label, not a resource attribute available to the resource processor in this configuration. I removed that processor from the example.
- The Prometheus remote-write example sent Prometheus remote-write data to an OTLP `/v1/metrics` endpoint. I changed it to a Prometheus remote-write endpoint and token header used by OneUptime's metric ingestion examples.

## Review Notes
- The examples are still generic and do not pin the OpenTelemetry Collector image tag. Pinning a tested collector version would improve reproducibility in the future.
- If a cluster relies on Istio's default metrics merge mode, sidecar metrics can also be scraped from `:15020/stats/prometheus` using `prometheus.io` annotations. The post's examples now follow Istio's documented customized scraping configuration for direct Envoy stats scraping.
