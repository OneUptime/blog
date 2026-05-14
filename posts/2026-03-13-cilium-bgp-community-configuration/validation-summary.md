# Validation Summary: Configuring BGP Communities in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium BGP Control Plane
- Kubernetes Services
- BGP communities
- Cilium CLI
- FRRouting verification commands

## Sources Consulted
- Cilium BGP Control Plane Resources: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium BGP Control Plane Operation Guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-operation/
- Cilium CLI `bgp routes` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_bgp_routes/
- RFC 1997, BGP Communities Attribute: https://www.rfc-editor.org/rfc/rfc1997
- RFC 8092, BGP Large Communities: https://www.rfc-editor.org/rfc/rfc8092

## Issues Found
- The post used the legacy `CiliumBGPPeeringPolicy` API and placed communities under `virtualRouters[].neighbors[].advertisements.service.communities`. Current Cilium BGP Control Plane configuration uses `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, and `CiliumBGPAdvertisement`, with communities under `spec.advertisements[].attributes.communities`. Updated the examples accordingly.
- The prerequisite claimed Cilium v1.14+ and an existing `CiliumBGPPeeringPolicy`. Updated this to Cilium v1.19+ and the current BGP v2 resources used by the corrected examples.
- The examples used `peerAddress: "10.0.0.1/32"`. Current `CiliumBGPClusterConfig` examples use a peer IP address, not a CIDR. Updated it to `10.0.0.1`.
- The per-service community section described service annotations and included a commented future annotation. Cilium documentation supports per-service matching through `CiliumBGPAdvertisement` service selectors, so this section now uses service labels and a matching advertisement resource.

## Review Notes
- The `cilium bgp routes advertised ipv4 unicast` and `cilium bgp peers` commands match the official Cilium CLI documentation.
- The well-known community values `no-export`, `no-advertise`, and `blackhole` are supported by Cilium's documented community aliases.
- Verified the corrected YAML snippets parse successfully.
