# Validation Summary: How to Configure Split-Horizon DNS for Internal and External Resolution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BIND 9 (named, views, ACLs, zone files)
- Unbound (local-zone, local-data)
- DNS (split-horizon / split-brain DNS, SOA records, A records)
- Linux system administration (systemctl, /etc/hosts, getent)
- DHCP option 6 (DNS server distribution)
- dig, rndc, named-checkconf, named-checkzone, unbound-checkconf, unbound-control

## Sources Consulted
- BIND 9 ARM (Reference Manual): https://bind9.readthedocs.io/en/latest/reference.html
- Unbound configuration manual: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- Unbound example.conf.in (official upstream): https://github.com/NLnetLabs/unbound/blob/master/doc/example.conf.in
- NLnet Labs Unbound docs: https://nlnetlabs.nl/documentation/unbound/unbound.conf/

## Issues Found
1. **Unbound configuration placement (Method 2)** — The original post appended `local-zone` and `local-data` directives directly to `/etc/unbound/unbound.conf`. These directives are part of the `server:` clause in Unbound and must live inside it; appending raw to the main file fails on common distros where `unbound.conf` is just an `include:` line, or places the directives outside any `server:` block. Replaced with a drop-in file at `/etc/unbound/unbound.conf.d/split-horizon.conf` containing an explicit `server:` clause, and added an `unbound-checkconf` step before reloading.

2. **BIND debug logging category** — The "enable view logging" example used `category resolver`, which logs the recursive resolver subsystem (lookups the server itself performs upstream), not which view matched a client query. Switched to `category queries` and added `rndc querylog on` so the example actually shows per-query view matching, which is what the comment promised.

## Review Notes
- The BIND view configuration is syntactically correct: ACLs are matched in declaration order, the `internal` ACL covers RFC 1918 + loopback, and `external` falling back to `any` is a standard catch-all pattern.
- Zone file syntax (TTL, SOA tuple of serial/refresh/retry/expire/minimum, NS, A records) is correct, and the SOA serial follows the conventional YYYYMMDDnn format.
- `systemctl restart bind9` is the correct unit name on Debian/Ubuntu. On RHEL/Fedora the unit is `named` — not noted in the post but a reasonable omission for a Linux-general guide.
- The `dhcp-option=6,10.20.0.53` example is dnsmasq syntax. ISC DHCP would use `option domain-name-servers 10.20.0.53;`. The line is commented and illustrative, so left as-is.
- Minor stylistic note (not changed): the "internal hosts can have shorter names" benefit is more accurately a property of search-domain configuration than split-horizon DNS itself, though split-horizon does enable serving internal-only zones with shorter names.
