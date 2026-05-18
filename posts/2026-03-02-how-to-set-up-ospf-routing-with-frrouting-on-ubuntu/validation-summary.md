# Validation Summary: How to Set Up OSPF Routing with FRRouting on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- FRRouting (FRR)
- OSPF (Open Shortest Path First) - link-state routing protocol
- Ubuntu Linux
- vtysh (FRR's integrated shell)
- zebra / ospfd daemons
- Linux IP forwarding (sysctl)
- tcpdump (for packet inspection)
- iproute2 (`ip route`)

## Sources Consulted
- FRRouting official documentation: https://docs.frrouting.org/en/latest/ospfd.html
- FRR Debian/Ubuntu installation guide: https://deb.frrouting.org/
- RFC 2328 - OSPF Version 2
- pcap-filter(7) manpage for tcpdump filter syntax
- iproute2 documentation for `ip route show proto` filter
- IANA Protocol Numbers (OSPF = 89)

## Issues Found

1. **Topology diagram inconsistency**: Router A was labeled "10.0.1.1" in the topology diagram, but this address appears nowhere in the configuration. Router A's actual interface IPs on the depicted links are 10.0.12.1 (to Router B) and 10.0.13.1 (to Router C). Fixed the topology labels to show the correct interface IPs for each router on each link (also added Router B's IP on the 10.0.23.0/30 link for consistency).

2. **Contradictory redistribution comment**: The comment for `default-information originate always metric 100` stated "(requires a default route in the RIB)". This is incorrect because the `always` keyword is precisely what removes that requirement - it forces origination of the default route regardless of whether one exists in the RIB. Rewrote the comment to accurately describe what `always` does.

3. **`ip route show | grep ospf` does not work**: The kernel routing table output from `ip route show` does not include the literal string "ospf", so the grep produces no useful filtering. The correct way to filter by routing protocol is `ip route show proto ospf` (modern iproute2 with FRR-populated rt_protos recognizes the ospf protocol name). Updated the command accordingly.

4. **`tcpdump proto ospf` is not valid pcap-filter syntax**: The pcap-filter primitive `proto` (and `ip proto`) only recognizes a fixed list of protocol names (icmp, icmp6, igmp, igrp, pim, ah, esp, vrrp, udp, tcp). OSPF is not in that list, so `proto ospf` does not work portably. Changed to `ip proto 89` (OSPF's IANA-assigned IP protocol number), which is the correct and portable form.

## Review Notes
- The FRR installation steps use the modern signed-by keyring approach (rather than the deprecated `apt-key add`), which is the current recommended practice for adding third-party APT repositories on Ubuntu 22.04+.
- The `auto-cost reference-bandwidth 10000` recommendation (10 Gbps reference) is sound for modern networks where 10G or faster links are common - the OSPF default of 100 Mbps reference causes any link >= 100 Mbps to receive cost 1, defeating cost-based path selection. Note that the reference bandwidth must match on all routers in the OSPF domain or path selection becomes inconsistent.
- The `area 1 range 10.20.0.0/16` example summarizes a /16, while the only configured network in area 1 is `10.20.0.0/24`. This is technically valid (the /16 covers the /24) but a reader might find the size mismatch confusing; left as-is since it's not incorrect.
- The Hello/Dead timer defaults (10s/40s for broadcast networks) are correct per RFC 2328. Non-broadcast/point-to-multipoint networks default to 30s/120s, but that's outside the scope of the post.
- The note about MTU mismatches causing EXSTART/EXCHANGE hangs is accurate and a common real-world cause of OSPF adjacency problems.
