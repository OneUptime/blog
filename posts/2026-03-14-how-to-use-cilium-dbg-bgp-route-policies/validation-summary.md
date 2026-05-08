# Validation Summary: Using Cilium Debug BGP Route Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Cilium BGP Control Plane
- Kubernetes
- BGP
- `kubectl`
- `cilium-dbg`

## Sources Consulted
- Cilium command reference for `cilium-dbg bgp route-policies`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp_route-policies/
- Cilium BGP Control Plane overview: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane resources: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium 1.19 upgrade guide: https://docs.cilium.io/en/stable/operations/upgrade/

## Issues Found
- The post used the removed `CiliumBGPPeeringPolicy` BGPv1 API. Updated prerequisites, the BGP configuration example, and troubleshooting commands to use current `cilium.io/v2` resources: `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, and `CiliumBGPAdvertisement`.
- The introduction described Cilium as advertising pod and service CIDRs. Updated this to Pod CIDRs and service virtual IPs, matching Cilium's documented advertisement types.
- The BGP enablement troubleshooting item referenced the agent/config key directly. Updated it to the documented Helm value `bgpControlPlane.enabled=true`.
- The prerequisites contained two empty bullet points. Removed them because they were malformed Markdown and did not represent valid prerequisites.

## Review Notes
- The `cilium-dbg bgp route-policies` command is still present in the Cilium command reference and supports the optional `vrouter <asn>` argument plus output formatting flags.
- Current Cilium documentation notes that `CiliumBGPPeeringPolicy` and BGPv1 were removed in Cilium 1.19, so older manifests using that API need migration before upgrade.
