# Validation Summary: How to Configure MetalLB BGP Peering via a VRF

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- MetalLB
- MetalLB FRR-K8s / FRR BGP mode
- BGP
- Linux VRF and iproute2
- Netplan
- FRRouting

## Sources Consulted
- MetalLB Advanced BGP Configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB Advanced IPAddressPool Configuration: https://metallb.io/configuration/_advanced_ipaddresspool_configuration/
- MetalLB BGP Configuration: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB Usage documentation: https://metallb.io/usage/
- Linux kernel VRF documentation: https://docs.kernel.org/networking/vrf.html
- iproute2 local help output for `ip link` and `ip vrf`
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html

## Issues Found
- The post described VRF support as requiring "FRR mode." Current MetalLB documentation distinguishes FRR-K8s and FRR modes, and VRF peering is supported in FRR-based modes. Updated the wording to "FRR-based mode (FRR-K8s or FRR mode)."
- The Linux prerequisite stated kernel 4.15 or later. Linux VRF/l3mdev support is documented for earlier modern kernels, with the l3mdev rule available from kernel 4.8 and iproute2 VRF support from iproute2 4.7. Updated the prerequisite accordingly.
- The VRF connectivity example said the `-I` flag binds `ping` to the VRF device, but the command used `ip vrf exec` and did not include `-I`. Updated the comment to accurately describe `ip vrf exec`.
- The Service example used the deprecated `metallb.universe.tf/address-pool` annotation prefix. Updated it to the current `metallb.io/address-pool` annotation.

## Review Notes
The MetalLB custom resources and fields used in the examples are valid for current MetalLB APIs: `BGPPeer` `metallb.io/v1beta2`, `IPAddressPool` `metallb.io/v1beta1`, `BGPAdvertisement` `metallb.io/v1beta1`, and `BGPPeer.spec.vrf`. The Netplan and iproute2 examples match documented VRF configuration patterns. In production, node-specific interface names, addresses, and routing table IDs must be generated or managed per node rather than copied verbatim to every host.
