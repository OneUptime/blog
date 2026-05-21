# Validation Summary: How to Roll Back Traffic Shifting in Istio

## Status
validated

## Post Type
Tutorial / Incident response guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule subsets
- Istio Envoy configuration propagation
- Kubernetes Deployments
- kubectl apply, logs, scale, and rollout status
- istioctl describe
- Prometheus / Istio standard metrics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio traffic management best practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The first rollback example used a `subset: v1` route without stating that the corresponding DestinationRule subset must already exist. Added that assumption before the command because Istio subset destinations must be declared in a DestinationRule.
- The post said the old version can immediately handle 100% of traffic. Changed this to depend on the old version still running and being sized for the load.
- The post described config propagation as going to all sidecars and typically taking 1-5 seconds. Changed this to affected Envoy proxies and removed the fixed timing claim, since Istio documents eventual propagation and scaling-dependent behavior rather than a universal 1-5 second guarantee.
- The post claimed no downtime unconditionally. Clarified that the routing change itself should not cause downtime when v1 has enough ready endpoints.
- The final summary described rollbacks as always safe and non-disruptive. Qualified this with the requirement that the previous version remains available and has enough capacity.

## Review Notes
The VirtualService API version and route weight syntax are current for Istio `networking.istio.io/v1`. The kubectl commands and Prometheus metric names/labels are valid. The `istioctl x describe service` command is still documented as an experimental describe subcommand, so it is suitable for troubleshooting but should not be treated as a stable automation interface.
