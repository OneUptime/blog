# Validation Summary: How to Configure IPv6 Autoconf on Linux

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Linux kernel IPv6 stack (`net.ipv6.conf.*` sysctls)
- SLAAC (Stateless Address Autoconfiguration) — RFC 4862
- Router Advertisements / NDP — RFC 4861
- `sysctl` and `/etc/sysctl.d/`
- `iproute2` (`ip -6 addr`, `ip -6 monitor`)
- Netplan (Ubuntu)
- `journalctl`

## Sources Consulted
- Linux kernel networking sysctl documentation: `Documentation/networking/ip-sysctl.rst` (autoconf, accept_ra, accept_ra_pinfo, accept_ra_defrtr)
- RFC 4862 — IPv6 Stateless Address Autoconfiguration
- RFC 4861 — Neighbor Discovery for IPv6
- RFC 7217 — Stable Privacy Addresses
- iproute2 `ip-address(8)` man page (filters: `dynamic`, `permanent`, `temporary`, `scope`)
- iproute2 `ip-monitor(8)` man page
- Netplan reference documentation (`accept-ra`, `dhcp6`, `addresses`, `routes`)

## Issues Found
1. **Misleading "/128 address" phrasing** in the "What is IPv6 Autoconf?" section. The original text said the kernel "generates a full /128 address by combining the prefix with an interface identifier." In IPv6 notation, `/128` denotes a single-host prefix length, but SLAAC addresses are actually configured on the interface with the announced /64 prefix length (as the example block correctly showed). Fixed by rewording to "generates a complete 128-bit address... (the address is configured on the interface with the announced /64 prefix length)" to avoid confusion between the address being 128 bits long and the prefix length being /128.

## Review Notes
- The accept_ra / autoconf interaction table is accurate, including the row for `accept_ra=2` (which overrules `forwarding=1`, per kernel docs).
- The default value claim ("1 = Enable SLAAC (default for hosts)") is correct: kernel docs note `autoconf` is enabled by default when `accept_ra_pinfo` is enabled, which is the host default.
- `ip -6 addr show dynamic` is a valid filter (iproute2 supports `dynamic`/`permanent`/`temporary` as address-flag filters).
- The Netplan keys (`dhcp6`, `accept-ra`, `addresses`, `routes` with `to`/`via`) are correct for Netplan v2 schema.
- The `grep -i 'ipv6\|slaac\|ra\|prefix'` alternation works with GNU grep (BRE with `\|` extension); fine on Linux.
- Modern Linux distros may use RFC 7217 stable-privacy interface identifiers by default rather than EUI-64; the post correctly hedges with "EUI-64 or random."
- Worth mentioning in a future revision: `addr_gen_mode` controls how the interface identifier is generated (0=EUI-64, 1=none, 2=stable privacy, 3=random) — but this is outside the autoconf-focused scope of this post.
