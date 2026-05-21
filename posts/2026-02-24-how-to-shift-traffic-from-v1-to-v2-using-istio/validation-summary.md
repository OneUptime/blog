# Validation Summary: How to Shift Traffic from v1 to v2 Using Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio telemetry metrics and PromQL
- istioctl
- Kubernetes Deployments
- Kubernetes Services

## Sources Consulted
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl describe diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post said Kubernetes round-robins across all pods when no VirtualService is present. Kubernetes Services load balance across matching endpoints, but the exact algorithm is implementation-dependent. Updated the wording to say the Service can load balance across all matching pods.
- The post labeled a PromQL success-rate query as an error-rate query. Updated the surrounding text to call it a success-rate query.
- The post said Istio requires route weights to add up to 100. Istio treats route weights as relative proportions, where each destination receives `weight / sum(all weights)` traffic. Updated the guidance to recommend normalizing to 100 for readability instead of describing it as a hard requirement.

## Review Notes
The Istio `istioctl experimental describe service` command is valid and has the short alias `istioctl x describe service`, but official Istio documentation still marks the command as experimental and under active development.
