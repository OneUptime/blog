# Validation Summary: How to Understand IPv6 Multicast Forwarding Tables

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 multicast
- PIM-SM / PIMv6
- MLD
- Linux `iproute2` multicast routing
- FRR `pim6d` / `vtysh`
- Cisco IOS IPv6 multicast commands
- Juniper Junos multicast route inspection

## Sources Consulted
- FRR PIMv6 documentation: https://docs.frrouting.org/en/latest/pimv6.html
- FRR PIM documentation: https://docs.frrouting.org/en/latest/pim.html
- Linux `ip-mroute(8)` manual page: https://man7.org/linux/man-pages/man8/ip-mroute.8.html
- RFC 7761, Protocol Independent Multicast - Sparse Mode (PIM-SM): Protocol Specification (Revised): https://www.rfc-editor.org/rfc/rfc7761.html
- RFC 4601, Protocol Independent Multicast - Sparse Mode (PIM-SM): Protocol Specification (Revised): https://www.rfc-editor.org/rfc/rfc4601.html
- Cisco IOS IPv6 command reference for `show ipv6 mroute`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-s3.html
- Juniper `show multicast route` command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-multicast-route.html
- Local verification with `ip -6 mroute help`, `man ip-mroute`, and `/proc/net/ip6_mr_cache`

## Issues Found
- The post conflated the multicast forwarding table with the MRIB. I corrected this to distinguish MFIB/mroute forwarding state from the MRIB used for RPF lookups, which matches RFC 4601 terminology.
- Several example IPv6 addresses were not valid literals, including `ff3e::stream`, `2001:db8::source`, `2001:db8::src`, `2001:db8::nexthop`, `2001:db8::rp`, and `2001:db8::upstream`. I replaced them with syntactically valid example addresses.
- The FRR command `show ipv6 pim topology` is not documented in current FRR PIMv6 CLI references. I replaced it with `show ipv6 pim state`, which is the documented detailed state command.
- The FRR command `show ipv6 pim rpf 2001:db8::source` was not valid as written. I replaced it with the documented `show ipv6 rpf 2001:db8::10` for MRIB lookup and `show ipv6 pim nexthop-lookup 2001:db8::10 ff1e::1234` for PIM's RPF decision on a specific `(S,G)`.
- The Linux examples implied wildcard `(*,G)` forwarding cache entries in `ip -6 mroute show`. I changed the Linux example to a source-specific `(S,G)` entry and corrected the `/proc/net/ip6_mr_cache` column labels to match current Linux output.
- The cache-clearing advice `ip6tables -F OUTPUT` was incorrect because it flushes firewall rules, not multicast forwarding cache state. I replaced it with a note that `ip mroute` is display-only and that the mrouting daemon or FRR must clear or recreate the cache entries.
- The state-machine label said `(*,G)` is pruned after source-tree switchover. I corrected that label to `(S,G,rpt) prune toward RP`, which is the PIM-SM mechanism described in RFC 7761.

## Review Notes
- Linux kernel multicast cache inspection and FRR `show ipv6 mroute` focus on installed source-specific kernel mroutes, while shared-tree `(*,G)` state is often better inspected through vendor or daemon control-plane commands such as FRR `show ipv6 pim state`.
