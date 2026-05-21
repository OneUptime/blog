# Validation Summary: How to Configure Proxy-Level Metric Generation in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- Prometheus
- Istio Telemetry API
- IstioOperator
- Envoy admin statistics

## Sources Consulted
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio MeshConfig / ProxyStatsMatcher reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Customizing Istio Metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio Classifying Metrics Based on Request or Response task: https://istio.io/latest/docs/tasks/observability/metrics/classify-metrics/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics

## Issues Found
- The post said additional Envoy stats are available on the admin interface but not scraped by Prometheus. Istio's current documentation says proxies create and expose only a subset of Envoy stats by default, and `ProxyConfig.ProxyStatsMatcher` opts in to additional stats. Updated the wording to describe creation and reporting accurately.
- The post described `proxyStatsMatcher` as controlling which additional metrics get included in Prometheus output. Updated this to say it controls which additional Envoy stats are created and reported by the proxy, matching the Istio reference.
- The mesh-wide stats matcher example omitted the operational requirement that proxies must restart to pick up the matcher. Added that note from the official Istio Envoy statistics documentation.
- The custom metric example used an EnvoyFilter to insert another `istio.stats` filter with a `stats.PluginConfig` counter. That pattern is not the current supported Telemetry API approach. Replaced it with a Telemetry API example that adds custom dimensions to `REQUEST_COUNT`.
- The histogram bucket example used an old `telemetry.v2.prometheus.configOverride` installation value and `histogram_buckets_override`. Current Istio documentation exposes histogram bucket customization through `sidecar.istio.io/statsHistogramBuckets`. Replaced the snippet with a supported pod annotation example.

## Review Notes
The article is now technically accurate for current Istio documentation. Some examples depend on workload naming, service ports, and cluster-specific Prometheus scrape configuration, so readers should verify generated stat names in a canary environment before building alerts or dashboards around them.
