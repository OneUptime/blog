# Validation Summary: How to Understand ARP in VLAN Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- ARP
- VLANs and IEEE 802.1Q trunking
- Inter-VLAN routing
- Proxy ARP
- Linux `iproute2`
- Linux IPv4 sysctls

## Sources Consulted
- RFC 826: Address Resolution Protocol - https://www.rfc-editor.org/rfc/rfc826.html
- RFC 1027: Using ARP to implement transparent subnet gateways - https://www.rfc-editor.org/rfc/rfc1027.html
- Linux kernel IP sysctl documentation - https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Cisco Routing Between VLANs Overview - https://www.cisco.com/en/US/docs/ios/lanswitch/configuration/guide/lsw_rtng_vlan_ovw.html
- `ip-link(8)` Linux manual page - https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ip-neighbour(8)` Linux manual page - https://man7.org/linux/man-pages/man8/ip-neighbour.8.html

## Issues Found
- The inter-VLAN routing diagram labeled the router gateways as `.10` and `.20`, which conflicted with the host addresses already shown. I corrected the gateway IPs to `192.168.10.1` and `192.168.20.1` so the example is internally consistent and matches the later Linux configuration snippet.
- The VLAN basics text said hosts can only ARP for `192.168.10.x` or `192.168.20.x`. I changed this to say hosts normally ARP for on-link addresses, because ARP is link-local but what a host ARPs for depends on its on-link view and design details such as proxy ARP.
- The 802.1Q framing example labeled `0x8100` as the Ethernet EtherType for ARP. I corrected this to show `0x8100` as the 802.1Q TPID and `0x0806` as the encapsulated ARP EtherType.
- The proxy ARP section implied it generally makes inter-VLAN routing transparent to clients. I narrowed the wording to reflect RFC 1027 and Linux behavior more accurately: proxy ARP can answer for reachable addresses on another interface in specific designs.
- The ARP flooding section incorrectly described switch flooding in terms of an unknown destination MAC. I changed it to describe ARP requests correctly as broadcast frames flooded within the VLAN.
- The mitigation line recommended `/24 or smaller VLANs`, which is too prescriptive and not supported as a general rule by the sources reviewed. I changed it to reducing hosts per VLAN and using designs that support ARP suppression or proxying where appropriate.

## Review Notes
- The Linux `ip` and `sysctl -w` commands used in the post are valid, but they make runtime changes only; persistent configuration would be distribution-specific.
