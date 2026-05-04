# Validation Summary: How to Configure Recursive DNS Resolvers for IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- BIND 9 (named) recursive resolver
- Unbound recursive resolver
- IPv6 DNS resolution (AAAA records)
- DNSSEC validation
- Root hints (named.root)
- DNS query forwarding
- `dig`, `rndc`, `unbound-control` CLI tools

## Sources Consulted
- BIND 9 Administrator Reference Manual (ARM): https://bind9.readthedocs.io/en/latest/reference.html — verified `listen-on-v6`, `allow-query`, `allow-recursion`, `forwarders`, `dnssec-validation`, `recursion`, `forward only`/`forward first` syntax
- Unbound documentation (`unbound.conf(5)`): https://nlnetlabs.nl/documentation/unbound/unbound.conf/ — verified `interface`, `access-control`, `do-ip6`, `prefer-ip6`, `auto-trust-anchor-file`, `module-config`, `prefetch`, `prefetch-key`, `forward-zone` syntax and defaults
- IANA / InterNIC root hints file: https://www.internic.net/domain/named.root — confirmed canonical source URL and that the file contains AAAA records for the root servers
- Google Public DNS documentation: https://developers.google.com/speed/public-dns/docs/using — confirmed IPv6 addresses 2001:4860:4860::8888 and 2001:4860:4860::8844
- RFC 4193 (Unique Local IPv6 Unicast Addresses) — fc00::/7 is the full ULA range; fd00::/8 is the locally-assigned half, which is what is in actual use
- RFC 6724 (Default Address Selection for IPv6) — referenced for source/destination preference behavior

## Issues Found
No technical issues found.

All configuration directives, command-line invocations, IPv6 addresses, and URLs were verified against official documentation:
- BIND `options` block syntax (`listen-on-v6 { any; }`, `allow-query`, `allow-recursion`, `dnssec-validation auto`, `recursion yes`, `forwarders { ... }; forward only;`) is correct.
- The `zone "." { type hint; file "/etc/named.root"; };` declaration is the standard way to load root hints in BIND.
- Unbound directives (`interface: ::0`, `do-ip6: yes`, `prefer-ip6: no` is in fact the default, `module-config: "validator iterator"`, `auto-trust-anchor-file: "/var/lib/unbound/root.key"`) match the official `unbound.conf(5)` reference and Debian/Ubuntu defaults.
- Google Public DNS IPv6 addresses (2001:4860:4860::8888 and 2001:4860:4860::8844) are correct.
- `dig AAAA google.com @::1`, `rndc querylog on`, `rndc stats`, `unbound-control verbosity`, and `unbound-control stats` are all valid invocations.

## Review Notes
- `fd00::/8` is the locally-assigned half of the ULA space; the full ULA range per RFC 4193 is `fc00::/7`. Using `fd00::/8` is the practical convention since the `fc00::/8` half is reserved/unassigned, so this is accurate as written.
- `interface: ::0` and `access-control: ::0/0 refuse` are valid; the more idiomatic shorthand is `::` and `::/0`, but Unbound parses both forms identically.
- The statement "BIND uses preference based on RFC 6724 by default" is somewhat hand-wavy — RFC 6724 governs default address selection (mostly relevant to source-address selection and getaddrinfo). BIND's recursive logic for choosing IPv4 vs IPv6 transport upstream is internal and influenced by reachability/EDNS responsiveness; nothing actionable is wrong, just imprecise.
- The path `/var/named/data/named_stats.txt` is the typical RHEL/CentOS default; Debian/Ubuntu often write stats to `/var/cache/bind/named.stats`. Readers on non-RHEL distros may need to adjust.
- The path `/var/log/named/queries.log` assumes a query-logging channel has been configured to that file; the default BIND build does not write here unless `logging { channel ... }` is set up. This is a common convention but not universal.
- `module-config: "validator iterator"` is the Unbound default and is shown for clarity (commented as relevant for DNS64); harmless to include explicitly.
