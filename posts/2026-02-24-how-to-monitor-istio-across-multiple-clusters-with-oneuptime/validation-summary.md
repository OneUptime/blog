# Validation Summary: How to Monitor Istio Across Multiple Clusters with OneUptime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio multi-cluster service mesh
- Kubernetes
- OpenTelemetry Collector
- Prometheus metrics and PromQL
- OneUptime OTLP ingestion
- istioctl

## Sources Consulted
- Istio multicluster installation overview: https://istio.io/latest/docs/setup/install/multicluster/
- Istio deployment models: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio exported control plane metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio proxy-status diagnostics: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry

## Issues Found
- The OpenTelemetry Collector example referenced `otlp` and `filelog` receivers in pipelines without defining them. Added an `otlp` receiver and changed the logs pipeline to use that defined receiver.
- The OneUptime exporter used an endpoint that did not match current OneUptime OpenTelemetry documentation. Updated the exporter to use OTLP/HTTP with `https://oneuptime.com/otlp`.
- The collector environment variable interpolation used `${ONEUPTIME_TOKEN}` instead of the current documented OpenTelemetry Collector `${env:ONEUPTIME_TOKEN}` form. Updated the header value.
- The Istio sidecar scrape job used a direct address rewrite to port `15090` and did not set `/stats/prometheus`. Updated the scrape job to follow Istio's current Prometheus integration example for Envoy stats.
- The Istiod scrape job selected pods by label rather than the documented `istiod` service `http-monitoring` endpoint. Updated it to scrape endpoint discovery with the service and endpoint port relabeling from Istio's documentation.
- The cross-cluster PromQL examples used `source_cluster!=destination_cluster`, which is not valid PromQL because label matchers compare labels to string values, not to other label values. Replaced the dashboard query with a valid grouped query and noted that same-cluster rows should be filtered out in the visualization. Replaced the alert with an explicit source/destination cluster pair.
- The control plane push error query used `pilot_xds_push_errors`, which is not listed in current Istio exported control plane metrics. Replaced it with `pilot_total_xds_internal_errors`.
- The config divergence alert compared `pilot_xds_pushes` while describing configured route/listener counts. Replaced the example with `pilot_total_rejected_configs` rate comparison and adjusted the comment to match what the metric actually indicates.

## Review Notes
The examples are version-neutral, but Istio metric names and labels can vary with installation settings and telemetry customization. The collector ConfigMap is still a configuration excerpt; a production deployment also needs the usual Kubernetes RBAC, Deployment or DaemonSet, and token injection.
