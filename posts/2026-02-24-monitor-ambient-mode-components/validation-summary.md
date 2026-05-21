# Validation Summary: How to Monitor Ambient Mode Components

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ambient mode
- ztunnel
- Waypoint proxies
- istiod
- Prometheus and PromQL
- Prometheus Operator PodMonitor and PrometheusRule resources
- Grafana
- Kiali
- Kubernetes and kubectl

## Sources Consulted
- Istio ambient mode overview: https://istio.io/latest/docs/ambient/overview/
- Istio ambient data plane architecture: https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio ztunnel troubleshooting and ambient observability: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio waypoint proxy configuration: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio resource labels reference: https://istio.io/latest/docs/reference/config/labels/
- Istio secure metrics documentation: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio 1.30 Helm chart templates and addon manifests: https://github.com/istio/istio/tree/release-1.30
- Prometheus Operator API reference for PodMonitor and PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The ztunnel metrics table listed `istio_tcp_connection_duration_seconds`, but the official Istio standard TCP metrics do not include a TCP connection duration metric. Removed that row.
- The raw Prometheus scrape config for waypoint proxies did not set `metrics_path: /stats/prometheus`, so it would default to `/metrics` and miss the waypoint Envoy metrics endpoint. Added explicit `metrics_path` values for both ztunnel and waypoint jobs.
- The Prometheus Operator section said to create ServiceMonitor resources, but the YAML uses `kind: PodMonitor`. Updated the wording to PodMonitor.
- The PodMonitor examples used numeric strings in the `port` field. Prometheus Operator expects `port` to be the pod port name, so the examples now use `ztunnel-stats` for ztunnel and `http-envoy-prom` for waypoint proxies.
- The addon commands referenced Istio `release-1.24`, which is outdated for this 2026 review. Updated Grafana, Prometheus, and Kiali addon URLs to `release-1.30`.
- The ztunnel memory alert divided by memory limit without handling pods that have no memory limit. Updated the text and expression so the percentage alert only applies when a memory limit is present.

## Review Notes
The post is now technically accurate for current Istio ambient mode behavior. The Istio sample addon manifests are suitable for demos and development, but production monitoring deployments should manage Prometheus, Grafana, and Kiali with the organization's normal deployment and security practices.
