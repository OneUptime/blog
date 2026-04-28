# Validation Summary: How to Use rdisc6 for Router Discovery Diagnostics

## Status
validated

## Post Type
Tutorial / Diagnostic Guide

## Technologies Covered
- rdisc6 (from the ndisc6 package)
- ICMPv6 Router Solicitation (RS) and Router Advertisement (RA)
- IPv6 Neighbor Discovery Protocol (NDP)
- SLAAC, M/O flags, RDNSS option
- radvd (radvd.conf parameters: `AdvDefaultLifetime`, `AdvAutonomous`, `MaxRtrAdvInterval`)
- tcpdump (BPF filter `ip6[40] == 134` for matching RA packets)

## Sources Consulted
- ndisc6 / rdisc6 manpage and source code (https://www.remlab.net/ndisc6/)
- Debian/Ubuntu rdisc6(8) manpage
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6)
- RFC 4862 — IPv6 Stateless Address Autoconfiguration
- RFC 4191 — Default Router Preferences and More-Specific Routes
- RFC 8106 — IPv6 Router Advertisement Options for DNS Configuration (RDNSS/DNSSL)
- RFC 4389 — Neighbor Discovery Proxies (ND Proxy)
- radvd.conf(5) manpage

## Issues Found

1. **`-q` (quiet mode) description was inaccurate.** The post originally said `-q` shows "only RA source address". Per the rdisc6 manpage, `-q` actually displays only the advertised IPv6 prefixes (and nothing on failure), useful for shell scripts. Updated the comment to reflect the correct behavior.

2. **Output label inconsistency.** The example output line `Autonomous address conf:` was missing the trailing period that rdisc6 actually prints. Other labels in the same block (e.g., `Stateful address conf.`, `Stateful other conf.`) did include the period. Fixed to `Autonomous address conf.:` to match the real output and the rest of the example.

## Review Notes
- All other technical claims verified accurate: ff02::2 as the all-routers multicast destination, `-r N` retry behavior, ICMPv6 type 134 for RA at `ip6[40]`, RFC 8106 for RDNSS, and radvd.conf parameter names.
- The tcpdump filter `ip6[40] == 134` works for unencapsulated IPv6 packets without extension headers — which is the common case for RAs but worth being aware of in unusual deployments.
- The example output mixes RA header fields and option fields (Source Link-Layer Address, Prefix Information, MTU) in the order rdisc6 actually emits them — this is correct.
