# Validation Summary: How to Clear the IPv6 Neighbor Cache on Linux

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux IPv6 networking
- Neighbor Discovery Protocol (NDP, RFC 4861)
- iproute2 `ip -6 neigh` subcommand
- iproute2 `ip -6 route flush cache` (PMTU cache)
- `ping6` / iputils `ping`
- `tcpdump` BPF filters for ICMPv6
- Linux NUD (Neighbor Unreachability Detection) state machine

## Sources Consulted
- iproute2 `ip-neighbour(8)` man page (https://man7.org/linux/man-pages/man8/ip-neighbour.8.html)
- iproute2 source `ip/ipneigh.c` (https://github.com/iproute2/iproute2/blob/main/ip/ipneigh.c) — verified default NUD state for `ip neigh add` is `NUD_PERMANENT`
- RFC 4861 — Neighbor Discovery for IPv6 (https://datatracker.ietf.org/doc/html/rfc4861), specifically §4.3 (NS type 135) and §10 (REACHABLE_TIME default 30,000 ms)
- Linux kernel `Documentation/networking/ip-sysctl.rst` for `base_reachable_time_ms` default
- Linux kernel `Documentation/networking/ipv6.rst` and `net/ipv6/route.c` for PMTU/route cache behavior
- iputils `ping(8)` man page — confirms `ping6` is a symlink to `ping` since iputils s20150815

## Issues Found
No technical issues found. All commands, syntax, NDP semantics, NUD-state references, the tcpdump BPF filter (`ip6[40] == 135` for Neighbor Solicitation, valid when there are no IPv6 extension headers), and the claim that `ip neigh flush` preserves PERMANENT/NOARP entries by default are accurate.

## Review Notes
- The post simplifies "wait for the REACHABLE timer to expire (30s)" — strictly speaking, the kernel randomizes the actual reachable time between 0.5× and 1.5× `base_reachable_time_ms` (i.e., 15–45 s), and after REACHABLE expires the entry transitions to STALE rather than being deleted; full re-resolution after a MAC change still requires the DELAY → PROBE phases. The 30 s figure is correct as the configured base, so this is an acceptable simplification rather than an error.
- `ping6` is deprecated on most modern distributions and exists only as a symlink to `ping`. The examples still work, but `ping -6` would be the more forward-compatible form. Not changed since the post still functions correctly as written.
- The `ip6[40] == 135` filter assumes no IPv6 extension headers between the fixed IPv6 header and ICMPv6, which is normally the case for NDP packets. The idiomatic form `icmp6[icmp6type] == icmp6-neighborsolicit` would be more robust, but the given filter is correct in practice for NDP traffic.
