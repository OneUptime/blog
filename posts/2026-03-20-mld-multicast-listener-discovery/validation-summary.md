# Validation Summary: How to Understand MLD (Multicast Listener Discovery) Protocol

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- IPv6 multicast
- MLD (Multicast Listener Discovery), MLDv1, MLDv2
- ICMPv6
- IPv6 Hop-by-Hop Options / Router Alert
- tcpdump / pcap-filter
- Linux IPv6 multicast tooling (`ip -6 maddr`, `/proc/net/ip6_mr_*`, `ip monitor mroute`)
- L2 multicast (MLD snooping on managed switches)

## Sources Consulted
- RFC 2710 — Multicast Listener Discovery (MLD) for IPv6: https://www.rfc-editor.org/rfc/rfc2710
- RFC 3810 — Multicast Listener Discovery Version 2 (MLDv2) for IPv6: https://www.rfc-editor.org/rfc/rfc3810
- RFC 3810 §9 — List of Timers and Default Values
- RFC 3810 §5.2.14 / §6 / §8 — MLDv2 Report destination and removal of report suppression
- IANA ICMPv6 Type Numbers registry
- pcap-filter(7) and tcpdump(8) manual pages
- Wireshark Q&A on ICMPv6 capture filters for MLD: https://ask.wireshark.org/question/31741/icmpv6-capture-filter-fails-for-mld-messages/
- Linux kernel `net/ipv6/ip6mr.c` (`/proc/net/ip6_mr_vif`, `/proc/net/ip6_mr_cache`)
- ip-mroute(8) manual page: https://man7.org/linux/man-pages/man8/ip-mroute.8.html

## Issues Found

1. **Incorrect tcpdump filters (all four capture commands).** The post used `ip6[40] == <type>` to match ICMPv6/MLD type bytes. Because MLD mandates an IPv6 Hop-by-Hop Options header carrying the Router Alert option (RFC 2710 §3, RFC 3810 §5), the 8-byte HbH header sits between the IPv6 header and the ICMPv6 header. That means byte 40 is the HbH Next Header field (value 58 = ICMPv6), and the actual ICMPv6 Type byte is at offset 48. The original filter would never match a conformant MLD packet. Fixed all four commands to use `'ip6[6] == 0 and ip6[40] == 58 and ip6[48] == <type>'`, which verifies the IPv6 next header is HbH, that HbH is followed by ICMPv6, and reads the type at the correct offset. Added an inline note explaining the offset so the reader understands the structure.

2. **Misleading claim about MLD Reports and "report suppression."** The original text said hosts send Reports to the specific multicast group address "to reduce report suppression needs," which inverts the actual design. Per RFC 2710, MLDv1 sends Reports to the group address AND uses report suppression. Per RFC 3810 §5.2.14 / §6 / §8, MLDv2 sends Reports to `ff02::16` (all-MLDv2-routers) AND removes report suppression entirely so each host can independently advertise its per-source filter state. Rewrote the paragraph to distinguish v1 from v2 correctly and to introduce the `ff02::16` destination address (which the post did not mention anywhere previously).

3. **Done message section** — added a one-line clarification that Done is MLDv1-only; MLDv2 conveys leaves via state-change records inside Type 143 Reports. This is consistent with RFC 3810 §5.2 and avoids implying that Type 132 is part of MLDv2.

## Review Notes
- All other technical claims verified correct: ICMPv6 type assignments (130/131/132/143), default timer values (Query Interval 125 s, Max Response 10 s, LLQI 1 s), Done destination (`ff02::2`), General Query destination (`ff02::1`), HbH Router Alert requirement, the Linux commands (`ip -6 maddr show`, `/proc/net/ip6_mr_vif`, `/proc/net/ip6_mr_cache`, `ip monitor mroute`), and the layer-2 MLD snooping description.
- The mermaid diagram uses `ff02::db8:1` as illustrative addresses; this is not a reserved documentation prefix for multicast (only `2001:db8::/32` is reserved for unicast documentation), but the addresses are syntactically valid link-scope multicast addresses and are clearly used as examples, so no change made.
- The `ss -6 -unlp | grep -E 'ff0|mcast'` command is of limited diagnostic value — multicast group memberships from `setsockopt(IPV6_JOIN_GROUP)` are not typically visible via `ss`. `ip -6 maddr show` is the authoritative tool. Not changed because the post does not claim `ss` is the primary tool, only that it can show sockets explicitly bound to multicast addresses.
- MLDv2 Query (Type 130) has a different on-the-wire format than MLDv1 Query (also Type 130); the post does not need to dig into this for an introductory guide.
