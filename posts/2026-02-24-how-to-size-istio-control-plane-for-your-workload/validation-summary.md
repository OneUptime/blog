# Validation Summary: How to Size Istio Control Plane for Your Workload

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio control plane and istiod
- IstioOperator installation configuration
- Istio Sidecar and DestinationRule APIs
- Kubernetes kubectl commands
- Prometheus queries for Istio and Kubernetes metrics
- Kubernetes resource requests, limits, and autoscaling

## Sources Consulted
- Istio Performance and Scalability: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- IstioOperator Options: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Configuration Scoping: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio Locality Load Balancing: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/distribute/
- Istio istioctl reference and control plane metrics list: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/

## Issues Found
- The post used `pilot_xds_pushes` as the primary push-rate metric. Current Istio documentation lists `pilot_push_triggers` for push trigger counts, so the shell and PromQL examples now use `pilot_push_triggers`.
- The CPU deep dive showed raw histogram metric names for push latency and queue time. Prometheus histogram queries need bucket series for percentile calculations, so those examples now use `histogram_quantile(...)` over `pilot_proxy_convergence_time_bucket` and `pilot_proxy_queue_time_bucket`.
- The locality load balancing section claimed each proxy would only get endpoints in its zone. Istio locality load balancing controls endpoint preference/distribution, not endpoint visibility, so the section now says proxies prefer same-zone endpoints.
- The OOM check used `kubectl get events --field-selector reason=OOMKilled`. Kubernetes field selectors support event `reason`, but OOMKilled is most reliably visible in pod container termination state, so the command now checks istiod pod `lastState.terminated.reason`.

## Review Notes
The sizing numbers and memory formula are presented as rough guidelines rather than official Istio guarantees. Istio's official performance documentation confirms the relevant scaling factors but does not publish an exact per-service or per-proxy memory formula, so operators should validate these estimates with their own metrics and load tests.
