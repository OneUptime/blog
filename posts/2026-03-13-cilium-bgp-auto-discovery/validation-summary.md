# Validation Summary: Auto-Discovery in Cilium BGP Control Plane

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium BGP Control Plane
- Kubernetes
- BGP
- Cilium CLI
- Cilium BGP custom resources

## Sources Consulted
- Cilium BGP Control Plane Resources: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium BGP Control Plane installation guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium upgrade guide noting BGPv1 and `CiliumBGPPeeringPolicy` removal: https://docs.cilium.io/en/stable/operations/upgrade/
- Cilium CLI `cilium bgp peers` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_bgp_peers.html
- Cilium CLI `cilium bgp routes` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_bgp_routes/

## Issues Found
- The post described annotation-based BGP peer discovery using `cilium.io/bgp-virtual-router.*` annotations and an empty `neighbors` list in `CiliumBGPPeeringPolicy`. Current Cilium documentation describes BGP peer auto-discovery through `autoDiscovery.mode: DefaultGateway` in `CiliumBGPClusterConfig`, so the examples were updated to the current `cilium.io/v2` resources.
- The post used `CiliumBGPPeeringPolicy` with `apiVersion: cilium.io/v2alpha1`. Cilium 1.19 removes the previously deprecated BGPv1 control plane and `CiliumBGPPeeringPolicy`, so the manifest was replaced with `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, and `CiliumBGPAdvertisement`.
- The post implied that BGP routes would be advertised after peer discovery alone. Current Cilium documentation states that no prefixes are advertised by default without matching advertisements, so the example now includes a `CiliumBGPAdvertisement` and matching advertisement selector.
- Verification and automation steps checked node annotations and generated annotations. These were changed to verify the node default route, inspect `CiliumBGPNodeConfig`, run `cilium bgp peers`, and check advertised routes with `cilium bgp routes advertised ipv4 unicast`.
- The auto-discovery flow and conclusion described annotation parsing. These were updated to describe default route resolution and BGP session establishment with the discovered default gateway.

## Review Notes
Current Cilium default gateway auto-discovery creates one BGP session per address family and does not support link-local default gateways. In multi-homed environments, current Cilium selects the default route with the lower metric rather than creating multiple sessions for the same address family.
