# Validation Summary: How to Understand Router Discovery in NDP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- Router Solicitation (RS) / Router Advertisement (RA) — ICMPv6 types 133/134
- RFC 4861 (Neighbor Discovery for IPv6)
- RFC 4191 (Default Router Preferences)
- radvd (Router Advertisement Daemon)
- iproute2 (`ip -6 route`)
- tcpdump

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6), §4.2 (RA format), §6.2.1 (router default values), §6.3.4 (Default Router List processing)
- RFC 4191 — Default Router Preferences and More-Specific Routes, §2.1 (Prf encoding)
- RFC 4291 — IP Version 6 Addressing Architecture (multicast scope/groups: ff02::1, ff02::2)
- radvd(8) and radvd.conf(5) man pages
- iproute2 `ip-route(8)` man page
- tcpdump `pcap-filter(7)` (BPF offset semantics for `ip6[]`)

## Issues Found
- **Inconsistent byte offset in monitoring section**: The comment line read `byte at offset 50 of IPv6+ICMPv6`, but the detailed offset math immediately below correctly derives offset 46 (40-byte IPv6 header + ICMPv6 Type/Code/Checksum/CurHopLimit/Flags = 46). Updated the line to `bytes at offset 46-47 of IPv6+ICMPv6` for internal consistency and accuracy per RFC 4861 §4.2.

## Review Notes
- All other technical claims verified as correct: multicast group addresses (ff02::1, ff02::2), MaxRtrAdvInterval default 600s, RFC 4191 Prf encoding (High=01, Medium=00, Low=11), radvd directives and validity ranges (MinRtrAdvInterval ≥ 3 and ≤ 0.75 × MaxRtrAdvInterval; AdvDefaultLifetime default = 3 × MaxRtrAdvInterval), Linux `proto ra` route attribution, and the tcpdump `ip6[40] == 134` filter for RA messages.
- The example route metrics (100/200) in the `ip -6 route show default` output are illustrative; real Linux kernels typically install RA-derived routes with metric 1024 modulated by RFC 4191 preference. The relative ordering (high preference → lower metric → preferred) is accurate.
- The tcpdump filter `ip6[40] == 134` assumes no IPv6 extension headers precede ICMPv6 — true for typical RA traffic but worth noting if extension headers appear in atypical environments.
