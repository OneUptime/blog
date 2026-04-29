# Validation Summary: How to Identify Well-Known IPv6 Multicast Addresses

## Status
validated

## Post Type
Reference

## Technologies Covered
- IPv6 multicast addressing
- Neighbor Discovery Protocol (NDP) and ICMPv6 router discovery
- DHCPv6
- Multicast Listener Discovery (MLD)
- Linux networking tools (`ip`, `ss`, `ping6`, `tcpdump`, `ip6tables`)
- Python `ipaddress`

## Sources Consulted
- IANA IPv6 Multicast Address Space registry: https://www.iana.org/assignments/ipv6-multicast-addresses/ipv6-multicast-addresses.xhtml
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 9915, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc9915
- RFC 4795, Link-local Multicast Name Resolution (LLMNR): https://www.rfc-editor.org/rfc/rfc4795
- RFC 5340, OSPF for IPv6: https://www.rfc-editor.org/rfc/rfc5340
- Local `ip-maddress(8)` man page from iproute2
- Local `ping(8)` man page from iputils 20240117
- Local `ss(8)` man page
- Local `tcpdump(8)` man page

## Issues Found
- The table incorrectly identified `ff02::1:3` as a DHCPv6 multicast group. I changed it to LLMNR and kept `ff05::1:3` as the DHCPv6 all-servers site-scoped group, matching IANA, RFC 9915, and RFC 4795.
- The interface-local `ff01::1` and `ff01::2` descriptions were imprecise as "loopback only". I changed them to "all nodes on the interface" and "all routers on the interface" to match RFC 4291 scope semantics.
- The Router Advertisement capture comment said packets were sent "from ff02::2 members", which is misleading because routers send RAs from their interface addresses. I reworded the comment to describe routers as the senders.
- The DHCPv6 example heading and table text used loose wording around "agents". I updated them to the RFC 9915 terminology "relay agents and servers".
- The DHCPv6 capture comment claimed to capture Solicit messages specifically, but the filter actually captures general DHCPv6 traffic on UDP ports 546 and 547. I corrected the description.
- The `ip -6 maddr show dev eth0 -d` example used the `-d` flag in the wrong position. I corrected it to `ip -d -6 maddr show dev eth0`, which matches current `ip` syntax.
- The `ss -6 -n -l | grep ff02` example claimed to show multicast subscriptions, but `ss` reports sockets rather than multicast group membership. I replaced it with `ss -u -6 -n -l` and adjusted the explanation to describe UDP listeners that may receive multicast traffic.
- The "Capture NDP traffic only" `tcpdump` filter only matched destinations `ff02::1` and `ff02::2`, which does not cover neighbor solicitations sent to solicited-node multicast and did not match the surrounding description. I changed it to an ICMPv6 RS/RA filter.
- The DHCPv6 multicast capture example incorrectly used `ff02::1:3`. I corrected it to `ff05::1:3`.
- The firewall examples implied a single OSPFv3 multicast rule was sufficient. I added the `ff02::6` DR/BDR rule and also added `ff05::1:3` to the DHCPv6 multicast example so the examples align with the corrected address assignments.

## Review Notes
- RFC 9915 obsoleted RFC 8415 in January 2026. The post remains accurate after the fixes above, but DHCPv6 behavior should now be read against RFC 9915.
- Multicast scope 5 (`ff05::/16`) remains valid for site-local multicast even though site-local unicast addressing was deprecated separately.
- The Python solicited-node helper was syntax-checked and its sample outputs were verified.
- The `tcpdump` filters were syntax-checked locally with `tcpdump -d`.
- The `rdisc6` example was documentation-verified, but the `ndisc6` package is not installed in this workspace, so that command was not executed here.
