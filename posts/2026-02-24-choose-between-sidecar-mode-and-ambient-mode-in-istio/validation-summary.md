# Validation Summary: How to Choose Between Sidecar Mode and Ambient Mode in Istio

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Istio ambient mode
- Istio sidecar mode
- Kubernetes
- Envoy
- ztunnel
- Waypoint proxies
- mTLS and SPIFFE identities

## Sources Consulted
- Istio ambient mode overview: https://istio.io/latest/docs/ambient/overview/
- Istio sidecar or ambient dataplane mode comparison: https://istio.io/latest/docs/overview/dataplane-modes/
- Istio add workloads to ambient mesh guide: https://istio.io/latest/docs/ambient/usage/add-workloads/
- Istio configure waypoint proxies guide: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio use Layer 7 features in ambient mode guide: https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio use Layer 4 security policy in ambient mode guide: https://istio.io/latest/docs/ambient/usage/l4-policy/
- Istio ambient data plane architecture: https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio performance and scalability documentation: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The resource-budget example used proxy memory estimates that did not match Istio's current official performance documentation. Updated the illustrative sidecar, ztunnel, and waypoint memory calculations to use Istio's published values: about 60 MB per sidecar proxy, 12 MB per ztunnel proxy, and 60 MB per waypoint proxy in the documented benchmark conditions.
- The waypoint latency sentence claimed sub-millisecond latency specifically on the same node. Istio documentation describes waypoint traffic as passing between ztunnels through a waypoint and publishes benchmark latency data, but actual latency depends on traffic patterns and infrastructure. Reworded the sentence to avoid an unsupported same-node claim.

## Review Notes
The remaining claims are consistent with current Istio documentation: ambient and sidecar modes can coexist, ambient enrollment uses the `istio.io/dataplane-mode=ambient` label without pod restarts, sidecar injection uses `istio-injection=enabled` and applies at pod creation time, waypoints are required for ambient L7 features, ztunnel handles L4 security and telemetry, and `istioctl ztunnel-config` is a current diagnostic command. Ambient mode is generally available in current Istio releases, while support boundaries can still vary for advanced deployment models such as multicluster.
