# Validation Summary: How to Monitor ztunnel Health and Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ambient mode
- ztunnel
- Kubernetes
- Prometheus
- Prometheus Operator PodMonitor
- Grafana
- istioctl

## Sources Consulted
- Istio ambient mode overview: https://istio.io/latest/docs/ambient/overview/
- Istio ztunnel troubleshooting guide: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio ambient Helm install guide: https://istio.io/latest/docs/ambient/install/helm/
- Prometheus Operator API reference for PodMonitor: https://prometheus-operator.dev/docs/api-reference/api/
- ztunnel README and metrics reference: https://github.com/istio/ztunnel/blob/master/README.md
- ztunnel architecture and port reference: https://github.com/istio/ztunnel/blob/master/ARCHITECTURE.md
- Istio ztunnel Helm chart templates and values: https://github.com/istio/istio/tree/master/manifests/charts/ztunnel

## Issues Found
- The PodMonitor example used `port: http-monitoring`, but the current Istio ztunnel DaemonSet exposes the metrics container port as `ztunnel-stats`. Changed the PodMonitor endpoint to `port: ztunnel-stats`.
- The standard Prometheus scrape config tried to build `__address__` from the `prometheus.io/port` annotation, which would produce an invalid target such as `15020:15020`. Changed it to use `__meta_kubernetes_pod_ip` with `replacement: ${1}:15020`.
- The Grafana queries filtered on `app="ztunnel"`, which is not guaranteed to exist as a metric label unless the Prometheus setup copies Kubernetes pod labels into target labels. Changed the examples to filter on `job=~".*ztunnel.*"`, which works with the post's `ztunnel` scrape job and the shown `ztunnel-monitor` PodMonitor.
- The config dump example used port `15020`, but ztunnel serves metrics on `15020` and the admin config dump on `15000`. Updated the port-forward and curl command to use `15000` for `/config_dump`.
- The `istioctl ztunnel-config authorization` command is not in the current Istio command reference. Changed it to `istioctl ztunnel-config policies`.
- The restart and memory alerts filtered on `container="ztunnel"`, but the ztunnel Helm chart names the container `istio-proxy`. Updated both alerts to use `container="istio-proxy"` and `pod=~"ztunnel-.*"`.

## Review Notes
The post is technically relevant and accurate after the corrections. ztunnel exposes only L4 TCP Istio metrics when traffic uses only the ambient secure overlay; full HTTP metrics require a waypoint proxy, which the post already notes.
