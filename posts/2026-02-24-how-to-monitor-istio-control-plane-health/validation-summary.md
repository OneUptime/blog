# Validation Summary: How to Monitor Istio Control Plane Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Istiod control plane
- Prometheus and PromQL
- Prometheus Operator PrometheusRule resources
- Grafana dashboards
- istioctl
- IstioOperator
- Kubernetes metrics and kube-state-metrics

## Sources Consulted
- Istio pilot-discovery exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Envoy and Istiod with proxy-status and proxy-config: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio Diagnose your Configuration with istioctl analyze: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio Customizing the installation configuration: https://istio.io/latest/docs/setup/additional-setup/customize-installation/

## Issues Found
- The post used `pilot_xds_push_errors`, which is not listed in the current Istio pilot-discovery exported metrics. Replaced it with the current `pilot_total_xds_internal_errors` and `pilot_total_xds_rejects` counters in the query and alert.
- The configuration conflicts section used `pilot_conflict_outbound_listener_http_over_current_tcp`, which is not in the current exported metrics reference. Replaced it with `pilot_vservice_dup_domain`, a current metric for duplicate VirtualService domains.
- The service discovery section used `pilot_endpoints`, which is not in the current exported metrics reference. Replaced it with current endpoint health indicators: `pilot_endpoint_not_ready` and `pilot_k8s_endpoints_pending_pod`.
- The CSR example called `sum(rate(citadel_server_success_cert_issuance_count[5m]))` a success rate, but it is a rate of successful certificate issuances, not a ratio. Updated the comment to avoid implying it is a success percentage.
- The proxy disconnection alert compared connected XDS clients with every ReplicaSet-created pod in the cluster, including pods that are not expected to run an Istio sidecar. Changed the comparison to use `kube_pod_container_info{container="istio-proxy"}` as a closer estimate of expected sidecar proxies when kube-state-metrics is available.

## Review Notes
The Istio control plane concepts, certificate metric names, `istioctl proxy-status`, `istioctl analyze --all-namespaces`, `istioctl proxy-config cluster`, and IstioOperator `components.pilot.k8s.resources` and `hpaSpec` examples match current official documentation. The Prometheus examples assume Prometheus Operator CRDs, kube-state-metrics, and standard Kubernetes/cAdvisor scrape labels are present.
