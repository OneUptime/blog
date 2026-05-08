# Validation Summary: Using Cilium Debug BGP Routes Command

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- Cilium BGP Control Plane
- Kubernetes
- BGP
- kubectl

## Sources Consulted
- Cilium cilium-dbg bgp routes command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp_routes.html
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane.html
- Cilium BGP Control Plane resources documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration.html
- Cilium BGP Control Plane operation guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-operation/
- Cilium upgrade guide: https://docs.cilium.io/en/stable/operations/upgrade/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The `cilium-dbg bgp routes` examples omitted required arguments. The official command syntax requires `<available | advertised> <afi> <safi>`, so the examples were changed to `cilium-dbg bgp routes available ipv4 unicast` and an advertised-routes example was added.
- The post described the command as showing received routes. The current command exposes available and advertised route views, so the description was updated accordingly.
- The prerequisites and YAML example used the removed `CiliumBGPPeeringPolicy` BGPv1 API. Current stable Cilium uses `cilium.io/v2` resources, so the example was updated to `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, and `CiliumBGPAdvertisement`.
- The troubleshooting guidance referenced `enable-bgp-control-plane` in `cilium-config` and `ciliumbgppeeringpolicies`. The post now points to the current Helm value `bgpControlPlane.enabled=true` and the current BGP CRDs.
- The "No routes shown" troubleshooting note referenced `exportPodCIDR`, which belongs to the removed BGPv1 policy. It now refers to `CiliumBGPAdvertisement` and the peer advertisement selector.
- Removed two empty prerequisite bullets.

## Review Notes
The examples use IPv4 unicast. The same command structure applies to IPv6 by using `ipv6 unicast` when the Cilium deployment and BGP configuration advertise IPv6 routes.
