# Validation Summary: How to Configure BIND to Listen on IPv6 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- BIND 9 (`named`)
- DNS over IPv4 and IPv6
- Linux network inspection tools (`ip`, `ss`, `sysctl`)
- DNS query testing with `dig`

## Sources Consulted
- ISC BIND 9 Administrator Reference Manual, interface configuration (`listen-on` / `listen-on-v6`): https://bind9.readthedocs.io/en/v9.18.21/reference.html
- ISC knowledge base on IPv4 and IPv6 listening defaults and the BIND 9.10 change: https://kb.isc.org/docs/aa-00821
- ISC BIND 9 manual pages for `rndc`, including `reconfig`, `reload`, and `scan`: https://bind9.readthedocs.io/en/v9.21.14/manpages.html
- ISC BIND 9 manual pages for `named` and the `-4` option: https://bind9.readthedocs.io/en/v9.19.24/manpages.html
- ISC BIND 9 configuration reference for `allow-query`, `allow-query-cache`, and `allow-recursion`: https://bind9.readthedocs.io/en/v9.18.21/reference.html
- Local CLI help output checked for command syntax: `ss --help`, `ip -h`, `sysctl --help`, `dig -h`

## Issues Found
- The post stated that BIND may only listen on IPv4 by default and that `listen-on-v6` must be explicitly configured. This is not correct for current BIND releases: modern BIND listens on all IPv6 interfaces by default, and the old `listen-on-v6 { any; };` requirement applies to versions prior to 9.10. I updated the default-behavior section and the configuration intro to reflect that version distinction.
- The post said a restart was required and that reload was insufficient for `listen-on-v6` changes. ISC documents `rndc reconfig` and `rndc reload` as valid ways to reload configuration, so I replaced the restart-only guidance with `rndc reconfig` / `rndc reload`.
- The `allow-query { any; };` example was labeled "for a public resolver", which is misleading because recursive access is separately controlled by `allow-query-cache` / `allow-recursion`. I corrected the comment to describe what the directive actually does.
- The troubleshooting note claimed `listen-on-v6 port 53 { any; }` was not sufficient. The `port` form is valid BIND syntax, so I replaced that note with accurate guidance about ensuring the IPv6 address match list includes the intended addresses.

## Review Notes
- The `ip6tables` troubleshooting example is still valid on iptables-based systems, but some newer Linux distributions use `nftables` or a higher-level firewall manager instead.
- The `ss -6 -tlnp | grep named` check verifies TCP listeners. A future update could also show a UDP check, since DNS commonly uses both UDP and TCP.
