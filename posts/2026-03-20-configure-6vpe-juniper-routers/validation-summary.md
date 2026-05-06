# Validation Summary: How to Configure 6VPE on Juniper Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper Junos OS
- IPv6
- 6VPE
- MPLS
- MP-BGP
- L3VPN
- VRF / routing instances

## Sources Consulted
- Juniper: IPv6 Traffic over Layer 3 VPNs  
  https://www.juniper.net/documentation/us/en/software/junos/vpn-l3/topics/topic-map/l3-vpns-ipv6-traffic.html
- Juniper: family (Protocols BGP)  
  https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/family-edit-protocols-bgp.html
- Juniper: show bgp summary  
  https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-bgp-summary.html
- Juniper: show route table  
  https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-table.html
- Juniper: show route forwarding-table  
  https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-forwarding-table.html
- Juniper: ping  
  https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/ping.html
- Juniper: traceroute  
  https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/traceroute.html
- Juniper: `|` (pipe) command / `match` filter  
  https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/pipe.html
- Juniper: vrf-target  
  https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/vrf-target-edit-routing-instances-vp.html
- Juniper: Hub-and-Spoke VPNs  
  https://www.juniper.net/documentation/us/en/software/junos/vpn-l3/topics/topic-map/l3-vpns-hub-spoke.html
- IETF RFC 4659: BGP-MPLS IP Virtual Private Network (VPN) Extension for IPv6 VPN  
  https://datatracker.ietf.org/doc/html/rfc4659

## Issues Found
- The introduction incorrectly implied that both RD and RT are BGP extended communities. I corrected this to distinguish the route distinguisher in the VPNv6 NLRI from route targets carried as BGP extended communities.
- The post omitted `set protocols mpls ipv6-tunneling`, which Juniper documents as part of 6VPE configuration over an IPv4 MPLS core. I added it to the complete PE configuration and referenced it in the explanatory text.
- One VRF example included an incomplete CE BGP stanza, and another example referenced an undefined `EXPORT-CE-ROUTES` policy. I removed those lines because they were not self-contained and would not commit as shown.
- The verification section used Unix `grep` filters, but Junos operational commands use pipe filters such as `| match`. I corrected the commands accordingly.
- The `ping` and `traceroute` examples used the wrong Junos argument order. I corrected them to place the destination first, followed by `routing-instance` and `inet6`.
- The VPNv6 route inspection command was too terse for the explanation it claimed to provide. I changed it to `show route table bgp.l3vpn-inet6.0 extensive` so the stated RD/label/RT details are actually visible.
- The hub-and-spoke/shared-services example was incomplete and directionally wrong for Junos policy behavior. I replaced it with a policy example that defines the route-target communities explicitly, uses matching `vrf-import` and `vrf-export` policies, and filters on BGP-learned routes to avoid re-exporting imported VPN routes.
- The closing paragraph incorrectly described `vrf-target` as configuring matching RD/RT values. I corrected it to reflect that `route-distinguisher` and `vrf-target` serve different purposes.

## Review Notes
- Operational output can vary slightly by Junos platform and release, but the reviewed control-plane requirements are consistent in current Juniper documentation: `family inet6-vpn unicast` for MP-BGP and `protocols mpls ipv6-tunneling` for 6VPE transport over an IPv4 MPLS core.
- This review was documentation-based. The commands and configuration were not executed on a live Junos device in this workspace.
