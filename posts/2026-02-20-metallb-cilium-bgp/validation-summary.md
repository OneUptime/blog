# Validation Summary: How to Use MetalLB Alongside Cilium BGP Control Plane

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services
- MetalLB
- Cilium BGP Control Plane
- Cilium LB IPAM
- BGP
- Helm
- FRRouting

## Sources Consulted
- Cilium BGP Control Plane overview: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane resources: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium BGP Control Plane operation guide and CLI commands: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-operation/
- Cilium LB IPAM documentation: https://docs.cilium.io/en/stable/network/lb-ipam/
- Cilium upgrade guide for removed/deprecated CRDs: https://docs.cilium.io/en/stable/operations/upgrade/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB usage documentation: https://metallb.io/usage/
- MetalLB installation documentation for LoadBalancerClass support: https://metallb.io/installation/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post said both MetalLB and Cilium BGP Control Plane assign LoadBalancer IPs. Updated this to clarify that Cilium LB IPAM assigns LoadBalancer IPs and Cilium BGP Control Plane advertises them.
- The Cilium examples used deprecated/removed `CiliumBGPPeeringPolicy` resources and `cilium.io/v2alpha1` `CiliumLoadBalancerIPPool`. Updated them to current `cilium.io/v2` resources: `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, `CiliumBGPAdvertisement`, and `CiliumLoadBalancerIPPool`.
- The Cilium IP pool examples used host-address CIDR notation such as `192.168.1.211/28` and `192.168.1.200/27`. Replaced these with explicit `start`/`stop` ranges to express the intended address ranges accurately.
- The Cilium BGP examples used old `virtualRouters`, `exportPodCIDR`, and `serviceSelector` fields. Replaced them with current peer configuration and advertisement selector resources.
- The service example did not ensure Cilium LB IPAM selected the intended pool. Added a service label matching the Cilium pool selector and `loadBalancerClass: io.cilium/bgp-control-plane`.
- The Helm command included API server settings that are not part of the Cilium BGP enablement step. Simplified it to preserve existing values and enable `bgpControlPlane.enabled`.
- The MetalLB annotation removal command only used legacy annotation names. Added the current `metallb.io/loadBalancerIPs` and `metallb.io/address-pool` annotations.
- The Cilium BGP verification commands ran `cilium bgp` inside a Cilium pod. Updated them to use the documented Cilium CLI commands.
- The router verification note referenced the removed `exportPodCIDR` field. Updated it to refer to a configured `PodCIDR` advertisement.
- The L2 mode section was too broad. Tightened it to clarify that MetalLB L2 and Cilium BGP can coexist when they are not allocating or advertising the same LoadBalancer service IPs.

## Review Notes
- The post is technically valid after updates. Cilium BGP APIs have changed significantly across recent releases, so future reviews should check the target Cilium version before publishing.
