# Validation Summary: How to Configure MetalLB L2 Mode for Tagged VLANs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services of type LoadBalancer
- MetalLB Layer 2 mode
- MetalLB IPAddressPool and L2Advertisement CRDs
- 802.1Q tagged VLANs
- Linux iproute2 VLAN interfaces
- Ubuntu Netplan VLAN configuration

## Sources Consulted
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB advanced L2 configuration documentation: https://metallb.io/configuration/_advanced_l2_configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB usage documentation for Service annotations: https://metallb.io/usage/
- MetalLB FAQ on tagged VLANs and L2 mode: https://metallb.io/faq/
- Netplan VLAN examples: https://netplan.readthedocs.io/en/0.107/examples/
- Linux ip-link manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Cisco 802.1Q frame format reference: https://www.cisco.com/c/en/us/support/docs/lan-switching/8021q/17056-741-4.html

## Issues Found
- The Service example used the legacy `metallb.universe.tf/address-pool` annotation. Updated it to the current MetalLB-documented `metallb.io/address-pool` annotation.
- The L2Advertisement explanation said that omitting `interfaces` breaks VLAN isolation. MetalLB documentation says default all-interface L2 advertisement can work with tagged VLANs, so the wording was corrected to say interface constraints make the VLAN-specific intent explicit.

## Review Notes
The MetalLB `IPAddressPool` and `L2Advertisement` API versions and fields are current for the documented v0.13+ CRD-based configuration. The Linux `ip link add link eth0 name eth0.100 type vlan id 100` pattern and Netplan `vlans` syntax were verified against current documentation. The `interfaces` selector does not influence MetalLB's L2 leader election, so every eligible speaker node should have the named VLAN interface or the advertisement should be paired with suitable node selectors in stricter deployments.
