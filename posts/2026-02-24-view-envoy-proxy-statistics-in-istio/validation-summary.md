# Validation Summary: How to View Envoy Proxy Statistics in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy Proxy
- Kubernetes
- Prometheus
- Grafana
- Istio Telemetry API
- IstioOperator configuration

## Sources Consulted
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio `istioctl experimental envoy-stats` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Customizing Metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio MeshConfig and ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy statistics overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/observability/statistics
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- The post described `/stats?filter=cluster.outbound` as filtering by prefix. Envoy documents `filter` as a regular expression that partially matches stat names, so the comment was changed to "Filter by stat name."
- The post said Envoy generates stats for every cluster, listener, and route by default. Current Istio documentation says Istio configures Envoy to collect a minimal default stat set to reduce CPU and memory usage. The section was updated to describe `proxyStatsMatcher` as enabling additional matching stats.
- The post said the `proxyStatsMatcher` example keeps only selected stats and drops the rest. That was corrected to say it enables selected additional stats compared with broad stat collection.
- The custom tag section used `extraStatTags`, which current Istio MeshConfig documentation marks as deprecated and no longer needed for the native `istio.stats` filter. The deprecated `IstioOperator` snippet was removed, and the text now points to the Telemetry API for adding dimensions to Istio standard metrics.

## Review Notes
The remaining commands and metric names are consistent with current Istio and Envoy documentation. The Prometheus port discussion is technically acceptable, but current Istio documentation also highlights merged application and Envoy metrics on `:15020/stats/prometheus` when Prometheus merge is enabled by default.
