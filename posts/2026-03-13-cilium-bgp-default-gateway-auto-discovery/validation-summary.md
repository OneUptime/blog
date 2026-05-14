# Validation Summary: Default Gateway Auto-Discovery in Cilium BGP

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Cilium BGP Control Plane
- Kubernetes
- Helm
- BGP
- Linux routing

## Sources Consulted
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane resources and DefaultGateway auto-discovery documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium `cilium bgp` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_bgp/
- Cilium `cilium bgp routes` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_bgp_routes/
- Kubernetes `kubectl debug` node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post used the removed/legacy `CiliumBGPPeeringPolicy` API and a wildcard `peerAddress: "0.0.0.0/0"` to imply auto-discovery. Current Cilium documentation configures default gateway discovery with `autoDiscovery.mode: DefaultGateway` under a peer in `CiliumBGPClusterConfig`, so the YAML was updated to use `cilium.io/v2` resources.
- The Helm example used `bgpControlPlane.defaultGatewayAutoDiscovery=true`, which is not the documented way to enable this feature. The Helm step now only enables `bgpControlPlane.enabled=true`, and the auto-discovery behavior is configured in the BGP peer definition.
- The original example used `exportPodCIDR: true`, `serviceSelector`, and per-neighbor timer fields from the older BGP API shape. The corrected example uses `CiliumBGPAdvertisement` for `PodCIDR` advertisement and `CiliumBGPPeerConfig` for timers and address-family advertisement selection.
- The introduction described discovery as reading the kernel routing table only at startup. The current docs describe reconciliation when the selected default route changes, so the wording and flow diagram were updated accordingly.
- The prerequisites claimed `Cilium v1.15+`; the documented configuration uses current `cilium.io/v2` BGP resources and `DefaultGateway` auto-discovery, so the prerequisite was narrowed to a Cilium version that supports those resources and this auto-discovery mode.
- The validation output sample used outdated column names. It was adjusted to match the current `cilium bgp peers` output shape more closely.

## Review Notes
- Default gateway auto-discovery currently creates one BGP session per address family. In multi-homing scenarios, Cilium selects the lower-metric default route and reconciles if that selected route changes.
- Link-local default gateways are not supported by Cilium DefaultGateway auto-discovery.
