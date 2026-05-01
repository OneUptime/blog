# Validation Summary: How to Configure EVPN VXLAN with IPv6 on Juniper

## Status
validated

## Post Type
Guide

## Technologies Covered
- Junos OS
- Juniper QFX switches
- EVPN
- VXLAN
- IPv6 underlay
- BGP EVPN
- OSPFv3
- IRB

## Sources Consulted
- Juniper: EVPN-VXLAN with an IPv6 Underlay — https://www.juniper.net/documentation/us/en/software/junos/evpn/topics/topic-map/vxlan-ipv6-underlay-overview.html
- Juniper: Example: Configure an IPv6 Underlay for Layer 2 VXLAN Gateway Leaf Devices — https://www.juniper.net/documentation/us/en/software/junos/evpn/topics/example/vxlan-ipv6-underlay-bridged-overlay-qfx.html
- Juniper: `vtep-source-interface` CLI reference — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/vtep-source-interface.html
- Juniper: MAC-VRF Routing Instance Type Overview — https://www.juniper.net/documentation/us/en/software/junos/evpn/topics/concept/mac-vrf-routing-instance-overview.html
- Juniper: `default-gateway` CLI reference — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/default-gateway.html
- Juniper: `ip-prefix-routes` CLI reference — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/ip-prefix-routes-edit-routing-instances-protocols-evpn.html
- Juniper: VXLAN Layer 3 Gateways Using the Service Provider Style Interface Configuration — https://www.juniper.net/documentation/us/en/software/junos/evpn/topics/concept/sp-style-cli-layer3-gateway-evpn-vxlan.html
- Juniper: `show arp` CLI reference — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-arp.html
- Juniper: `show ipv6 neighbors` CLI reference — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-ipv6-neighbors.html
- Juniper: `show evpn instance` CLI reference — https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-evpn-instance.html
- Juniper: BGP Route Reflectors — https://www.juniper.net/documentation/us/en/software/junos/bgp/topics/topic-map/bgp-rr.html

## Issues Found
- The original VTEP section used non-Junos `interfaces vtep` configuration and top-level EVPN/VLAN syntax that does not match Juniper’s documented IPv6-underlay QFX approach. I replaced it with a MAC-VRF EVPN instance, `encapsulation vxlan`, and `vtep-source-interface lo0.0 inet6`.
- The post omitted a required 32-bit router ID for IPv6-based OSPFv3/BGP operation. I added `routing-options router-id`.
- The IRB section used an incorrect `set interfaces irb unit 100 mac ...` line and only defined one IRB while referencing two. I replaced that with documented virtual gateway configuration, added `virtual-gateway-accept-data` and `preferred`, and added matching `irb.200` lines.
- The original tenant VRF section had incomplete EVPN Type 5 configuration and an invalid policy example for the stated purpose. I replaced it with documented `route-distinguisher`, `vrf-target`, and `ip-prefix-routes` settings including `encapsulation vxlan` and an L3 VNI.
- The verification commands used unsupported VRF syntax for ARP and NDP lookups. I changed them to `show arp vpn tenant1` and `show ipv6 neighbors vpn tenant1`, and replaced the VXLAN verification command with documented MAC-VRF tunnel endpoint commands.
- The route reflector example did not configure leaf peers as RR clients, so it would not actually reflect routes. I added `route-reflector-client`, an explicit `local-address`, and a router ID.

## Review Notes
- The post is now technically correct at a configuration-pattern level, but Juniper’s IPv6-underlay EVPN-VXLAN support on QFX varies by platform and Junos release. Feature support, especially for Layer 3 gateway behavior and Type 5 routing, should still be confirmed for the target QFX model and release in Feature Explorer.
- On some QFX platforms, shared VTEP tunnels are required for IPv6-underlay EVPN-VXLAN and may need `set forwarding-options evpn-vxlan shared-tunnels` plus a reboot if the feature is not enabled by default.
