# Validation Summary: How to Configure TCP MSS Clamping to Avoid Fragmentation

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- TCP / Maximum Segment Size (MSS)
- Path MTU Discovery (PMTUD)
- iptables (xt_TCPMSS target, mangle table)
- nftables (tcp option maxseg)
- WireGuard, OpenVPN, GRE, VXLAN, IPsec/xfrm tunnel interfaces
- tcpdump (BPF filtering for SYN packets)
- iptables-persistent (Debian/Ubuntu)
- systemd unit files

## Sources Consulted
- iptables-extensions(8) man page — TCPMSS target documentation
- Linux kernel source `net/netfilter/xt_TCPMSS.c` — hook restrictions for `--clamp-mss-to-pmtu`
- nftables wiki — Setting MSS / `tcp option maxseg size set rt mtu`
- nftables documentation on standard named chain priorities (raw, mangle, dstnat, filter, security, srcnat)
- RFC 879 — The TCP Maximum Segment Size and Related Topics
- RFC 1191 — Path MTU Discovery
- WireGuard documentation — default MTU 1420
- pcap-filter(7) — `tcp[tcpflags] & tcp-syn != 0` syntax

## Issues Found
1. **`--clamp-mss-to-pmtu` used in INPUT chain (incorrect).** The original Basic MSS Clamping section included an example applying `TCPMSS --clamp-mss-to-pmtu` to the INPUT chain. Per the kernel `xt_TCPMSS` checkentry code, path-MTU clamping is only allowed in FORWARD, OUTPUT, and POSTROUTING hooks; loading such a rule errors with "path-MTU clamping only supported in FORWARD, OUTPUT and POSTROUTING hooks". The example was also redundant because the OUTPUT chain rule already covers locally-generated SYN-ACKs from this host acting as a server. I removed the INPUT example, expanded the OUTPUT comment to reflect that it covers both client SYN and server SYN-ACK packets, and added a brief note documenting the chain restriction (with the suggestion to use `--set-mss` if mangling in PREROUTING/INPUT is required).

## Review Notes
- The MSS arithmetic (MTU − 40 for IPv4) and the canonical MTU values for WireGuard (1420), VXLAN (1450), and GRE (1476) are correct.
- The `--tcp-flags SYN,RST SYN` matcher correctly selects pure SYN packets (SYN set, RST cleared); this is the standard pattern from the iptables-extensions docs.
- The "Apply to both directions" duplicate FORWARD rule is technically harmless (mangle table; same rule appended twice) but adds no behavior beyond the first rule, since FORWARD already sees both directions of traversing flows. Left in place to avoid restructuring.
- The nftables snippet is correct: `inet` family, named priority `mangle` (= -150), `tcp option maxseg size set rt mtu` is the documented expression for clamping to the route's MTU.
- The tcpdump BPF filter `tcp[tcpflags] & tcp-syn != 0` matches any segment with the SYN flag set (including SYN-ACK), which is the desired behavior here.
- The `speedtest.example.com` URL is an illustrative placeholder (RFC 2606 reserved domain) — appropriate for documentation.
- IPv6 caveat (not in scope of the post): for IPv6 paths the deduction is 60 bytes (40 IPv6 header + 20 TCP), and the kernel uses `-60` automatically with `--clamp-mss-to-pmtu` for IPv6.
