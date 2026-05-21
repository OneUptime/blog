# Validation Summary: How to Debug EnvoyFilter Configuration Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio
- EnvoyFilter
- Envoy proxy
- Kubernetes
- istioctl
- kubectl

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio debugging Envoy and Istiod guide: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Envoy administration interface reference: https://www.envoyproxy.io/docs/envoy/latest/operations/admin

## Issues Found
- The post said EnvoyFilters in `istio-system` apply to all workloads. Istio documentation defines this behavior for the configured config root namespace, which is often `istio-system` but may be different. Updated the sentence to refer to Istio's configured root namespace.
- The post described a `pilot-agent request GET stats | grep http` command as using the access log to see which requests are going through filter chains. That command queries Envoy stats, not access logs, and stats do not directly show per-request filter-chain traversal. Updated the wording to describe the command as a quick signal for active HTTP listeners, routes, or clusters.

## Review Notes
The command examples align with current Istio, Envoy, and Kubernetes documentation. `istioctl` and `kubectl` were not installed locally in the review environment, so command validation was performed against official generated command references and official Envoy/Istio documentation.
