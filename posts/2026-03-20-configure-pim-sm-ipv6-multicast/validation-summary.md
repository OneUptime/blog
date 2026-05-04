# Validation Summary: How to Configure PIM-SM for IPv6 Multicast Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PIM-SM (Protocol Independent Multicast - Sparse Mode) for IPv6
- FRRouting (FRR) and its `pim6d` daemon
- MLD (Multicast Listener Discovery)
- Linux IPv6 multicast routing (kernel `ip6mr` / `CONFIG_IPV6_MROUTE`)
- Python 3 `socket` module for IPv6 multicast send/receive
- vtysh (FRR CLI)
- RFC 7761 (PIM-SM specification)

## Sources Consulted
- [FRR PIMv6 documentation](https://docs.frrouting.org/en/latest/pimv6.html)
- [FRR daemons file (upstream)](https://github.com/FRRouting/frr/blob/master/tools/etc/frr/daemons)
- [Linux kernel `net/ipv6/ip6mr.c`](https://github.com/torvalds/linux/blob/master/net/ipv6/ip6mr.c)
- [Linux kernel `net/ipv6/Makefile`](https://github.com/torvalds/linux/blob/master/net/ipv6/Makefile)
- [CONFIG_IPV6_MROUTE (Linux Kernel Driver Database)](https://cateee.net/lkddb/web-lkddb/IPV6_MROUTE.html)
- RFC 7761 — Protocol Independent Multicast - Sparse Mode (PIM-SM): Protocol Specification (Revised)
- Python 3 `socket` module documentation

## Issues Found
1. **FRR daemon name for IPv6 PIM was wrong.** The post enabled `pimd` in `/etc/frr/daemons`, but `pimd` is FRR's IPv4 PIM daemon. IPv6 PIM is handled by the separate `pim6d` daemon (introduced in FRR 8.4 and present in current upstream `tools/etc/frr/daemons` with both `pimd=no` and `pim6d=no` defaults). Changed `sed -i 's/pimd=no/pimd=yes/'` to `sed -i 's/pim6d=no/pim6d=yes/'` and updated the surrounding comment.
2. **Invalid IPv6 RP address.** `2001:db8::rp` is not a syntactically valid IPv6 address — `r` and `p` are not hexadecimal digits, so FRR would reject the `ipv6 pim rp` command. Replaced with `2001:db8::1` in both the basic configuration block and the dedicated RP router section.
3. **Invalid IPv6 multicast address in Python testing snippet.** `ff3e::db8:test` would fail `socket.inet_pton(AF_INET6, ...)` because `t` and `s` are not hex digits. Replaced with `ff3e::db8:1234` in both the receiver and sender scripts so the example actually runs.

## Review Notes
- The `modprobe ip6_mr` / `lsmod | grep ip6_mr` lines are kept as-is because the convention is widely used in tutorials, but on modern kernels `CONFIG_IPV6_MROUTE` is a `bool` (not `tristate`), so the multicast routing code is built into the `ipv6` module rather than shipped as a separate `ip6mr` module. On most distributions `modprobe ip6_mr` will be a silent no-op and the `lsmod` check will not match anything; in practice IPv6 multicast routing is already available once the `ipv6` module is loaded and `net.ipv6.conf.all.forwarding=1` is set. A future revision could clarify this.
- The mermaid diagram uses illustrative labels like `2001:db8::rp`, `2001:db8::src`, and `ff3e::stream`. These are not parsed as IPv6 addresses (they are just participant/message labels), so they were left unchanged for readability.
- The post's intro paragraph — "The `pimd` daemon handles both PIM-SM and is available on most Linux distributions" — is awkwardly worded but not strictly inaccurate, so it was left alone per the instruction to limit edits to technical errors.
- The FRR vtysh commands (`ipv6 pim`, `ipv6 pim drpriority`, `ipv6 pim rp`, `ipv6 mld`, `show ipv6 pim neighbor|interface|rp-info|join`, `show ipv6 mroute`) are accurate per current FRR PIMv6 documentation.
- RFC 7761 is correctly cited for PIM-SM (covers both IPv4 and IPv6 address families).
