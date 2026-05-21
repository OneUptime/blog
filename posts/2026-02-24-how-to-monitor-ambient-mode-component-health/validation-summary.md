# Validation Summary: How to Monitor Ambient Mode Component Health

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Istio ambient mode
- ztunnel
- Istio CNI
- Istio waypoint proxies
- istiod
- Kubernetes kubectl
- Prometheus and PrometheusRule
- Grafana dashboards

## Sources Consulted
- Istio ambient overview: https://istio.io/latest/docs/ambient/overview/
- Istio ambient data plane architecture: https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio waypoint proxy configuration: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio ztunnel troubleshooting: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/
- Istio ambient control plane architecture: https://istio.io/latest/docs/ambient/architecture/control-plane/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio CNI troubleshooting and monitoring: https://istio.io/latest/docs/ops/diagnostic-tools/cni/
- Istio install-cni command reference: https://istio.io/latest/docs/reference/commands/install-cni/
- Kubernetes labels and selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Prometheus Kubernetes service discovery configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Gateway API generated resource labels: https://gateway-api.sigs.k8s.io/geps/gep-1762/

## Issues Found
- The post said ambient mode had "three main components" but listed four. Changed this to "four main components."
- The post described waypoint proxies as namespace-level or service-account-level components. Updated this to namespaces, services, or pods, matching current Istio waypoint documentation.
- The ztunnel metric examples used non-stable metric name patterns such as `ztunnel_connections`, `ztunnel_bytes`, and `ztunnel_cert`. Replaced them with documented stable TCP metric names and used `istioctl ztunnel-config certificates` for certificate status.
- The waypoint Prometheus relabel config used `__meta_kubernetes_pod_label_gateway_networking_k8s_io_gateway-name`, but Prometheus converts unsupported label-name characters to underscores. Changed it to `__meta_kubernetes_pod_label_gateway_networking_k8s_io_gateway_name`.
- The CNI section said the Istio CNI agent does not expose Prometheus metrics by default. Updated it to state that CNI metrics are exposed by default and added a command checking `istio_cni_install_ready` on port 15014.

## Review Notes
Some alert expressions are intentionally example-level and may need label matching adjustments for a production Prometheus setup, depending on kube-state-metrics and cAdvisor labels. The technical examples are now aligned with current Istio and Prometheus documentation.
