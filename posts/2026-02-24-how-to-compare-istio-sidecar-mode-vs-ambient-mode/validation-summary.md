# Validation Summary: How to Compare Istio Sidecar Mode vs Ambient Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar mode
- Istio ambient mode
- Kubernetes
- Envoy
- ztunnel
- Waypoint proxies
- Istio AuthorizationPolicy
- Gateway API
- Istio CLI

## Sources Consulted
- Istio ambient mode overview: https://istio.io/latest/docs/ambient/overview/
- Istio sidecar or ambient data plane comparison: https://istio.io/latest/docs/overview/dataplane-modes/
- Istio ambient data plane architecture: https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio waypoint proxy configuration: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio Layer 4 security policy in ambient mode: https://istio.io/latest/docs/ambient/usage/l4-policy/
- Istio Layer 7 features in ambient mode: https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Job API reference: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- The sidecar injection pod example used `sidecar.istio.io/inject` as an annotation. Current Istio documentation describes per-pod injection control as a label, while the annotation form is deprecated. I moved it under `metadata.labels`.
- The ambient L4 AuthorizationPolicy example used `targetRefs` while describing ztunnel-enforced L4 policy. Istio's L4 ambient policy guide documents selector-based targeting for ztunnel enforcement; `targetRefs` is used for waypoint-enforced policy attachment. I changed the example to use `spec.selector.matchLabels`.
- The comment above the L4 AuthorizationPolicy said L4 authorization uses source identity only. Istio supports several L4 attributes, including source identity, namespace, IP blocks, and destination ports. I broadened the wording.
- The feature parity list overstated ambient support for `VirtualService`, telemetry, and multi-cluster operation. I updated it to state that Gateway API routes are preferred for ambient, VirtualService support is alpha in ambient mode, L7 telemetry requires waypoints, and ambient multi-cluster support has release-specific limitations.
- The sidecar advantages list implied Wasm plugins only fit sidecar mode. Current Istio documentation lists `WasmPlugin` support for waypoint proxies as alpha, so I changed the wording to emphasize mature sidecar-attached Wasm deployment instead of exclusivity.

## Review Notes
The resource usage estimates are directionally consistent with Istio's documented comparison, but exact memory and CPU savings depend on workload count, waypoint placement, traffic volume, and configured proxy resource requests. The post remains a high-level comparison rather than a benchmark.
