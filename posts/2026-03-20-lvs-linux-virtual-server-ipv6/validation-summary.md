# Validation Summary: How to Configure LVS (Linux Virtual Server) for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux Virtual Server (LVS)
- IPVS / `ipvsadm`
- IPv6
- Linux networking / `iproute2`
- keepalived

## Sources Consulted
- `ipvsadm(8)` Debian testing man page: https://manpages.debian.org/testing/ipvsadm/ipvsadm.8.en.html
- Linux kernel source `net/netfilter/ipvs/ip_vs_conn.c`: https://raw.githubusercontent.com/torvalds/linux/master/net/netfilter/ipvs/ip_vs_conn.c
- Linux kernel source `net/netfilter/ipvs/ip_vs_ctl.c`: https://raw.githubusercontent.com/torvalds/linux/master/net/netfilter/ipvs/ip_vs_ctl.c
- `ip-neighbour(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-neighbour.8.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/info/rfc4861
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/info/rfc3849
- Linux Virtual Server Knowledge Base, IPv6 load balancing: https://kb.linuxvirtualserver.org/wiki/IPv6_load_balancing

## Issues Found
- The examples used placeholders such as `2001:db8::vip` and `2001:db8::server1`, which are not syntactically valid IPv6 literals. I replaced them with valid documentation-prefix addresses under `2001:db8::/32`.
- The post used `ipvsadm -6` with normal IPv6 `-t` and `-u` services. Current `ipvsadm` documentation reserves `-6` for IPv6 `fwmark` services, so I removed those flags from the examples.
- The DR-mode section referred to an ARP conflict in an IPv6 workflow and used `ip -6 neigh add proxy ... dev lo` as if it suppressed NDP. The `ip neigh` documentation describes `proxy` as creating a proxy neighbor entry, so I replaced that guidance with correct loopback/VIP handling notes.
- The monitoring section referenced `/proc/net/ip6_vs_conn`, which is not a current IPVS procfs interface. The kernel source exposes `/proc/net/ip_vs_conn`, so I corrected the path and clarified that it covers IPVS connections generally.
- The save/restore examples used shell redirection outside the `sudo` context, which would fail for root-owned files in common setups. I changed them so the redirection runs as root.
- The prerequisites included `ip6table_filter`, which is unrelated to the documented IPVS configuration steps, so I removed it.

## Review Notes
- The TUN section now makes it explicit that the shown commands cover the load balancer side of IPVS rule creation; real servers still need compatible tunnel decapsulation and local VIP handling.
