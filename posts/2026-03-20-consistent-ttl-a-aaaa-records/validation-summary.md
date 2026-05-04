# Validation Summary: How to Understand Consistent TTL Values for A and AAAA Records

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- DNS (Domain Name System)
- A records (IPv4)
- AAAA records (IPv6)
- TTL (Time To Live)
- BIND (specifically the `rndc` control utility and zone file format)
- `dig` DNS query utility
- Shell scripting (Bash) for auditing

## Sources Consulted
- RFC 1035 — Domain Names - Implementation and Specification (TTL semantics, zone file format) — https://www.rfc-editor.org/rfc/rfc1035
- RFC 2181 — Clarifications to the DNS Specification (TTL handling) — https://www.rfc-editor.org/rfc/rfc2181
- RFC 2308 — Negative Caching of DNS Queries (`$TTL` directive, SOA minimum field) — https://www.rfc-editor.org/rfc/rfc2308
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`) — https://www.rfc-editor.org/rfc/rfc3849
- RFC 5737 — IPv4 Address Blocks Reserved for Documentation (`203.0.113.0/24` TEST-NET-3) — https://www.rfc-editor.org/rfc/rfc5737
- ISC BIND 9 Administrator Reference Manual (`rndc reload`, `rndc stats`, `statistics-file`) — https://bind9.readthedocs.io/
- `dig` man page (BIND 9) — verifying `+noall +answer`, `AXFR` query type, output formatting

## Issues Found
No technical issues found.

Verified specifically:
- The zone-file record format `name TTL IN TYPE rdata` is correct.
- Documentation address ranges (`203.0.113.0/24` and `2001:db8::/32`) are used correctly.
- The SOA tuple `(serial refresh retry expire minimum)` ordering is correct, and `2026032001` is a valid date-style serial.
- `dig ... +noall +answer | awk '{print $2}'` correctly extracts the TTL column from the answer section.
- `dig AXFR <zone>` is the correct way to request a zone transfer.
- `rndc reload <zone>` and `rndc stats` are valid commands; the `/var/named/data/named_stats.txt` default matches the RHEL/CentOS BIND package layout (configurable via `statistics-file` in `named.conf`).
- The "lower TTL well before the change, wait at least the old TTL, then make the change" workflow is the standard, correct DNS-migration practice.

## Review Notes
- The default BIND `statistics-file` path varies by distribution (`/var/named/data/named_stats.txt` on RHEL-family, often `/var/cache/bind/named.stats` on Debian/Ubuntu). The post uses the RHEL-family default; readers on other distros may need to consult `named.conf` or override the path. Not an error, just a deployment-specific detail.
- The audit script iterates every unique name from an `AXFR` response and only reports when both A and AAAA TTLs are non-empty; it works as documented, though it issues two queries per name in the zone (including names that have neither record). For very large zones, parsing the `AXFR` directly would be more efficient, but the current approach is correct.
- AXFR requires the querying host to be permitted by the authoritative server's `allow-transfer` ACL; the script implicitly assumes this. Worth noting for readers running it from elsewhere, but not a technical defect.
