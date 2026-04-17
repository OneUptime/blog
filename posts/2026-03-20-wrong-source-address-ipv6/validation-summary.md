# Validation Summary: How to Fix Wrong Source IPv6 Address in Connections

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- IPv6 source address selection (RFC 6724)
- Linux kernel IPv6 stack (`net.ipv6.conf.*`, SLAAC, privacy extensions)
- iproute2 tooling (`ip -6 addr`, `ip -6 route`, `ip -6 rule`, `ip addrlabel`)
- ip6tables (mangle table, packet marking / policy routing)
- Python `socket` module (AF_INET6 connect/bind, getsockname)
- `curl --interface` flag
- `tcpdump`, `ss`

## Sources Consulted
- RFC 6724 "Default Address Selection for Internet Protocol Version 6 (IPv6)" — https://datatracker.ietf.org/doc/html/rfc6724 (Sections 2.1 policy table, 5 source address selection rules)
- Linux kernel source `net/ipv6/addrlabel.c` (default label table)
- iproute2 man pages: `ip-address(8)`, `ip-route(8)`, `ip-rule(8)`, `ip-addrlabel(8)`
- `ip addrlabel list` output on a current Linux host (verified locally)
- Linux `sysctl` documentation for `net.ipv6.conf.*.use_tempaddr` and `autoconf`
- Python 3 `socket` documentation — https://docs.python.org/3/library/socket.html (AF_INET6 address 4-tuple)
- curl man page for `--interface` (accepts name / IP / hostname)

## Issues Found
- **Fix 4 (Policy Table Label Override)**: The post claimed "ULA source (label 13)" and instructed the reader to `ip addrlabel add prefix 2001:db8:peer::/48 label 13`. Label 13 is what RFC 6724 Section 2.1 specifies for `fc00::/7`, but Linux's in-kernel default policy table assigns label **5** to `fc00::/7` (verified against current kernel source and `ip addrlabel list`). Following the original instruction on a Linux host would produce a label mismatch (destination label 13, ULA source label 5) and the fix would not work. Updated the example to use label 5 and added a brief note explaining the Linux/RFC divergence, pointing the reader at `ip addrlabel list` to verify locally.

## Review Notes
- Rule numbers cited (Rule 3 deprecated, Rule 5 outgoing interface, Rule 6 matching label, Rule 7 temporary/public preference, Rule 8 longest matching prefix) all match RFC 6724 Section 5.
- The Python 4-tuple bind `sock.bind((host, 0, 0, 0))` is the correct form for `AF_INET6` (host, port, flowinfo, scope_id).
- `ip -6 addr flush dev eth0 dynamic scope global` removes all dynamic (SLAAC-derived) addresses, not only temporary ones. Combined with the preceding `use_tempaddr=0` this is the intended effect, but readers who only want to clear temporary addresses (keeping the stable SLAAC address) should use the `temporary` flag instead of `dynamic`. Left unchanged since the narrative flow was coherent.
- `curl --interface` accepts either an interface name or an IP/hostname, so both examples (`--interface eth0` and `--interface 2001:db8:1::10`) are valid.
- The post mixes "privacy extensions" terminology for temporary addresses — this is accurate historically (RFC 4941 / RFC 8981) and consistent with `use_tempaddr` semantics.
