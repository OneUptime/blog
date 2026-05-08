# Validation Summary: Using Cilium Debug BGP Commands

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium BGP Control Plane
- Cilium `cilium-dbg` CLI
- Kubernetes custom resources
- BGP routing
- Shell and `kubectl`

## Sources Consulted
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane Resources documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium BGP Control Plane Operation Guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-operation/
- Cilium BGP Control Plane Troubleshooting Guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-troubleshooting/
- Cilium `cilium-dbg bgp` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp/
- Cilium `cilium-dbg bgp peers` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp_peers/
- Cilium `cilium-dbg bgp routes` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp_routes/
- Cilium `cilium-dbg bgp route-policies` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp_route-policies/
- Cilium Upgrade Guide: https://docs.cilium.io/en/stable/operations/upgrade/

## Issues Found
- The post used the removed `CiliumBGPPeeringPolicy` / BGPv1 API. Cilium 1.19 removes that previously deprecated API, so the example and prerequisites were updated to use `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, and `CiliumBGPAdvertisement`.
- The BGP example used `peerAddress: "10.0.0.1/32"`. Current `CiliumBGPClusterConfig` examples use a peer address, not a CIDR string, so it was changed to `"10.0.0.1"`.
- Several examples ran `cilium-dbg bgp routes` without required arguments. The current command requires `<available | advertised> <afi> <safi>`, so the examples now use `cilium-dbg bgp routes available ipv4 unicast` or `cilium-dbg bgp routes advertised ipv4 unicast`.
- The verification section checked for `ciliumbgppeeringpolicies`. This was updated to check the current BGP v2 resources.
- The troubleshooting section referred to `exportPodCIDR: true`, which belongs to the removed peering policy API. It now points readers to the peer advertisement selector and matching `CiliumBGPAdvertisement` labels.
- The route type list mentioned generic custom routes. Current Cilium documentation lists Pod CIDR ranges, Service Virtual IPs, and Interface IPs as supported advertisement types, so the list was corrected.
- The prerequisites listed `jq`, but the post does not use `jq`; it was removed.

## Review Notes
- The examples use IPv4 unicast. In IPv6 or dual-stack clusters, readers should use the matching `ipv6 unicast` form where appropriate.
- Cilium also provides the cluster-wide `cilium bgp` CLI, while this post intentionally focuses on node-local `cilium-dbg` commands run inside the agent pod.
