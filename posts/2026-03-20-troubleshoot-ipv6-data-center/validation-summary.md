# Validation Summary: How to Troubleshoot IPv6 in Data Center Environments

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- IPv6 (link-local, global addressing, scope IDs)
- NDP (Neighbor Discovery Protocol, RFC 4861)
- ICMPv6 (Router Advertisement, Neighbor Solicitation/Advertisement)
- iproute2 (`ip -6 addr`, `ip -6 neigh`, `ip -6 route`)
- `ping6` / `traceroute6` / `mtr`
- `radvd` / `radvdump`
- `tcpdump` with BPF filters
- FRRouting (`vtysh`) BGP for IPv6
- `ip6tables` and `nftables`

## Sources Consulted
- RFC 4861 - Neighbor Discovery for IPv6 (NDP states, ICMPv6 types 133-137)
- RFC 4443 - ICMPv6 specification
- IANA ICMPv6 Type Numbers registry
- iproute2 man pages (`ip-address(8)`, `ip-neighbour(8)`, `ip-route(8)`)
- FRRouting user guide - BGP IPv6 commands (https://docs.frrouting.org/)
- `radvd` / `radvdump` man pages
- `tcpdump` / pcap filter documentation (IPv6 header offset for ICMPv6 Type)
- Google Public DNS documentation (IPv6 address 2001:4860:4860::8888)

## Issues Found
No technical issues found.

Verified specifics:
- Link-local prefix `fe80::/10` and scope notation `fe80::1%eth0` are correct.
- NDP cache states (REACHABLE, STALE, FAILED) match RFC 4861 §7.3.2.
- ICMPv6 type 134 = Router Advertisement; types 135/136 = Neighbor Solicitation/Advertisement (IANA/RFC 4861).
- `tcpdump` filter `icmp6 and ip6[40] == 134` is correct — the IPv6 header is a fixed 40 bytes, so offset 40 is the first byte of the ICMPv6 header (the Type field), assuming no extension headers.
- FRRouting `vtysh` commands (`show bgp ipv6 unicast summary|neighbors|<prefix>`) are current and valid.
- Google Public DNS IPv6 (2001:4860:4860::8888) is correct.
- Documentation prefix `2001:db8::/32` is used correctly for examples (RFC 3849).

## Review Notes
- `ping6` and `traceroute6` still exist on most distros but are effectively aliases or shims for `ping -6` / `traceroute -6` on modern systems (e.g., iputils has deprecated the standalone `ping6` binary but kept a symlink). Either form works today; the post's usage is fine.
- The `tcpdump` BPF filter `ip6[40] == 134` will miss RAs if IPv6 extension headers are present between the IPv6 header and ICMPv6 — in practice RAs are sent without extension headers, so this is not a real concern for router-advertisement capture.
- The `grep -v "0     0"` pattern for filtering zero-counter `ip6tables` lines relies on a specific whitespace pattern from iptables' `-v` output; it works for typical output but is fragile. Acceptable as a quick troubleshooting one-liner.
