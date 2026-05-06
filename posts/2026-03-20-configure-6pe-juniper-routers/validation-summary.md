# Validation Summary: How to Configure 6PE on Juniper Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Junos OS
- IPv6
- 6PE
- MPLS
- LDP
- BGP / MP-BGP
- OSPF

## Sources Consulted
- Juniper Networks, "IPv6-over-Ipv4 Tunnels | Junos OS": https://www.juniper.net/documentation/us/en/software/junos/mpls/topics/topic-map/ipv6-o-ipv4-tunnels.html
- Juniper Networks, "LDP Configuration | Junos OS": https://www.juniper.net/documentation/us/en/software/junos/mpls/topics/topic-map/ldp-configuration.html
- Juniper Networks, "`family` (Protocols BGP) | Junos OS": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/family-edit-protocols-bgp.html
- Juniper Networks, "`labeled-unicast` | Junos OS": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/labeled-unicast-edit-protocols-bgp-vp.html
- Juniper Networks, "Configuring Junos OS Routing Tables | Junos OS": https://www.juniper.net/documentation/us/en/software/junos/static-routing/topics/topic-map/config_junos_routing_table.html
- Juniper Networks, "`show route advertising-protocol` | Junos OS": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-advertising-protocol.html
- Juniper Networks, "`show route receive-protocol` | Junos OS": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-receive-protocol.html
- Juniper Networks, "`show route forwarding-table` | Junos OS": https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-forwarding-table.html
- Juniper Networks, "IPv6 Features | Junos OS": https://www.juniper.net/documentation/us/en/software/junos/transport-ip/topics/task/ipv6-configure-features.html
- RFC 4798, "Connecting IPv6 Islands over IPv4 MPLS Using IPv6 Provider Edge Routers (6PE)": https://www.rfc-editor.org/rfc/rfc4798.html

## Issues Found
- The post omitted `set protocols mpls ipv6-tunneling`, which Juniper documents as the feature that copies IPv4-signaled MPLS resolution into `inet6.3` for 6PE. I added it to the MPLS sections.
- The core-facing PE interface configuration was incomplete for 6PE. Juniper's 6PE example config requires `family inet6` alongside `family mpls` on core-facing interfaces, so I added that.
- The PE-PE BGP example was incomplete for 6PE route exchange. I updated it to use `family inet6 labeled-unicast explicit-null` and added the export policies used to advertise IPv6 routes between `inet6 unicast` and `inet6 labeled-unicast`.
- The "full configuration" block was missing required BGP prerequisites. I added `routing-options router-id` and `routing-options autonomous-system` on the PE, and the corresponding router ID and local AS on the CE.
- The "full configuration" block included `protocols mpls interface lo0.0` and `protocols ldp interface lo0.0` even though the surrounding example was using interface-based LDP in the core and did not configure loopback MPLS accordingly. I removed those lines to keep the example aligned with the documented 6PE/LDP model.
- The comment `# /etc/junos` was inaccurate for Junos configuration. I changed it to a neutral "Equivalent set commands for PE1" comment.
- Several verification commands were not valid or were a poor fit for Junos CLI. I replaced shell-style `grep` pipelines with native Junos operational commands, changed `show bgp neighbor ... received-routes` to `show route receive-protocol bgp ...`, replaced the invalid `show route table inet6.0 forwarding-type unicast`, and replaced `show mpls label-switched-path detail` with LDP/MPLS commands that match the documented feature set.
- The next-hop policy section incorrectly implied that a generic BGP export policy was what created the IPv4-mapped IPv6 next hop. I corrected it to a `next-hop self` policy and clarified that Junos automatically handles the IPv4-mapped IPv6 next-hop encoding for 6PE.

## Review Notes
- The corrected PE examples assume the provider core already has working IPv4 reachability and LDP between P and PE routers; this post still focuses on the PE and CE pieces of 6PE.
- Transit P routers do not appear in IPv6 traceroute through a 6PE core unless `allow-v4mapped-packets` and `allow-6pe-traceroute` are configured under `[edit system]`.
