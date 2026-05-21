# Validation Summary: How to Set Up Priority-Based Load Balancing in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio DestinationRule and VirtualService
- Envoy locality-aware load balancing
- Kubernetes node topology labels
- Kubernetes readiness and liveness probes
- istioctl proxy-config diagnostics

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio locality failover task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio locality weighted distribution task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/distribute/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes well-known labels reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- Updated Istio networking resources from `networking.istio.io/v1beta1` to the current documented `networking.istio.io/v1` API version.
- Corrected locality terminology: Kubernetes standard topology labels cover region and zone, while Istio/Envoy locality can also include sub-zone via `topology.istio.io/subzone`.
- Corrected the failover explanation so the `failover` block is described as regional failover; same-zone and same-region locality priority is handled by Envoy locality priorities.
- Clarified that `distribute` configures weighted locality distribution, not strict priority failover.
- Corrected the subset routing explanation because a VirtualService route weighted 100% to `primary` does not automatically fail over to the `fallback` subset.
- Removed an invalid/pointless `fault.abort` example from the VirtualService snippet, which lacked an abort status and was configured with a zero percentage.
- Made the Kubernetes Deployment example structurally valid by adding a selector, matching pod labels, and an image field.
- Corrected verification guidance to use `istioctl proxy-config endpoints ... -o json` for inspecting endpoint group priority data instead of claiming the short output always has a `PRIORITY` column.
- Updated the troubleshooting note to state that only one of `distribute`, `failover`, or `failoverPriority` can be set.

## Review Notes
The post now aligns with Istio 1.30 documentation. One future improvement would be to add a dedicated `failoverPriority` example for label-based priority load balancing, but that would be an expansion rather than a correctness fix.
