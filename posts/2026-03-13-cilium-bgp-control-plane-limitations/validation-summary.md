# Validation Summary: Limitations in Cilium BGP Control Plane

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium BGP Control Plane
- Kubernetes custom resources
- BGP
- GoBGP
- Kubernetes Services

## Sources Consulted
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/latest/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane Resources: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium BGP Control Plane Operation Guide: https://docs.cilium.io/en/latest/network/bgp-control-plane/bgp-control-plane-operation/
- Cilium `cilium bgp routes` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_bgp_routes/
- Cilium BGP Control Plane Troubleshooting Guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-troubleshooting/

## Issues Found
- Updated prerequisites from legacy `CiliumBGPPeeringPolicy` guidance to the current v2 resources: `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, and `CiliumBGPAdvertisement`.
- Reworded inbound route filtering to clarify that user-configurable import policy is not exposed, while received routes can be inspected with `cilium bgp routes available ipv4 unicast`.
- Replaced the stale IPv6 limitation with the current address-family constraint: Cilium supports IPv4 and IPv6 unicast, but can only advertise address families enabled in the Cilium deployment.
- Corrected the single-instance-per-node claim. Current Cilium supports multiple BGP instances in one `CiliumBGPClusterConfig`; the documented limitation is that multiple `CiliumBGPClusterConfig` resources cannot select the same node.
- Replaced the deprecated `CiliumBGPPeeringPolicy` service example with a current `CiliumBGPAdvertisement` example and corrected the Service advertisement claim. Cilium advertises `LoadBalancerIP`, `ClusterIP`, and `ExternalIP` only when explicitly configured; `NodePort` is not advertised as a separate Service VIP.
- Updated the Mermaid summary and conclusion to match the corrected limitations.

## Review Notes
Cilium's current documentation confirms that BFD is still unsupported in the BGP Control Plane and that reduced BGP hold/keepalive timers are the available Cilium-side failure-detection tuning mechanism. The post remains a high-level limitations guide rather than a complete deployment tutorial.
