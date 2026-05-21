# Validation Summary: How to Monitor Proxy-Level Metrics in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy proxy
- Kubernetes
- Prometheus and PromQL
- Grafana
- Prometheus Operator PrometheusRule

## Sources Consulted
- Istio Envoy Statistics: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio Secure Metrics: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio ProxyStatsMatcher reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/#ProxyStatsMatcher
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Envoy server statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics
- Envoy upstream cluster statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy listener statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy HTTP connection manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats

## Issues Found
- The raw Envoy stats command used `curl` inside the `istio-proxy` container. Istio's official documentation uses `pilot-agent request GET stats`, which is available in the proxy container and does not depend on a curl binary being present. Updated the command accordingly.
- The HTTP 5xx query used `envoy_http_downstream_rq_xx{envoy_response_code_class="5"}`, but Envoy HTTP connection manager stats expose aggregate counters such as `downstream_rq_5xx`, which Istio's Prometheus conversion exposes as `envoy_http_downstream_rq_5xx`. Updated the query.
- The WebSocket metric used `envoy_http_downstream_cx_websocket_active`, which is not a current Envoy HTTP connection manager statistic. Envoy tracks active upgraded connections with `downstream_cx_upgrades_active`, which includes WebSocket upgrades. Updated the example to `envoy_http_downstream_cx_upgrades_active`.
- The `proxyStatsMatcher.inclusionPrefixes` example used Prometheus-style metric prefixes (`envoy.cluster...`). Istio's matcher operates on raw Envoy stat names before Prometheus conversion. Removed the incorrect prefix example and kept the raw Envoy-name regex matchers.

## Review Notes
Envoy statistic availability and final Prometheus names can vary with Istio and Envoy configuration. Istio's own Envoy statistics documentation recommends checking metrics in a canary environment before relying on dashboards or alerts across upgrades.
